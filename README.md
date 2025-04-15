# Debrid Link History

This is a Tampermonkey userscript that keeps track of the debrid links you generate on debrid-link.com. It saves them right in your browser using IndexedDB. You can scroll through your old links, search and check out the details anytime.

Debrid-Link lets you download or stream files from 150+ hosts with just one account. Paste a link, and it gives you a fast, no-wait download or stream link. It also supports browser addons and tools like JDownloader2.

Popular supported hosts: Rapidgator, 1fichier, DDownload, Katfile, Mega, Fikper, Turbobit, Pixeldrain, Elitefile, Worldbytez, and more.  
👉 [Try Debrid-Link](https://debrid-link.com/id/ZHh8o)

## What it does

- Shows a scrollable list of your generated links
- Loads 100 links at a time so it stays fast
- New links show up at the top
- You can search through your history
- Everything is saved locally in your browser

## Installation

1. Install Tampermonkey from the [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/).
2. After installing Tampermonkey, click the Tampermonkey icon in your browser.
3. Select **Create a New Script**.
4. Copy the content of the script provided into the editor.
5. Save the script and ensure it's enabled.
6. Go to your browser’s extensions page and enable Developer Mode.
7. Reload the page where you generate your debrid links.

## Usage

Once it's running, it'll automatically track every debrid link you generate.
- Scroll through your list to find old links
- Click a link to see the full details (host, size, expiration, etc.)
- Delete links from history if you want

## How It Works

- Uses your browser's IndexedDB to save everything
- Loads in chunks of 100 so it doesn't slow down
- Doesn't connect to any server; everything stays on your device

If you clear browser data, the history goes with it

## License

This project is open-source and available under the MIT License.
