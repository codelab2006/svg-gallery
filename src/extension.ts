import * as vscode from "vscode";
import { parse, extname, join, basename } from "path";
import { readdirSync, Dirent, statSync, Stats } from "fs";

import Gallery from "./Gallery";
import { EXT_SET, EXCLUDE, VIEW_TYPE, TEXT_MULTIPLE_FILES } from "./constant";

import GALLERY_TPL from "./templates/gallery.ejs";

const { v4: uuidv4 } = require("uuid");

abstract class AbstractGallery {
  constructor(
    protected context: vscode.ExtensionContext,
    protected webviewPanels: Map<string, vscode.WebviewPanel>,
    private key: string
  ) {}

  build(): void {
    let webViewPanel: vscode.WebviewPanel | undefined = this.webviewPanels.get(
      this.key
    );

    if (webViewPanel) {
      webViewPanel.reveal();
    } else {
      webViewPanel = this.createWebviewPanel(
        `${this.generateWebviewPanelTitle()} - SVG Gallery`
      );
      this.context.subscriptions.push(
        webViewPanel.onDidChangeViewState(
          (e: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
            if (e.webviewPanel.visible) {
              this.refreshWebview(e.webviewPanel);
            }
          }
        )
      );
      this.context.subscriptions.push(
        webViewPanel.onDidDispose(() => this.webviewPanels.delete(this.key))
      );
      this.context.subscriptions.push(
        webViewPanel.webview.onDidReceiveMessage(
          ({ command, args }: { command: string; args: any }) => {
            switch (command) {
              case "OPEN_FILE":
                const { path: filePath }: { path: string } = args;
                if (filePath) {
                  vscode.window
                    .showTextDocument(vscode.Uri.file(filePath))
                    .then(
                      () => {},
                      () => {
                        vscode.window.showErrorMessage(
                          "Oops! Unable to open the file."
                        );
                        if (webViewPanel) {
                          this.refreshWebview(webViewPanel);
                        }
                      }
                    );
                }
                return;
              case "REFRESH":
                if (webViewPanel) {
                  this.refreshWebview(webViewPanel);
                  vscode.window.setStatusBarMessage("Refreshing...", 1000);
                }
                return;
            }
          }
        )
      );
      this.webviewPanels.set(this.key, webViewPanel);
    }
    this.refreshWebview(webViewPanel);
  }

  private createWebviewPanel(title: string): vscode.WebviewPanel {
    return vscode.window.createWebviewPanel(
      VIEW_TYPE,
      title,
      vscode.ViewColumn.One,
      { enableScripts: true, enableFindWidget: true }
    );
  }

  private refreshWebview(webviewPanel: vscode.WebviewPanel): void {
    const webview = webviewPanel.webview;
    const gallery: Gallery = new Gallery(
      GALLERY_TPL,
      webview,
      this.generateGalleryData()
    );
    webview.html = gallery.generateHtml();
  }

  protected abstract generateWebviewPanelTitle(): string;
  protected abstract generateGalleryData(): Map<string, string[]>;
}

class FileGallery extends AbstractGallery {
  constructor(
    context: vscode.ExtensionContext,
    webviewPanels: Map<string, vscode.WebviewPanel>,
    private v: any[]
  ) {
    super(context, webviewPanels, v.length === 1 ? v[0].fsPath : uuidv4());
  }

  protected generateWebviewPanelTitle(): string {
    return this.v.length === 1
      ? parse(this.v[0].fsPath).base
      : TEXT_MULTIPLE_FILES;
  }

  protected generateGalleryData(): Map<string, string[]> {
    const map: Map<string, string[]> = new Map();
    this.v.forEach((e: any) => {
      const dir: string = parse(e.fsPath).dir;
      if (!map.has(dir)) {
        map.set(dir, []);
      }
      map.get(dir)?.push(e.fsPath);
    });
    return map;
  }
}

class FolderGallery extends AbstractGallery {
  constructor(
    context: vscode.ExtensionContext,
    webviewPanels: Map<string, vscode.WebviewPanel>,
    private v: any
  ) {
    super(context, webviewPanels, v.fsPath);
  }

  protected generateWebviewPanelTitle(): string {
    return parse(this.v.fsPath).name;
  }

  protected generateGalleryData(): Map<string, string[]> {
    return this.findFilesByExt(this.v.fsPath, EXT_SET);
  }

  private findFilesByExt(
    path: string,
    extSet: Set<string>
  ): Map<string, string[]> {
    let result: Map<string, string[]> = new Map();

    if (EXCLUDE.has(basename(path))) {
      return result;
    }

    const ds: Dirent[] = readdirSync(path, { withFileTypes: true });
    const files = this.filterByExt(ds, extSet).map((e) => join(path, e.name));
    if (files.length) {
      result.set(path, files);
    }
    ds.filter((d) => d.isDirectory()).forEach((d) => {
      result = new Map([
        ...result,
        ...this.findFilesByExt(join(path, d.name), extSet),
      ]);
    });
    return result;
  }

  private filterByExt(ds: Dirent[], extSet: Set<string>): Dirent[] {
    return ds.filter(
      (d) => d.isFile() && extSet.has(extname(d.name).toLocaleLowerCase())
    );
  }
}

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "SVG Gallery" is now active!');

  const webviewPanels: Map<string, vscode.WebviewPanel> = new Map();
  const regexp: RegExp = /.+\.svg$/i;

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "SVGGallery.open",
      (item: any, items: any[]) => {
        const selectedFiles: any[] = [];
        const selectedFolders: any[] = [];
        (items && items.length ? items : [item]).forEach((item: any) => {
          const stats: Stats = statSync(item.fsPath);
          if (stats.isFile() && regexp.test(item.fsPath)) {
            selectedFiles.push(item);
          }
          if (stats.isDirectory()) {
            selectedFolders.push(item);
          }
        });
        if (selectedFiles.length) {
          new FileGallery(context, webviewPanels, selectedFiles).build();
        }
        selectedFolders.forEach((v: any) =>
          new FolderGallery(context, webviewPanels, v).build()
        );
      }
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
