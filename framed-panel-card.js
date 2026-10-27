/**
 * Framed Panel Card for Home Assistant Lovelace
 * A UI-editable wrapper that draws a configurable border around any nested card.
 *
 * https://github.com/ShawnPott73/lovelace-framed-panel-card
 */

const CARD_VERSION = "1.0.1";
const CARD_TYPE = "framed-panel-card";
const CARD_TYPE_FULL = `custom:${CARD_TYPE}`;
const EDITOR_TYPE = "framed-panel-card-editor";

const DEFAULTS = {
  border_width: 4,
  border_color: "rgba(128, 128, 128, 0.2)",
  border_radius: 25,
  padding: 10,
  background: "none",
};

console.info(
  `%c FRAMED-PANEL-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#4a5568;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "color:#1a202c;background:#e2e8f0;border-radius:0 4px 4px 0;padding:2px 6px"
);

function cssLength(value, unit = "px") {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return `${value}${unit}`;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}${unit}`;
  return trimmed;
}

function normalizeConfig(config = {}) {
  const next = { ...DEFAULTS, ...config, type: CARD_TYPE_FULL };
  return next;
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

class FramedPanelCard extends HTMLElement {
  static getStubConfig() {
    return {
      border_width: DEFAULTS.border_width,
      border_color: DEFAULTS.border_color,
      border_radius: DEFAULTS.border_radius,
      padding: DEFAULTS.padding,
      background: DEFAULTS.background,
      card: {
        type: "markdown",
        content: "Add a card inside this framed panel.",
      },
    };
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }

  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }
    this._config = normalizeConfig(config);
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._innerCard) {
      this._innerCard.hass = hass;
    }
  }

  getCardSize() {
    if (this._innerCard && typeof this._innerCard.getCardSize === "function") {
      return this._innerCard.getCardSize();
    }
    return 3;
  }

  getGridOptions() {
    return {
      columns: "full",
      rows: "auto",
    };
  }

  async _build() {
    if (!this._config) return;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          box-sizing: border-box;
          overflow: hidden;
          box-shadow: none;
          background: var(--fpc-background, none);
          border-style: solid;
          border-width: var(--fpc-border-width, 4px);
          border-color: var(--fpc-border-color, rgba(128, 128, 128, 0.2));
          border-radius: var(--fpc-border-radius, 25px);
          padding: var(--fpc-padding, 10px);
        }
        #card {
          width: 100%;
        }
        .placeholder {
          opacity: 0.7;
          font-size: 14px;
          padding: 8px 4px;
        }
      </style>
      <ha-card>
        <div id="card"></div>
      </ha-card>
    `;

    this._haCard = root.querySelector("ha-card");
    this._cardHost = root.querySelector("#card");
    this._applyFrameStyles();
    await this._createInnerCard();
  }

  _applyFrameStyles() {
    if (!this._haCard || !this._config) return;
    const c = this._config;
    this._haCard.style.setProperty("--fpc-border-width", cssLength(c.border_width) || "4px");
    this._haCard.style.setProperty("--fpc-border-color", c.border_color || DEFAULTS.border_color);
    this._haCard.style.setProperty("--fpc-border-radius", cssLength(c.border_radius) || "25px");
    this._haCard.style.setProperty("--fpc-padding", cssLength(c.padding) || "10px");
    this._haCard.style.setProperty("--fpc-background", c.background ?? DEFAULTS.background);
  }

  async _createInnerCard() {
    if (!this._cardHost) return;

    this._cardHost.innerHTML = "";
    this._innerCard = null;

    if (!this._config?.card || typeof this._config.card !== "object" || !this._config.card.type) {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.textContent = "Pick a nested card in the visual editor.";
      this._cardHost.appendChild(placeholder);
      return;
    }

    const helpers = await window.loadCardHelpers();
    const element = helpers.createCardElement(this._config.card);
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._createInnerCard();
      },
      { once: true }
    );
    if (this._hass) {
      element.hass = this._hass;
    }
    this._innerCard = element;
    this._cardHost.appendChild(element);
  }
}

customElements.define(CARD_TYPE, FramedPanelCard);

/* -------------------------------------------------------------------------- */
/* Editor                                                                      */
/* -------------------------------------------------------------------------- */

class FramedPanelCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = normalizeConfig(FramedPanelCard.getStubConfig());
    this._built = false;
  }

  setConfig(config) {
    this._config = normalizeConfig(config || FramedPanelCard.getStubConfig());
    if (!this._built) {
      this._build();
    } else {
      this._sync();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    if (this._stackEditor) this._stackEditor.hass = hass;
  }

  set lovelace(lovelace) {
    this._lovelace = lovelace;
    if (this._stackEditor) this._stackEditor.lovelace = lovelace;
  }

  async _build() {
    this._built = true;
    this.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:16px;padding:4px 0;";

    const formTitle = document.createElement("div");
    formTitle.textContent = "Frame style";
    formTitle.style.cssText = "font-weight:600;font-size:14px;";
    wrap.appendChild(formTitle);

    this._form = document.createElement("ha-form");
    this._form.schema = [
      {
        type: "grid",
        name: "",
        flatten: true,
        column_min_width: "140px",
        schema: [
          {
            name: "border_width",
            required: true,
            selector: { number: { min: 0, max: 64, step: 1, mode: "box", unit_of_measurement: "px" } },
          },
          {
            name: "border_radius",
            required: true,
            selector: { number: { min: 0, max: 128, step: 1, mode: "box", unit_of_measurement: "px" } },
          },
          {
            name: "padding",
            required: true,
            selector: { number: { min: 0, max: 128, step: 1, mode: "box", unit_of_measurement: "px" } },
          },
        ],
      },
      {
        name: "border_color",
        required: true,
        selector: { text: {} },
      },
      {
        name: "background",
        selector: { text: {} },
      },
    ];
    this._form.computeLabel = (schema) => {
      const labels = {
        border_width: "Border thickness",
        border_color: "Border color",
        border_radius: "Corner radius",
        padding: "Padding",
        background: "Background",
      };
      return labels[schema.name] || schema.name;
    };
    this._form.computeHelper = (schema) => {
      if (schema.name === "border_color") {
        return "CSS color: #888, rgba(...), or var(--divider-color)";
      }
      if (schema.name === "background") {
        return "CSS background: none, #111, rgba(...), etc.";
      }
      return undefined;
    };
    this._form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._fireChanged({
        ...this._config,
        ...ev.detail.value,
        card: this._config.card,
      });
    });
    wrap.appendChild(this._form);

    const cardTitle = document.createElement("div");
    cardTitle.textContent = "Nested card";
    cardTitle.style.cssText = "font-weight:600;font-size:14px;margin-top:8px;";
    wrap.appendChild(cardTitle);

    const cardHint = document.createElement("div");
    cardHint.textContent =
      "Add exactly one card below (use a Vertical Stack inside if you need multiple).";
    cardHint.style.cssText = "font-size:12px;opacity:0.7;margin-top:-8px;";
    wrap.appendChild(cardHint);

    this._cardSlot = document.createElement("div");
    wrap.appendChild(this._cardSlot);
    this.appendChild(wrap);

    if (this._hass) this._form.hass = this._hass;
    await this._mountStackEditor();
    this._sync();
  }

  async _mountStackEditor() {
    let cls = customElements.get("hui-vertical-stack-card");
    if (!cls) {
      const helpers = await window.loadCardHelpers();
      helpers.createCardElement({ type: "vertical-stack", cards: [] });
      await customElements.whenDefined("hui-vertical-stack-card");
      cls = customElements.get("hui-vertical-stack-card");
    }
    this._stackEditor = await cls.getConfigElement();
    this._stackEditor.addEventListener("config-changed", (ev) => {
      const cfg = ev.detail?.config;
      if (!cfg || !Array.isArray(cfg.cards)) return;
      ev.stopPropagation();
      const nested = cfg.cards[0];
      const next = { ...this._config };
      if (nested) {
        next.card = nested;
      } else {
        delete next.card;
      }
      this._fireChanged(next);
    });
    this._cardSlot.appendChild(this._stackEditor);
    if (this._hass) this._stackEditor.hass = this._hass;
    if (this._lovelace) this._stackEditor.lovelace = this._lovelace;
  }

  _sync() {
    if (!this._form) return;

    this._form.data = {
      border_width: this._config.border_width ?? DEFAULTS.border_width,
      border_color: this._config.border_color ?? DEFAULTS.border_color,
      border_radius: this._config.border_radius ?? DEFAULTS.border_radius,
      padding: this._config.padding ?? DEFAULTS.padding,
      background: this._config.background ?? DEFAULTS.background,
    };
    if (this._hass) this._form.hass = this._hass;

    if (this._stackEditor) {
      if (this._hass) this._stackEditor.hass = this._hass;
      if (this._lovelace) this._stackEditor.lovelace = this._lovelace;
      this._stackEditor.setConfig({
        type: "vertical-stack",
        cards: this._config.card ? [this._config.card] : [],
      });
    }
  }

  _fireChanged(config) {
    // Always keep the full custom card type — omitting it breaks the editor preview
    // with "No type provided" / disables the visual editor.
    const cleaned = normalizeConfig(config);
    this._config = cleaned;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: cleaned },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define(EDITOR_TYPE, FramedPanelCardEditor);

/* -------------------------------------------------------------------------- */
/* Card picker registration                                                    */
/* -------------------------------------------------------------------------- */

window.customCards = window.customCards || [];
window.customCards = window.customCards.filter((c) => c.type !== CARD_TYPE);
window.customCards.push({
  type: CARD_TYPE,
  name: "Framed Panel",
  description: "Wrap any card in a configurable border frame (thickness, color, radius, padding).",
  preview: true,
  documentationURL: "https://github.com/ShawnPott73/lovelace-framed-panel-card",
});
