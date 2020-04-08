import * as vscode from 'vscode';
import { parse, extname, join, basename } from 'path';
import { readdirSync, Dirent } from 'fs';

import Gallery from './Gallery';
import { EXT_SVG, EXCLUDE, VIEW_TYPE } from './constant';

import galleryTpl from './templates/gallery.ejs';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

  console.log('Congratulations, your extension "SVG Gallery" is now active!');

  const webviewPanels: Map<string, vscode.WebviewPanel> = new Map();

  context.subscriptions.push(vscode.commands.registerCommand('SVGGallery.open', (folder: any, folders: any[]) => {

    const selectedFolders: any[] = folders.length ? folders : [folder];

    selectedFolders.forEach((v: any) => {
      const path: string = v.fsPath;
      let webViewPanel: vscode.WebviewPanel | undefined = webviewPanels.get(path);

      if (!webViewPanel) {
        webViewPanel = vscode.window.createWebviewPanel(
          VIEW_TYPE,
          `${parse(v.path).name} - SVG Gallery`,
          vscode.ViewColumn.One,
          { enableScripts: true, enableFindWidget: true }
        );
        webViewPanel.onDidDispose(() => webviewPanels.delete(path));
        context.subscriptions.push(webViewPanel.webview.onDidReceiveMessage(({ command, args }: { command: string, args: any }) => {
          switch (command) {
            case 'OPEN_FILE':
              const { path: filePath }: { path: string } = args;
              if (filePath) {
                vscode.window.showTextDocument(vscode.Uri.file(filePath)).then(() => { }, () => {
                  vscode.window.showErrorMessage('Oops! Unable to open the file.');
                  if (webViewPanel) {
                    const path: string = findKeyByValue<string, vscode.WebviewPanel>(webviewPanels, webViewPanel);
                    updateWebview(webViewPanel.webview, path);
                  }
                });
              }
              return;
            case 'REFRESH':
              if (webViewPanel) {
                const path: string = findKeyByValue<string, vscode.WebviewPanel>(webviewPanels, webViewPanel);
                updateWebview(webViewPanel.webview, path);
              }
              return;
          }
        }));
        webviewPanels.set(path, webViewPanel);
      } else {
        webViewPanel.reveal();
      }

      updateWebview(webViewPanel.webview, path);
    });
  }));
}

function findKeyByValue<K, V>(map: Map<K, V>, v: V): K {
  return [...map].filter(([, vv]) => vv === v).map(([k]) => k)[0];
}

function updateWebview(webview: vscode.Webview, path: string): void {
  const gallery: Gallery = buildGallery(path, webview);
  webview.html = gallery.generateHtml();
}

function buildGallery(path: string, webview: vscode.Webview): Gallery {
  return new Gallery(galleryTpl, webview, findFilesByExt(path, EXT_SVG));
}

function findFilesByExt(path: string, ext: string): Map<string, string[]> {
  let result: Map<string, string[]> = new Map();

  if (EXCLUDE.has(basename(path))) { return result; };

  const ds: Dirent[] = readdirSync(path, { withFileTypes: true });
  const files = filterByExt(ds, ext).map(e => join(path, e.name));
  if (files.length) { result.set(path, files); }
  ds.filter(d => d.isDirectory()).forEach(d => {
    result = new Map([...result, ...findFilesByExt(join(path, d.name), ext)]);
  });
  return result;
}

function filterByExt(ds: Dirent[], ext: string): Dirent[] {
  return ds.filter(d => d.isFile() && extname(d.name).toLocaleLowerCase() === ext);
}

// this method is called when your extension is deactivated
export function deactivate() { }
