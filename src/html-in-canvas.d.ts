// HTML-in-Canvas (https://github.com/WICG/html-in-canvas) is not in lib.dom yet.
import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    drawable?: "";
  }
  interface CanvasHTMLAttributes<T> {
    // Older Chromium builds only know this name for `content="drawable"`.
    layoutsubtree?: "true";
  }
}

declare global {
  interface HTMLCanvasElement {
    requestPaint?(): void;
  }
  interface CanvasRenderingContext2D {
    drawElementImage?(element: Element, dx: number, dy: number, dw: number, dh: number): DOMMatrix;
  }
}
