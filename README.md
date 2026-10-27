# Framed Panel Card

A Home Assistant Lovelace card that wraps **any nested card** in a configurable border frame — without `custom:mod-card` or YAML-only styling.

Fully editable in the **visual card editor**: border thickness, color, corner radius, padding, and background.

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-blue)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)

## Features

- Wrap one nested Lovelace card (Markdown, Bubble, Mushroom, stacks, etc.)
- Configure in the UI:
  - **Border thickness** (px)
  - **Border color** (any CSS color)
  - **Corner radius** (px)
  - **Padding** (px)
  - **Background** (optional CSS background)
- Appears in the card picker as **Framed Panel**
- No `card-mod` required

## Install

### HACS (custom repository)

1. HACS → Frontend → ⋮ → **Custom repositories**
2. Add this repository URL, category **Lovelace**
3. Install **Framed Panel Card**
4. Restart Home Assistant (or reload resources)
5. Add the card from the dashboard UI (**Framed Panel**)

### Manual

1. Copy `framed-panel-card.js` to `config/www/framed-panel-card.js`
2. **Settings → Dashboards → ⋮ → Resources → Add resource**
   - URL: `/local/framed-panel-card.js`
   - Type: **JavaScript Module**
3. Refresh your browser

## Usage (UI)

1. Edit a dashboard → **Add card**
2. Search for **Framed Panel**
3. Set border thickness, color, radius, and padding
4. Pick / configure the nested card inside the frame

## Usage (YAML)

```yaml
type: custom:framed-panel-card
border_width: 4
border_color: rgba(128, 128, 128, 0.2)
border_radius: 25
padding: 10
background: none
card:
  type: vertical-stack
  cards:
    - type: markdown
      content: Hello from a framed panel
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `border_width` | number / string | `4` | Border thickness in px (or any CSS length) |
| `border_color` | string | `rgba(128, 128, 128, 0.2)` | CSS border color |
| `border_radius` | number / string | `25` | Corner radius in px (or any CSS length) |
| `padding` | number / string | `10` | Inner padding in px (or any CSS length) |
| `background` | string | `none` | CSS background for the frame |
| `card` | object | **required** | Nested Lovelace card config |

## Replacing mod-card frames

Before:

```yaml
type: custom:mod-card
card_mod:
  style: |
    ha-card {
      border: 4px solid rgba(128, 128, 128, 0.2);
      border-radius: 25px;
      padding: 10px;
    }
card:
  type: vertical-stack
  cards: [...]
```

After:

```yaml
type: custom:framed-panel-card
border_width: 4
border_color: rgba(128, 128, 128, 0.2)
border_radius: 25
padding: 10
card:
  type: vertical-stack
  cards: [...]
```

## License

MIT
