///<reference path="pins.ts" />
///<reference path="pin.ts" />
///<reference path="options.ts" />
///<reference path="connector.ts" />
///<reference path="shared-functions.ts" />
"use strict";
declare let chrome: any;
let pins: Pins;
let options: Options;

browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.runtime.onStartup.addListener(handleStartup);
browser.alarms.onAlarm.addListener(onCheckUpdate);

browser.alarms.create("checkUpdate", {
    periodInMinutes: 5,
});

async function handleStartup() {
    options = await Options.getObject();
    chrome.runtime.onMessage.addListener(handleMessage);
    // browser.runtime... has a bug where sendResponse does not work currently as of July 2017
    // That is possibly caused by browser-polyfill
    browser.storage.onChanged.addListener(handleStorageChanged);
    browser.tabs.onUpdated.addListener(handleTabUpdated);
    browser.bookmarks.onCreated.addListener(handleBookmarkCreated);

    // Provide help text to the user.
    browser.omnibox.setDefaultSuggestion({
        description: `Search your pinboard bookmarks`,
    });
    browser.contextMenus.create({
        contexts: ["link"],
        id: "linkAddToToRead",
        title: "Add to To Read",
    });
    browser.contextMenus.create({
        contexts: ["browser_action", "page"], // chrome can't do context type "tab" yet as of July 2017
        id: "tabAddToToRead",
        title: "Add page to To Read",
    });
    browser.browserAction.setBadgeBackgroundColor({color: "#333"});
    browser.contextMenus.onClicked.addListener(handleContextMenuClick);
    pins = await Pins.updateList();
}

async function onCheckUpdate(alarm: browser.alarms.Alarm) {
    if (alarm.name === "checkUpdate") {
        pins = await Pins.updateList();
    }
}

function handleBookmarkCreated(id: string, bookmark: browser.bookmarks.BookmarkTreeNode) {
    if (!options.saveBrowserBookmarks) {
        return;
    }
    if (!!bookmark.url && bookmark.url !== "") {
        const pin = new Pin(bookmark.url, bookmark.title, undefined, new Date().toISOString());
        pins.addPin(pin);
        pin.save();
    }
}

async function handleContextMenuClick(info: browser.contextMenus.OnClickData, tab: browser.tabs.Tab) {
    let pin: Pin;
    switch (info.menuItemId) {
        case "linkAddToToRead":
            const result = await browser.tabs.executeScript(undefined, {
                allFrames: true,
                code: "document.activeElement.textContent.trim();",
            });
            pin = new Pin(info.linkUrl, String(result[0]), undefined, undefined,
                "Found on " + info.pageUrl, "yes", "no");
            pins.addPin(pin);
            pin.save();
            checkDisplayBookmarked();
            break;
        case "tabAddToToRead":
            const title = SharedFunctions.executeTitleRegex(tab.title, options.titleRegex);
            pin = new Pin(tab.url, title, undefined, undefined, undefined, "yes", "no");
            pins.addPin(pin);
            pin.save();
            checkDisplayBookmarked();
    }
}

async function handleAddonInstalled() {
    handleStartup();
}

async function handleStorageChanged(changes: browser.storage.ChangeDict, area: browser.storage.StorageName) {
    if (Object.keys(changes).includes("apikey")) {
        pins = await Pins.updateList(true);
    } else if (Object.keys(changes).includes("pins")) {
        pins = await Pins.getObject();
        checkDisplayBookmarked();
    } else if (Object.keys(changes).includes("options")) {
        options = await Options.getObject();
    }
}

async function checkDisplayBookmarked(tab?: browser.tabs.Tab) {
    function checkExists(t: browser.tabs.Tab) {
        if (!!pins && pins.has(t.url) && options.changeActionbarIcon) {
            browser.browserAction.setBadgeText({text: "\u{2713}", tabId: t.id});
        } else {
            browser.browserAction.setBadgeText({text: "", tabId: t.id});
        }
    }

    if (tab === undefined) {
        const tabs = await (browser.tabs.query({}));
        for (const t of tabs) {
            checkExists(t);
        }
    } else {
        checkExists(tab);
    }
}

function handleTabUpdated(tabId: number, changeInfo: any, tab: browser.tabs.Tab) {
    if (!options.changeActionbarIcon) {
        return;
    }
    if (changeInfo.status === "loading") {
        checkDisplayBookmarked(tab);
    }
}

function handleMessage(request: any, sender: browser.runtime.MessageSender, sendResponse: any) {
    // Not async because it needs to return true in order for the message port to stay open
    if (request.callFunction === "checkDisplayBookmarked" && !!request.url) {
        browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
            const tab = tabs[0];
            checkDisplayBookmarked();
        });
        return true;
    }  else if (request.callFunction === "saveBookmark") {
        const pin = Pin.fromObject(request.pin);
        pins.addPin(pin);
        checkDisplayBookmarked();
        pin.save().then((resp) => {
            sendResponse(resp);
        });
        return true;
    } else if (request.callFunction === "forceUpdatePins") {
        Pins.updateList(true).then((p) => {
            pins = p;
            sendResponse("OK");
        });
        return true;
    } else if (request.callFunction === "deleteBookmark") {
        const pin = Pin.fromObject(request.pin);
        const response = pin.delete().then(() => {
            pins.delete(pin.url);
            checkDisplayBookmarked();
            sendResponse("OK");
        });
        return true;
    } else if (request.callFunction === "getTagSuggestions") {
        Connector.suggestTags(request.url).then((suggestions) => {
            sendResponse(suggestions);
        });
        return true;
    } else if (request.callFunction === "showErrorBadge") {
        SharedFunctions.showErrorBadge(request.error);

    } else if (request.callFunction === "hideErrorBadge") {
        SharedFunctions.hideErrorBadge();
    }
}
