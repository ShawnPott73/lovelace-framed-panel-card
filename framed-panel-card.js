/**
 * Framed Panel Card for Home Assistant Lovelace
 * A UI-editable wrapper that draws a configurable border around any nested card.
 *
 * https://github.com/ShawnPott73/lovelace-framed-panel-card
 */

const CARD_VERSION = "1.0.0";
const CARD_TYPE = "framed-panel-card";
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

function deepMerge(base, extra) {
  return { ...base, ...extra };
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

  static getConfigForm() {
    // Used by HA for the visual editor fields (border options).
    // Nested card is edited via the custom editor element.
    return {
      schema: [
        {
          name: "border_width",
          required: true,
          default: DEFAULTS.border_width,
          selector: { number: { min: 0, max: 64, step: 1, mode: "box", unit_of_measurement: "px" } },
        },
        {
          name: "border_color",
          required: true,
          default: DEFAULTS.border_color,
          selector: { text: {} },
        },
        {
          name: "border_radius",
          required: true,
          default: DEFAULTS.border_radius,
          selector: { number: { min: 0, max: 128, step: 1, mode: "box", unit_of_measurement: "px" } },
        },
        {
          name: "padding",
          required: true,
          default: DEFAULTS.padding,
          selector: { number: { min: 0, max: 128, step: 1, mode: "box", unit_of_measurement: "px" } },
        },
        {
          name: "background",
          default: DEFAULTS.background,
          selector: { text: {} },
        },
      ],
      computeLabel: (schema) => {
        const labels = {
          border_width: "Border thickness",
          border_color: "Border color",
          border_radius: "Corner radius",
          padding: "Padding",
          background: "Background",
        };
        return labels[schema.name];
      },
      computeHelper: (schema) => {
        const helpers = {
          border_color: "Any CSS color, e.g. #888, rgba(128,128,128,0.2), or var(--divider-color)",
          background: "Any CSS background, e.g. none, #111, or rgba(0,0,0,0.2)",
        };
        return helpers[schema.name];
      },
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    if (!config.card || typeof config.card !== "object") {
      throw new Error("You need to define a nested card under `card:`");
    }
    this._config = deepMerge(DEFAULTS, config);
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
    if (!this._cardHost || !this._config?.card) return;

    this._cardHost.innerHTML = "";
    this._innerCard = null;

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
    this._config = {};
    this._built = false;
  }

  setConfig(config) {
    this._config = deepMerge(DEFAULTS, config || {});
    if (!this._built) {
      this._build();
    } else {
      this._sync();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    if (this._cardEditor) this._cardEditor.hass = hass;
    if (this._cardPicker) this._cardPicker.hass = hass;
  }

  set lovelace(lovelace) {
    this._lovelace = lovelace;
    if (this._cardEditor) this._cardEditor.lovelace = lovelace;
    if (this._cardPicker) this._cardPicker.lovelace = lovelace;
  }

  async _build() {
    this._built = true;
    this.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:16px;padding:4px 0;";

    // --- Style options via ha-form ---
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
      const next = {
        ...this._config,
        ...ev.detail.value,
        card: this._config.card,
        type: undefined,
      };
      delete next.type;
      this._fireChanged(next);
    });
    wrap.appendChild(this._form);

    // --- Nested card ---
    const cardTitle = document.createElement("div");
    cardTitle.textContent = "Nested card";
    cardTitle.style.cssText = "font-weight:600;font-size:14px;margin-top:8px;";
    wrap.appendChild(cardTitle);

    const cardHint = document.createElement("div");
    cardHint.textContent = "Pick or edit the card shown inside the frame.";
    cardHint.style.cssText = "font-size:12px;opacity:0.7;margin-top:-8px;";
    wrap.appendChild(cardHint);

    this._cardSlot = document.createElement("div");
    wrap.appendChild(this._cardSlot);

    this.appendChild(wrap);

    if (this._hass) this._form.hass = this._hass;
    await this._ensureCardEditorLoaded();
    this._sync();
  }

  async _ensureCardEditorLoaded() {
    // Preload card picker / card element editor used by core stack editors.
    try {
      const helpers = await window.loadCardHelpers();
      const stack = helpers.createCardElement({ type: "vertical-stack", cards: [] });
      if (stack?.constructor?.getConfigElement) {
        await stack.constructor.getConfigElement();
      }
    } catch (err) {
      // Editor still works for style fields; nested picker may need a refresh.
      console.warn("framed-panel-card: could not preload card editor helpers", err);
    }
  }

  _sync() {
    if (!this._form) return;

    const data = {
      border_width: this._config.border_width ?? DEFAULTS.border_width,
      border_color: this._config.border_color ?? DEFAULTS.border_color,
      border_radius: this._config.border_radius ?? DEFAULTS.border_radius,
      padding: this._config.padding ?? DEFAULTS.padding,
      background: this._config.background ?? DEFAULTS.background,
    };
    this._form.data = data;
    if (this._hass) this._form.hass = this._hass;

    this._renderCardEditor();
  }

  _renderCardEditor() {
    if (!this._cardSlot) return;
    this._cardSlot.innerHTML = "";
    this._cardEditor = null;
    this._cardPicker = null;

    if (this._config.card) {
      // Edit existing nested card
      const editor = document.createElement("hui-card-element-editor");
      editor.addEventListener("config-changed", (ev) => {
        ev.stopPropagation();
        const cardConfig = ev.detail.config;
        this._fireChanged({ ...this._config, card: cardConfig });
      });
      editor.addEventListener("GUImode-changed", (ev) => {
        ev.stopPropagation();
      });
      if (this._hass) editor.hass = this._hass;
      if (this._lovelace) editor.lovelace = this._lovelace;
      // value setter used by HA card element editor
      try {
        editor.hass = this._hass;
        editor.lovelace = this._lovelace;
        editor.setConfig(this._config.card);
      } catch (err) {
        console.warn("framed-panel-card: nested card editor setConfig failed", err);
      }
      this._cardEditor = editor;
      this._cardSlot.appendChild(editor);

      const replaceBtn = document.createElement("ha-button");
      replaceBtn.style.marginTop = "8px";
      replaceBtn.innerHTML = `<span>Replace nested card</span>`;
      replaceBtn.addEventListener("click", () => {
        this._fireChanged({ ...this._config, card: undefined });
      });
      // fallback plain button if ha-button unavailable
      const plain = document.createElement("mwc-button");
      plain.style.marginTop = "8px";
      plain.setAttribute("outlined", "");
      plain.textContent = "Replace nested card";
      plain.addEventListener("click", () => {
        const next = { ...this._config };
        delete next.card;
        this._fireChanged(next);
      });
      this._cardSlot.appendChild(plain);
    } else {
      const picker = document.createElement("hui-card-picker");
      if (this._hass) picker.hass = this._hass;
      if (this._lovelace) picker.lovelace = this._lovelace;
      picker.addEventListener("config-changed", (ev) => {
        ev.stopPropagation();
        if (!ev.detail?.config) return;
        this._fireChanged({ ...this._config, card: ev.detail.config });
      });
      // Some HA versions use value-changed
      picker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        if (!ev.detail?.value) return;
        this._fireChanged({ ...this._config, card: ev.detail.value });
      });
      this._cardPicker = picker;
      this._cardSlot.appendChild(picker);
    }
  }

  _fireChanged(config) {
    // Keep type out of stored config detail; HA adds it.
    const cleaned = { ...config };
    delete cleaned.type;
    this._config = deepMerge(DEFAULTS, cleaned);
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
window.customCards.push({
  type: CARD_TYPE,
  name: "Framed Panel",
  description: "Wrap any card in a configurable border frame (thickness, color, radius, padding).",
  preview: true,
  documentationURL: "https://github.com/ShawnPott73/lovelace-framed-panel-card",
});
