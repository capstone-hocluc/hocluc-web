// Paged.js ships no types: the part used here (src/polyfill/previewer.js).
declare module 'pagedjs' {
  export interface PagedFlow {
    total: number
  }

  export class Previewer {
    constructor(options?: Record<string, unknown>)
    /** `stylesheets`: URLs, or `{ name: cssText }` objects. */
    preview(content: Node, stylesheets: Array<string | Record<string, string>>, renderTo: HTMLElement): Promise<PagedFlow>
    polisher: { destroy(): void }
  }
}
