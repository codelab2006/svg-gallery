import * as vscode from "vscode";
import { parse, extname, dirname } from "path";
import { Dirent, statSync, Stats } from "fs";
import * as fg from "fast-glob";

import Gallery from "./Gallery";
import { EXT_SET, VIEW_TYPE, TEXT_MULTIPLE_FILES, SVG_EXT } from "./constant";

import GALLERY_TPL from "./templates/gallery.ejs";

import { nanoid } from "nanoid";
import { Pattern } from "fast-glob";

export const SHOW_SVG_ONLY = "showSVGOnly";
export const CUSTOM_BG_COLOR = "customBgColor";
export const FILTER = "filter";

abstract class AbstractGallery {
  constructor(
    protected context: vscode.ExtensionContext,
    protected webviewPanels: Map<string, vscode.WebviewPanel>,
    private key: string
  ) {
    if (context.workspaceState.get(SHOW_SVG_ONLY) === undefined) {
      context.workspaceState.update(SHOW_SVG_ONLY, true);
    }
  }

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
                  if (extname(filePath).toLowerCase() === SVG_EXT) {
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
                  } else {
                    vscode.commands.executeCommand(
                      "vscode.open",
                      vscode.Uri.file(filePath)
                    );
                  }
                }
                return;
              case "REFRESH":
                if (webViewPanel) {
                  this.refreshWebview(webViewPanel);
                  vscode.window.setStatusBarMessage("Refreshing...", 1000);
                }
                return;
              case "SAVE_FILTER_CONFIG":
                const { value: filter }: { value: string } = args;
                this.context.workspaceState.update(FILTER, filter);
                return;
              case "SAVE_CUSTOM_BG_COLOR_CONFIG":
                const { value: bgColor }: { value: boolean } = args;
                this.context.workspaceState.update(CUSTOM_BG_COLOR, bgColor);
                return;
              case "SAVE_SHOW_SVG_ONLY_CONFIG":
                if (webViewPanel) {
                  const { value }: { value: boolean } = args;
                  this.context.workspaceState.update(SHOW_SVG_ONLY, value);
                  this.refreshWebview(webViewPanel);
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
      {
        enableScripts: true,
        enableFindWidget: false,
        localResourceRoots: [
          ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) || []),
          vscode.Uri.joinPath(this.context.extensionUri, "media"),
        ],
      }
    );
  }

  private refreshWebview(webviewPanel: vscode.WebviewPanel): void {
    void (async () => {
      const data = await this.generateGalleryData();
      const webview = webviewPanel.webview;
      const gallery: Gallery = new Gallery(
        this.context,
        GALLERY_TPL,
        webview,
        data
      );
      webview.html = gallery.generateHtml();
    })();
  }

  protected abstract generateWebviewPanelTitle(): string;
  protected abstract generateGalleryData(): Promise<Map<string, string[]>>;
}

class FileGallery extends AbstractGallery {
  constructor(
    context: vscode.ExtensionContext,
    webviewPanels: Map<string, vscode.WebviewPanel>,
    private v: any[]
  ) {
    super(context, webviewPanels, v.length === 1 ? v[0].fsPath : nanoid());
  }

  protected generateWebviewPanelTitle(): string {
    return this.v.length === 1
      ? parse(this.v[0].fsPath).base
      : TEXT_MULTIPLE_FILES;
  }

  protected async generateGalleryData(): Promise<Map<string, string[]>> {
    const map: Map<string, string[]> = new Map();
    this.v.forEach((e: any) => {
      const dir: string = parse(e.fsPath).dir;
      if (!map.has(dir)) {
        map.set(dir, []);
      }
      map.get(dir)?.push(e.fsPath);
    });
    return Promise.resolve(map);
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

  protected async generateGalleryData(): Promise<Map<string, string[]>> {
    return await this.findFilesByExtAsync(this.v.fsPath, EXT_SET);
  }

  private async findFilesByExtAsync(
    path: string,
    extSet: Set<string>
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();

    const source: Pattern = this.context.workspaceState.get(SHOW_SVG_ONLY)
      ? `**/*${SVG_EXT}`
      : `**/*.{${[...extSet.values()]
          .map((ext) => ext.replace(".", ""))
          .join(",")}}`;

    let files = await fg([source, "!**/node_modules/**"], {
      cwd: path,
      absolute: true,
      onlyFiles: true,
    });

    for (const file of files) {
      const dir = dirname(file);
      if (!result.has(dir)) {
        result.set(dir, []);
      }
      result.get(dir)?.push(file);
    }

    return new Map(
      [...result.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    );
  }
}

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "SVG Gallery" is now active!');

  const webviewPanels: Map<string, vscode.WebviewPanel> = new Map();
  const regexp: RegExp = /.+\.(svg|png|jpg|jpeg|webp|gif|bmp|ico)$/i;

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
