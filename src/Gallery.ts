import * as vscode from "vscode";
import Section from "./Section";

import grid from "./styles/bootstrap-grid.min.css";
import style from "./styles/style.css";

import SECTION_TPL from "./templates/section.ejs";
import { CUSTOM_BG_COLOR, SHOW_SVG_ONLY } from "./extension";

const ejs = require("ejs");

export default class Gallery {
  private sections: Section[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private tpl: string,
    webview: vscode.Webview,
    map: Map<string, string[]>
  ) {
    map.forEach((v: string[], k: string) =>
      this.sections.push(new Section(webview, SECTION_TPL, k, v))
    );
  }

  generateHtml(): string {
    return ejs.render(this.tpl, {
      style: `<style>${grid}${style}</style>`,
      sections: this.sections.map((e) => e.generateHtml()),
      [SHOW_SVG_ONLY]: this.context.workspaceState.get(SHOW_SVG_ONLY),
      [CUSTOM_BG_COLOR]:
        this.context.workspaceState.get(CUSTOM_BG_COLOR) ?? "#00ff00",
    });
  }
}
