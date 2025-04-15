// ==UserScript==
// @name         Link History
// @namespace    https://github.com/czrsd/debrid-link-history
// @version      1.0.0
// @description  Show history of generated links
// @author       @czrsd
// @match        https://debrid-link.com/webapp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=debrid-link.com
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(() => {
	'use strict';
    /** @type {boolean} */
    let initialized = false;
    /** @type {string} */
    let lastPath = location.pathname;
    /** @type {string} */
    let openedWrapperId = null;

    /** @returns {void} */
    const onPathChange = () => {
        const path = location.pathname;
        initialized = false;
        const wrapper = document.getElementById(`wrapper-${openedWrapperId}`);
        if (wrapper) wrapper.remove();
        if (path === '/webapp/downloader') initDownloaderUI();
    };

	['pushState', 'replaceState'].forEach(type => {
		const orig = history[type];
		history[type] = function () {
			orig.apply(this, arguments);
			window.dispatchEvent(new Event('locationchange'));
		};
	});

	window.addEventListener('popstate', onPathChange);
	window.addEventListener('locationchange', onPathChange);

	onPathChange();

	/** @type {IDBDatabase|null} */
	let db = null;

	/**
	 * Opens or returns a cached IndexedDB instance.
	 * @returns {Promise<IDBDatabase>} A promise resolving to the IndexedDB instance.
	 */
    const openDB = async () => {
        if (db) return db;

        const req = indexedDB.open('link-history', 2);
        req.onupgradeneeded = () => {
            const store = req.result.createObjectStore('links', { keyPath: 'id' });
            store.createIndex('time', 'time', { unique: false });
        };

        return new Promise((resolve, reject) => {
            req.onsuccess = () => {
                db = req.result;
                resolve(db);
            };
            req.onerror = reject;
        });
    };

	/**
	 * Converts a Unix timestamp (in seconds or milliseconds) to a human-readable date string.
	 * @param {number} timestamp The Unix timestamp.
	 * @returns {string} A formatted date string.
	 */
	const humanDate = (timestamp) => {
		// If timestamp is in seconds, convert to milliseconds.
		if (timestamp < 1e12) timestamp *= 1000;
		const date = new Date(timestamp);
		return `${date.getFullYear()}-${(date.getMonth() + 1)
			.toString()
			.padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date
			.getHours()
			.toString()
			.padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
	};

	/**
	 * Returns the icon HTML for a given host.
	 * @param {string} host The host string.
	 * @returns {string} The HTML string representing the host icon.
	 */
    const hostIcon = (host) => {
        const iconClass = `sprite-${host.replace(/\./g, '_')}`;
        return `<div class="sprite ${iconClass}" tooltip="${iconClass}"></div>`;
    };

    /**
     * Deletes a link from the IndexedDB.
     * @param {string} linkId The ID of the link to delete.
     */
    const deleteLink = (linkId) => {
        openDB().then((db) => {
            const transaction = db.transaction('links', 'readwrite');
            const store = transaction.objectStore('links');
            store.delete(linkId);
        }).catch((error) => console.error('DB error:', error));

        const listElem = document.getElementById(linkId);
        const wrapperElem = document.getElementById(`wrapper-${linkId}`);
        if (listElem) listElem.remove();
        if (wrapperElem) wrapperElem.remove();
    };

    /**
     * Closes the given wrapper by fading it out and removing it from the DOM after a short delay.
     *
     * @param {HTMLElement} wrapper
     */
    const closeWrapper = (wrapper) => {
        wrapper.style.opacity = '0';
        setTimeout(() => wrapper.remove(), 100);
    };

	/**
	 * @typedef {Object} LinkData
	 * @property {string} id
	 * @property {string} host
	 * @property {string} filename
	 * @property {number} time
	 * @property {string} link
	 * @property {string} downloadLink
	 * @property {boolean} expired
	 * @property {number} size
	 * @property {Array} otherLinks
	 */

	/**
	 * Displays a detail overlay for a single link.
	 * @param {LinkData} data The link data.
	 */
    const linkDetails = (data) => {
        const existingWrapper = document.querySelector('.cz-wrapper');
        if (existingWrapper) {
            closeWrapper(existingWrapper);

            if (existingWrapper.id === `wrapper-${data.id}`) return;
        }

        openedWrapperId = data.id;

		const wrapper = document.createElement('div');
        wrapper.style.opacity = '0';
        wrapper.id = `wrapper-${data.id}`;
		wrapper.className = 'cz-wrapper';

		const header = document.createElement('div');
		header.className = 'cz-wrapper-header';
		header.innerHTML = `<span>${data.filename}</span>`;

		const closeBtn = document.createElement('button');
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => closeWrapper(wrapper));
		header.appendChild(closeBtn);

		const body = document.createElement('div');
		body.className = 'cz-wrapper-body';
		body.innerHTML = `
			<div class="cz-detail-row">
				<div class="cz-detail-label">ID:</div>
				<div class="cz-detail-value">${data.id}</div>
			</div>
			<div class="cz-detail-row">
				<div class="cz-detail-label">Host:</div>
				<div class="cz-detail-value">${data.host}</div>
			</div>
			<div class="cz-detail-row">
				<div class="cz-detail-label">Link:</div>
				<div class="cz-detail-value"><a href="${data.link}" target="_blank">${data.link}</a></div>
			</div>
			<div class="cz-detail-row">
				<div class="cz-detail-label">Download:</div>
				<div class="cz-detail-value"><a href="${data.downloadLink}" target="_blank">${data.downloadLink}</a></div>
			</div>
			<div class="cz-detail-row">
				<div class="cz-detail-label">Size:</div>
				<div class="cz-detail-value">${(data.size / 1024 / 1024).toFixed(2)} MB</div>
			</div>
			<div class="cz-detail-row">
				<div class="cz-detail-label">Expired:</div>
				<div class="cz-detail-value">${data.expired ? 'Yes' : 'No'}</div>
			</div>
			<div class="cz-detail-row">
				<div class="cz-detail-label">Time:</div>
				<div class="cz-detail-value">${humanDate(data.time)}</div>
			</div>
			<div class="cz-detail-row">
				<div class="cz-detail-label">Delete Link</div>
				<button class="cz-delete-btn" id="cz-delete">Delete</button>
			</div>
		`;

		wrapper.append(header, body);
		document.body.append(wrapper);

        const deleteBtn = document.getElementById('cz-delete');
        deleteBtn.addEventListener('click', () => {
            deleteLink(data.id);
        });

        // add a small timeout to make it fade in properly
        setTimeout(() => { wrapper.style.opacity = '1' })
	};

	/**
	 * Adds a single link element to the history list.
	 * @param {LinkData} data The link data.
	 */
    const addLink = (data) => {
        if (document.getElementById(data.id)) return;

        const link = document.createElement('div');
        link.classList.add('cz-link');
        link.id = data.id;

        const fileDiv = document.createElement('div');
        fileDiv.classList.add('cz-file');
        fileDiv.innerHTML = hostIcon(data.host);

        const filenameSpan = document.createElement('span');
        filenameSpan.classList.add('cz-filename');
        filenameSpan.textContent = data.filename;
        fileDiv.appendChild(filenameSpan);

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('cz-time');
        timeSpan.textContent = humanDate(data.time || Date.now());

        link.appendChild(fileDiv);
        link.appendChild(timeSpan);

        link.addEventListener('click', () => linkDetails(data));
        linkList.insertBefore(link, linkList.firstChild);
    };

    let offset = 0;
    const limit = 100;
    let loading = false;
    let allLoaded = false;

    /**
     * Loads the next batch of links from IndexedDB and adds them to the UI.
     * @returns {Promise<void>}
     */
    const loadLinks = async () => {
        if (loading || allLoaded) return;
        loading = true;
        const db = await openDB();
        const tx = db.transaction('links', 'readonly');
        const store = tx.objectStore('links');
        const index = store.index('time');
        const links = [];

        index.openCursor(null, 'prev').onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor && links.length < limit + offset) {
                if (links.length >= offset) links.push(cursor.value);
                cursor.continue();
            } else {
                if (links.length === 0) allLoaded = true;
                links.reverse().forEach(addLink);
                offset += limit;
                loading = false;
            }
        };
    };

    // ----- XHR Interception for API Calls -----

    const interceptXHR = () => {
        /** @type {typeof XMLHttpRequest.prototype.open} */
        const originalOpen = unsafeWindow.XMLHttpRequest.prototype.open;
        /** @type {typeof XMLHttpRequest.prototype.send} */
        const originalSend = unsafeWindow.XMLHttpRequest.prototype.send;

        unsafeWindow.XMLHttpRequest.prototype.open = function (method, url, ...args) {
            this._interceptUrl = url;
            return originalOpen.call(this, method, url, ...args);
        };

        unsafeWindow.XMLHttpRequest.prototype.send = function (body) {
            if (typeof this._interceptUrl === 'string' && this._interceptUrl.includes('api/downloader/add')) {
                this.addEventListener('load', function () {
                    try {
                        const json = JSON.parse(this.responseText);
                        if (json?.result === 'OK') {
                            openDB()
                                .then((db) => {
                                const transaction = db.transaction('links', 'readwrite');
                                const store = transaction.objectStore('links');
                                store.put({ id: json.value.id, ...json.value });
                                addLink(json.value);
                            })
                                .catch((error) => console.error('DB error:', error));
                        }
                    } catch (e) {
                        console.error('Failed to parse JSON:', e);
                    }
                });
            }
            return originalSend.call(this, body);
        };
    };

    interceptXHR();

	// ----- UI Setup -----

	/** @type {HTMLDivElement} */
	const historyDiv = document.createElement('div');
	historyDiv.classList.add('cz-history');

    /** @type {HTMLHeadingElement} */
    const titleElem = document.createElement('h4');
    titleElem.textContent = 'History';
    historyDiv.append(titleElem);

    /** @type {HTMLInputElement} */
    const searchElem = document.createElement('input');
    searchElem.classList.add('cz-search');
    searchElem.placeholder = 'Search...';
    historyDiv.append(searchElem);

    searchElem.addEventListener('input', async (event) => {
        const query = event.target.value.toLowerCase();
        const db = await openDB();
        const tx = db.transaction('links', 'readonly');
        const store = tx.objectStore('links');
        const index = store.index('time');
        const filteredLinks = [];

        const cursorRequest = index.openCursor(null, 'prev');
        cursorRequest.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const link = cursor.value;
                if (link.filename.toLowerCase().includes(query) || link.link.toLowerCase().includes(query)) {
                    filteredLinks.push(link);
                }
                cursor.continue();
            } else {
                linkList.innerHTML = '';
                filteredLinks.reverse().forEach(addLink);
            }
        };
    });

	/** @type {HTMLDivElement} */
	const linkList = document.createElement('div');
    linkList.classList.add('cz-links');
    historyDiv.append(linkList);

    linkList.addEventListener('scroll', () => {
        if (linkList.scrollTop + linkList.clientHeight >= linkList.scrollHeight - 10) {
            loadLinks();
        }
    });

    /** @returns {void} */
    function initDownloaderUI() {
        if (initialized) return;
        initialized = true;

        const observer = new MutationObserver(() => {
            const pdiv = document.querySelector('.right-side > div');
            if (!pdiv) return;
            pdiv.appendChild(historyDiv);
            loadLinks();
            observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    // ----- CSS Injection -----
    const style = `
        /* ----- Variables ----- */
        :root {
            --bg-dark: #393e47;
            --bg-light: #2a2e33;
            --bg-header: #1b1e22;
            --bg-track: #2d3139;
            --scrollbar-thumb: #393e47;
            --text-light: white;
            --border-color: #363b45;
        }

        /* ----- General Styles ----- */
        .cz-history {
            padding: 0 15px;
        }

        .cz-search {
            background: transparent;
            border: none;
            outline: none;
            width: 100%;
            font-size: 16px;
        }

        .cz-links {
            max-height: 200px;
            padding-right: 5px;
            overflow-y: auto;
        }

        .cz-links::-webkit-scrollbar {
            width: 10px;
        }

        .cz-links::-webkit-scrollbar-track {
            background-color: var(--bg-track);
            border-radius: 8px;
        }

        .cz-links::-webkit-scrollbar-thumb {
            background-color: var(--scrollbar-thumb);
            border-radius: 8px;
        }

        .cz-wrapper {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 75%;
            background-color: var(--bg-dark);
            border-radius: 6px;
            z-index: 9999;
            color: var(--text-light);
            box-shadow: 0 0 10px rgba(0, 0, 0, .6);
            overflow: hidden;
            transition: width .3s ease, left .3s ease, bottom .3s ease, opacity .1s ease;
        }

        @media (max-width: 768px) {
            .cz-wrapper {
                width: 100%;
                left: 0;
                bottom: 0;
                transform: translateX(0);
                border-radius: 0;
            }
        }

        /* ----- Header Styles ----- */
        .cz-wrapper-header {
            background-color: var(--bg-header);
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            font-weight: bold;
            font-size: 1.6rem;
        }

        .cz-wrapper-header button {
            background: none;
            border: none;
            color: var(--text-light);
            font-size: 16px;
            cursor: pointer;
        }

        /* ----- Body Styles ----- */
        .cz-wrapper-body {
            padding: 20px;
            background-color: var(--bg-light);
            box-shadow: 0 2px 10px rgba(0, 0, 0, .1);
        }

        /* ----- Link Styles ----- */
        .cz-link {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 2px;
            padding: 4px;
            cursor: pointer;
            border-top: 1px solid var(--border-color);
            user-select: none;
            transition: background-color .1s ease-in;
        }

        .cz-link:hover {
            background-color: var(--scrollbar-thumb);
        }

        .cz-file {
            display: flex;
            align-items: center;
            gap: 2px;
        }

        .cz-filename {
            display: block;
            max-width: 130px;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
        }

        .cz-time {
            font-size: 11px;
        }

        /* ----- Detail Row Styles ----- */
        .cz-detail-row {
            display: flex;
            margin-bottom: 12px;
        }

        .cz-detail-label {
            font-weight: bold;
            width: 120px;
        }

        .cz-delete-btn {
            background-color: #a94442;
            border: none;
            border-radius: 4px;
            padding: 2px 4px;
            transition: background-color .2s ease;
        }

        .cz-delete-btn:hover {
            background-color: #853331;
        }

        .cz-detail-value {
            word-wrap: break-word;
            max-width: 80%;
        }

        .cz-detail-value a {
            text-decoration: none;
        }
    `;

    const css = document.createElement('style');
    css.innerHTML = style;
    document.head.append(css);
})();
