(() => {
  if (customElements.get('hocluc-logo')) return

  class HocLucLogo extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'light', 'mark-only']
    }

    connectedCallback() {
      this.render()
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render()
    }

    render() {
      const parsedSize = Number(this.getAttribute('size') || 21)
      const size = Number.isFinite(parsedSize) ? Math.max(16, Math.min(parsedSize, 40)) : 21
      const light = this.hasAttribute('light')
      // V2 viewBox: 317 × 419. Keep the mark slightly taller than the wordmark.
      const markHeight = size * 1.3
      const markWidth = markHeight * 317 / 419
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' })
      root.innerHTML = `
        <style>
          :host { display: inline-flex; vertical-align: middle; }
          .logo { display: inline-flex; align-items: center; gap: ${Math.round(size * 0.22)}px; }
          .mark { display: block; width: ${markWidth}px; height: ${markHeight}px; object-fit: contain; flex: none; }
          :host([mark-only]) .wordmark { display: none; }
          .wordmark {
            color: ${light ? '#fff' : 'var(--logo-color, #0B3A82)'};
            display: inline-flex;
            align-items: baseline;
            font-family: 'Manrope', 'Be Vietnam Pro', sans-serif;
            font-size: ${size}px;
            font-weight: 800;
            letter-spacing: -.055em;
            line-height: 1;
            white-space: nowrap;
          }
          .dot {
            color: ${light ? '#7CC8FF' : 'var(--logo-accent, #1E88FF)'};
            font-weight: 700;
          }
        </style>
        <span class="logo" part="logo">
          <img class="mark" src="/hocluc-mark${light ? '-white' : ''}.svg" alt="" />
          <span class="wordmark" part="wordmark"><span>Hocluc</span><span class="dot" part="domain">.com</span></span>
        </span>
      `
    }
  }

  customElements.define('hocluc-logo', HocLucLogo)
})()
