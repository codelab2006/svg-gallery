import * as vscode from 'vscode';
import { basename } from 'path';
import { readFileSync } from 'fs';

const parser = require('fast-xml-parser');

export default class File {

  public basename: string | undefined;
  public uri: vscode.Uri | undefined;
  public width: string = 'n/a';
  public height: string = 'n/a';

  constructor(private webview: vscode.Webview, public path: string) {
    this.basename = basename(path);
    this.uri = this.webview.asWebviewUri(vscode.Uri.file(path));
    const data: Buffer = readFileSync(path);
    let contents: string = '';
    for (const code of data) { contents += String.fromCharCode(code); }
    if (parser.validate(contents) === true) {
      const { svg: { width, height } } = parser.parse(contents, { attributeNamePrefix: '', ignoreAttributes: false });
      if (width) { this.width = width; }
      if (height) { this.height = height; }
    }
  }
}
