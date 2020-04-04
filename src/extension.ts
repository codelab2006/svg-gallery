import * as vscode from 'vscode';
import { parse, extname, join, basename, ParsedPath, format, normalize } from 'path';
import { readdirSync, Dirent } from 'fs';

import grid from './bootstrap-grid.min.css';
import style from './style.css';
import sectionTpl from './templates/section.ejs';
import galleryTpl from './templates/gallery.ejs';

const ejs = require('ejs');

const EXT_SVG: string = '.svg';
const EXCLUDE: Set<string> = new Set([
  'node_modules'
]);

class File {

  public basename: string | undefined;
  public uri: vscode.Uri | undefined;

  constructor(private webview: vscode.Webview, public path: string) {
    this.basename = basename(path);
    this.uri = this.toUri(path);
  }

  private toUri(s: string): vscode.Uri {
    return this.webview.asWebviewUri(vscode.Uri.file(s));
  }
}

class Section {

  constructor(
    private webview: vscode.Webview,
    private tpl: string,
    private path: string,
    private files: string[]) { }

  generateHtml(): string {
    const o: ParsedPath = parse(this.path);
    return ejs.render(this.tpl, {
      path: normalize(join(o.root.toUpperCase(), o.dir.replace(o.root, ''), o.base)),
      files: this.files.map(e => new File(this.webview, e))
    });
  }
}

class Gallery {

  private sections: Section[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private webview: vscode.Webview,
    private tpl: string,
    private map: Map<string, string[]>) {
    map.forEach((v: string[], k: string) => this.sections.push(new Section(webview, sectionTpl, k, v)));
  }

  generateHtml(): string {
    return ejs.render(this.tpl, {
      style: `<style>${grid}${style}</style>`,
      sections: this.sections.map(e => e.generateHtml())
    });
  }
}

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

  console.log('Congratulations, your extension "SVG Gallery" is now active!');

  const webviewPanels: Map<string, vscode.WebviewPanel> = new Map();

  let disposable = vscode.commands.registerCommand('SVGGallery.open', (folder: any, folders: any[]) => {

    const selectedFolders: any[] = folders.length ? folders : [folder];

    selectedFolders.forEach((v: any) => {
      const path: string = v.fsPath;
      let webViewPanel: vscode.WebviewPanel | undefined = webviewPanels.get(path);

      if (!webViewPanel) {
        webViewPanel = vscode.window.createWebviewPanel(
          path,
          `${parse(v.path).name} - SVG Gallery`,
          vscode.ViewColumn.One,
          { enableScripts: true, enableFindWidget: true }
        );
        webViewPanel.onDidDispose(() => webviewPanels.delete(path));
        webviewPanels.set(path, webViewPanel);
      } else {
        webViewPanel.reveal();
      }

      const gallery: Gallery = buildGallery(path, context, webViewPanel.webview);
      webViewPanel.webview.html = gallery.generateHtml();
    });
  });

  context.subscriptions.push(disposable);
}

function buildGallery(path: string, context: vscode.ExtensionContext, webview: vscode.Webview): Gallery {
  return new Gallery(context, webview, galleryTpl, findFilesByExt(path, EXT_SVG));
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
