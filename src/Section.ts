import * as vscode from 'vscode';
import { ParsedPath, parse, normalize, join } from 'path';
import SVGFile from './SVGFile';

const ejs = require('ejs');

export default class Section {

  constructor(
    private webview: vscode.Webview,
    private tpl: string,
    private path: string,
    private files: string[]) { }

  generateHtml(): string {
    const o: ParsedPath = parse(this.path);
    return ejs.render(this.tpl, {
      path: normalize(join(o.root.toUpperCase(), o.dir.replace(o.root, ''), o.base)),
      files: this.files.map(e => new SVGFile(this.webview, e))
    });
  }
}
