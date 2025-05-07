import * as vscode from "vscode";
import Section from "./Section";

import grid from "./styles/bootstrap-grid.min.css";
import style from "./styles/style.css";

import SECTION_TPL from "./templates/section.ejs";

const ejs = require("ejs");

export default class Gallery {
  private sections: Section[] = [];

  constructor(
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
    });
  }
}
