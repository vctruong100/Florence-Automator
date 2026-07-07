# Florence Automator Extension

A Manifest V3 browser extension version of the Florence Automator userscript. It runs as a content script on `https://us.v2.researchbinders.com/*` and displays a fixed sidebar on the right side of the page.

## Files

- `manifest.json` — Extension manifest (MV3).
- `Florence Extension.js` — Content script containing all automator logic.
- `Florence Automator.js` — Original userscript (kept for reference).

## Loading the extension (developer mode)

1. Open Chrome/Edge and go to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right).
3. Click **Load unpacked**.
4. Select this repository folder (`Automator Florence`).
5. Navigate to `https://us.v2.researchbinders.com/` and refresh.
6. The Florence Automator sidebar should appear on the right side of the page.

## Usage

- Press the configured keybind (default `F2`) to show or hide the sidebar.
- Click any feature button in the sidebar — the original automator logic runs unchanged.
- Use the configuration icon (gear) to change the keybind, reorder/hide buttons, or hide logs.

## Notes

- The sidebar is docked to the right edge and adds a `360px` right offset to the page so the underlying page content is not covered.
- `GM.xmlHttpRequest` is not available in extension content scripts; the script falls back to `fetch` automatically.
- Settings such as keybind, button layout, and visibility are stored in the page's `localStorage`, so existing userscript settings will carry over on the same origin.

## Icons

To add a custom toolbar icon, create `icon16.png`, `icon48.png`, and `icon128.png` in this folder and add an `icons` entry to `manifest.json`. Without icons, Chrome will use a default icon.
