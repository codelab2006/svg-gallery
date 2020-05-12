import * as vscode from 'vscode';
import { parse, extname, join, basename } from 'path';
import { readdirSync, Dirent, statSync, Stats } from 'fs';

import Gallery from './Gallery';
import { EXT_SVG, EXCLUDE, VIEW_TYPE } from './constant';

import GALLERY_TPL from './templates/gallery.ejs';

const { v4: uuidv4 } = require('uuid');

abstract class AbstractGallery {
  constructor(
    protected context: vscode.ExtensionContext,
    protected webviewPanels: Map<string, vscode.WebviewPanel>,
    protected key: string) { }

  build(): void {
    let webViewPanel: vscode.WebviewPanel | undefined = this.webviewPanels.get(this.key);

    if (webViewPanel) {
      webViewPanel.reveal();
    } else {
      webViewPanel = this.createWebviewPanel(`${this.generateWebviewPanelTitle()} - SVG Gallery`);
      this.context.subscriptions.push(webViewPanel.onDidChangeViewState((e: vscode.WebviewPanelOnDidChangeViewStateEvent) => {
        if (e.webviewPanel.visible) { this.refreshWebview(e.webviewPanel.webview); }
      }));
      this.context.subscriptions.push(webViewPanel.onDidDispose(() => this.webviewPanels.delete(this.key)));
      this.context.subscriptions.push(webViewPanel.webview.onDidReceiveMessage(({ command, args }: { command: string, args: any }) => {
        switch (command) {
          case 'OPEN_FILE':
            const { path: filePath }: { path: string } = args;
            if (filePath) {
              vscode.window.showTextDocument(vscode.Uri.file(filePath)).then(() => { }, () => {
                vscode.window.showErrorMessage('Oops! Unable to open the file.');
                if (webViewPanel) {
                  const path: string = this.findKeyByValue<string, vscode.WebviewPanel>(this.webviewPanels, webViewPanel);
                  this.refreshWebview(webViewPanel.webview);
                }
              });
            }
            return;
          case 'REFRESH':
            if (webViewPanel) {
              const path: string = this.findKeyByValue<string, vscode.WebviewPanel>(this.webviewPanels, webViewPanel);
              this.refreshWebview(webViewPanel.webview);
              vscode.window.setStatusBarMessage('Refreshing...', 1000);
            }
            return;
        }
      }));
      this.webviewPanels.set(this.key, webViewPanel);
    }
    this.refreshWebview(webViewPanel.webview);
  }

  private createWebviewPanel(title: string): vscode.WebviewPanel {
    return vscode.window.createWebviewPanel(
      VIEW_TYPE,
      title,
      vscode.ViewColumn.One,
      { enableScripts: true, enableFindWidget: true }
    );
  }

  private findKeyByValue<K, V>(map: Map<K, V>, v: V): K {
    return [...map].filter(([, vv]) => vv === v).map(([k]) => k)[0];
  }

  private refreshWebview(webview: vscode.Webview): void {
    const gallery: Gallery = new Gallery(GALLERY_TPL, webview, this.generateGalleryData());
    webview.html = gallery.generateHtml();
  }

  protected abstract generateWebviewPanelTitle(): string;
  protected abstract generateGalleryData(): Map<string, string[]>;
}

class FileGallery extends AbstractGallery {

  constructor(
    context: vscode.ExtensionContext,
    webviewPanels: Map<string, vscode.WebviewPanel>,
    private v: any[]) {
    super(context, webviewPanels, uuidv4());
  }

  protected generateWebviewPanelTitle(): string {
    throw new Error("Method not implemented.");
  }

  protected generateGalleryData(): Map<string, string[]> {
    throw new Error("Method not implemented.");
  }
}

class FolderGallery extends AbstractGallery {

  constructor(
    context: vscode.ExtensionContext,
    webviewPanels: Map<string, vscode.WebviewPanel>,
    private v: any) {
    super(context, webviewPanels, v.fsPath);
  }

  protected generateWebviewPanelTitle(): string {
    return parse(this.v.fsPath).name;
  }

  protected generateGalleryData(): Map<string, string[]> {
    return this.findFilesByExt(this.v.fsPath, EXT_SVG);
  }

  private findFilesByExt(path: string, ext: string): Map<string, string[]> {
    let result: Map<string, string[]> = new Map();

    if (EXCLUDE.has(basename(path))) { return result; };

    const ds: Dirent[] = readdirSync(path, { withFileTypes: true });
    const files = this.filterByExt(ds, ext).map(e => join(path, e.name));
    if (files.length) { result.set(path, files); }
    ds.filter(d => d.isDirectory()).forEach(d => {
      result = new Map([...result, ...this.findFilesByExt(join(path, d.name), ext)]);
    });
    return result;
  }

  private filterByExt(ds: Dirent[], ext: string): Dirent[] {
    return ds.filter(d => d.isFile() && extname(d.name).toLocaleLowerCase() === ext);
  }
}

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

  console.log('Congratulations, your extension "SVG Gallery" is now active!');

  const webviewPanels: Map<string, vscode.WebviewPanel> = new Map();
  const regexp: RegExp = /.+\.svg$/i;

  context.subscriptions.push(vscode.commands.registerCommand('SVGGallery.open', (item: any, items: any[]) => {
    const selectedFiles: any[] = [];
    const selectedFolders: any[] = [];
    (items.length ? items : [item]).forEach((item: any) => {
      const stats: Stats = statSync(item.fsPath);
      if (stats.isFile() && regexp.test(item.fsPath)) { selectedFiles.push(item); }
      if (stats.isDirectory()) { selectedFolders.push(item); }
    });
    if (selectedFiles.length) { new FileGallery(context, webviewPanels, selectedFiles).build(); }
    selectedFolders.forEach((v: any) => new FolderGallery(context, webviewPanels, v).build());
  }));
}

// this method is called when your extension is deactivated
export function deactivate() { }
