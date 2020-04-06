import * as vscode from 'vscode';
import { basename } from 'path';
import { readFileSync } from 'fs';

const SVG_HEADER_RE = /<svg\s[^>]+>/;
const SVG_WIDTH_RE = /[^-]\bwidth="([^%]+?)"|[^-]\bwidth='([^%]+?)'/;
const SVG_HEIGHT_RE = /\bheight="([^%]+?)"|\bheight='([^%]+?)'/;
const SVG_VIEWBOX_RE = /\bview[bB]ox="(.+?)"|\bview[bB]ox='(.+?)'/;
const SVG_UNITS_RE = /in$|mm$|cm$|pt$|pc$|px$|em$|ex$/;

export class SVGWH {
  public constructor(public width: number, public height: number, public widthUnits: string, public heightUnits: string) { }
}

export class Attrs {
  public width: string | null = null;
  public height: string | null = null;
  public viewBox: string | null = null;
}

export default class File {

  public basename: string | undefined;
  public uri: vscode.Uri | undefined;
  public svgWH: SVGWH | undefined;

  constructor(private webview: vscode.Webview, public path: string) {
    this.basename = basename(path);
    this.uri = this.toUri(path);
    this.svgWH = this.extractWH(readFileSync(path));
  }

  private toUri(s: string): vscode.Uri {
    return this.webview.asWebviewUri(vscode.Uri.file(s));
  }

  private extractAttrs(s: string): Attrs {
    const width: RegExpMatchArray | null = s.match(SVG_WIDTH_RE);
    const height: RegExpMatchArray | null = s.match(SVG_HEIGHT_RE);
    const viewBox: RegExpMatchArray | null = s.match(SVG_VIEWBOX_RE);
    return {
      width: width && (width[1] || width[2]),
      height: height && (height[1] || height[2]),
      viewBox: viewBox && (viewBox[1] || viewBox[2])
    };
  }

  private isFinitePositive(v: number): boolean {
    return isFinite(v) && v > 0;
  }

  private units(s: string): string {
    const regExpMatchArray: RegExpMatchArray | null = s.match(SVG_UNITS_RE);
    return regExpMatchArray ? regExpMatchArray[0] : 'px';
  }

  private isWhiteSpace(chr: number): boolean {
    return chr === 0x20 || chr === 0x09 || chr === 0x0D || chr === 0x0A;
  }

  private canBeSVG(buffer: Buffer): boolean {
    const max: number = buffer.length;
    let i: number = 0;
    while (i < max && this.isWhiteSpace(buffer[i])) { i++; }
    return i !== max && buffer[i] === 0x3c;
  }

  private extractWH(buffer: Buffer): SVGWH | undefined {
    if (!this.canBeSVG(buffer)) { return; }

    let s = '';
    for (let i = 0; i < buffer.length; i++) { s += String.fromCharCode(buffer[i]); }

    if (!SVG_HEADER_RE.test(s)) { return; }

    const attrs: Attrs = this.extractAttrs(s);

    if (attrs.width && attrs.height) {
      const width = parseFloat(attrs.width);
      const height = parseFloat(attrs.height);
      if (!this.isFinitePositive(width) || !this.isFinitePositive(height)) { return; }
      return {
        width: width,
        height: height,
        widthUnits: this.units(attrs.width),
        heightUnits: this.units(attrs.height)
      };
    }

    const parts: string[] = (attrs.viewBox || '').split(' ');
    const viewBox: { width: string, height: string } = { width: parts[2], height: parts[3] };
    const vbWidth: number = parseFloat(viewBox.width);
    const vbHeight: number = parseFloat(viewBox.height);

    if (!this.isFinitePositive(vbWidth) || !this.isFinitePositive(vbHeight)) { return; }
    if (this.units(viewBox.width) !== this.units(viewBox.height)) { return; }

    const ratio: number = vbWidth / vbHeight;

    if (attrs.width) {
      const width = parseFloat(attrs.width);
      if (!this.isFinitePositive(width)) { return; }
      return {
        width: width,
        height: width / ratio,
        widthUnits: this.units(attrs.width),
        heightUnits: this.units(attrs.width)
      };
    }

    if (attrs.height) {
      const height = parseFloat(attrs.height);
      if (!this.isFinitePositive(height)) { return; }
      return {
        width: height * ratio,
        height: height,
        widthUnits: this.units(attrs.height),
        heightUnits: this.units(attrs.height)
      };
    }

    return {
      width: vbWidth,
      height: vbHeight,
      widthUnits: this.units(viewBox.width),
      heightUnits: this.units(viewBox.height)
    };
  }
}
