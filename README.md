# Window Tab Grid

Window Tab Grid is a Chromium extension that opens a dedicated tab manager for the current browser window.

Current version: `0.2.0`

Instead of hunting through a crowded tab strip, you get a clean visual grid where you can:

- search tabs by title or URL
- filter pinned and unpinned tabs
- sort by last accessed time, tab order, or title
- jump directly to a tab
- close tabs from the grid

## Release Notes

See [CHANGELOG.md](/Users/johanschmidt/devlocal/TabExtension/CHANGELOG.md) for version history and release notes.

## How It Works

Clicking the extension icon opens a full-page manager view for the current window. The manager reads the tabs in that window and renders them as cards with:

- favicon or fallback letter
- page title
- hostname
- pinned and active state
- relative last-accessed time

The view refreshes automatically when tabs are created, moved, updated, activated, or removed.

## Install In Chrome-Based Browsers

These steps work for Chrome, Brave, Microsoft Edge, and other Chromium-based browsers.

1. Download or clone this repository to your machine.
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Turn on `Developer mode`.
4. Click `Load unpacked`.
5. Select the folder:
   `/path/to/TabExtension`
6. Pin the extension if you want quick access from the toolbar.
7. Click the extension icon to open the tab grid for the current window.

## Usage

- Type in the search field to filter by title or URL.
- Use `Filter` to show all, pinned, or unpinned tabs.
- Use `Sort` to reorder the grid.
- Click a card to activate that tab.
- Click the `×` button on a card to close that tab.

## Development

This project is plain Manifest V3 HTML, CSS, and JavaScript. There is no build step.

If you make local changes:

1. Save the files.
2. Go back to the browser's extensions page.
3. Click `Reload` on the unpacked extension.
4. Re-open the extension from the toolbar and test the updated behavior.

## Project Structure

- `manifest.json` - extension manifest
- `background/service-worker.js` - toolbar click handling and manager-tab creation
- `tabs.html` - tab manager UI shell
- `tabs.css` - layout and styling
- `tabs.js` - tab querying, filtering, sorting, rendering, activation, and close actions
