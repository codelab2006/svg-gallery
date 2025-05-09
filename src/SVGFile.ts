import * as vscode from "vscode";
import { basename } from "path";
import { readFileSync } from "fs";
import { ENCODING } from "./constant";

const fastXmlParser = require("fast-xml-parser");

export default class SVGFile {
  public basename: string | undefined;
  public uri: vscode.Uri | undefined;
  public width: string = "";
  public height: string = "";

  constructor(private webview: vscode.Webview, public path: string) {
    this.uri = this.webview.asWebviewUri(vscode.Uri.file(path));
    const contents: string = readFileSync(path, {
      encoding: ENCODING as BufferEncoding,
    }).trim();
    if (fastXmlParser.validate(contents) === true) {
      try {
        const o = fastXmlParser.parse(contents, {
          attributeNamePrefix: "",
          ignoreAttributes: false,
        });
        const {
          svg: { width, height },
        } = o;
        if (width) {
          this.width = `W:${width}`;
        }
        if (height) {
          this.height = `H:${height}`;
        }
      } catch (error) {
        console.error(error);
      }
    }
    this.basename = basename(path);
  }
}
