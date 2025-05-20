import * as vscode from "vscode";
import Section from "./Section";

import grid from "./styles/bootstrap-grid.min.css";
import style from "./styles/style.css";

import SECTION_TPL from "./templates/section.ejs";
import { CUSTOM_BG_COLOR, FILTER, SHOW_SVG_ONLY } from "./extension";

const ejs = require("ejs");

export default class Gallery {
  private sections: Section[] = [];
  private bundleSrc: vscode.Uri;

  constructor(
    private context: vscode.ExtensionContext,
    private tpl: string,
    webview: vscode.Webview,
    map: Map<string, string[]>
  ) {
    map.forEach((v: string[], k: string) =>
      this.sections.push(new Section(webview, SECTION_TPL, k, v))
    );
    this.bundleSrc = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "bundle.js")
    );
  }

  generateHtml(): string {
    return ejs.render(this.tpl, {
      bundleSrc: this.bundleSrc,
      style: `<style>${grid}${style}</style>`,
      sections: this.sections.map((e) => e.generateHtml()),
      [SHOW_SVG_ONLY]: this.context.workspaceState.get(SHOW_SVG_ONLY),
      [CUSTOM_BG_COLOR]:
        this.context.workspaceState.get(CUSTOM_BG_COLOR) ?? "#f2f2f2",
      [FILTER]: this.context.workspaceState.get(FILTER) ?? "",
    });
  }
}
