import * as vscode from 'vscode';
import { basename } from 'path';

export default class File {

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
