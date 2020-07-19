///<reference path="pins.ts" />
///<reference path="pin.ts" />
///<reference path="options.ts" />
///<reference path="connector.ts" />
///<reference path="shared-functions.ts" />
"use strict";
declare let chrome: any;
let pins: Pins;
let options: Options;
let waitForOpenedPopup = false;

// (browser as any).contextMenus is necessary since Firefox renamed their api to browser.menus...
browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.runtime.onStartup.addListener(handleStartup);
browser.alarms.onAlarm.addListener(onCheckUpdate);

browser.alarms.create("checkUpdate", {
    periodInMinutes: 5,
});

onWakeUp(); // Differs from handleStartup as this also needs to run when the event page refreshes

async function onWakeUp() {
    options = await Options.getObject();
    // browser.runtime... has a bug where sendResponse does not work currently as of July 2017
    // That is possibly caused by browser-polyfill
    // October 2017: It works with browser.runtime, if a promise is returned
    // from the listener instaed of using sendResponse
    browser.runtime.onMessage.addListener(handleMessage);
    browser.storage.onChanged.addListener(handleStorageChanged);
    browser.tabs.onUpdated.addListener(handleTabUpdated);
    browser.bookmarks.onCreated.addListener(handleBookmarkCreated);
    browser.commands.onCommand.addListener(handleCommand);
    (browser as any).contextMenus.onClicked.addListener(handleContextMenuClick);
    pins = await Pins.updateList();
}

async function handleStartup() {
    // Provide help text to the user.
    browser.omnibox.setDefaultSuggestion({
        description: `Search your pinboard bookmarks`,
    });
    (browser as any).contextMenus.create({
        contexts: ["link"],
        id: "linkAddToToRead",
        title: "Add to To Read",
    });
    (browser as any).contextMenus.create({
        contexts: ["browser_action", "page"], // chrome can't do context type "tab" yet as of July 2017
        id: "tabAddToToRead",
        title: "Add page to To Read",
    });
    browser.browserAction.setBadgeBackgroundColor({ color: "#333" });

}

async function handleCommand(command: string) {
    if(command === "create_bookmark") {
        await browser.browserAction.openPopup();
        waitForOpenedPopup = true;
    } else if (command === "execute_sidebar_action") {
        // toggle gives an error with the current type definition, but it works.
        (browser.sidebarAction as any).toggle();
    }
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

async function handleContextMenuClick(info: browser.menus.OnClickData, tab: browser.tabs.Tab) {
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
            browser.browserAction.setBadgeText({ text: "\u{2713}", tabId: t.id });
        } else {
            browser.browserAction.setBadgeText({ text: "", tabId: t.id });
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
    if (changeInfo.hasOwnProperty("status") && changeInfo.status === "loading") {
        checkDisplayBookmarked(tab);
    }
}

async function handleMessage(request: any, sender: browser.runtime.MessageSender) {
    if (request.callFunction === "checkDisplayBookmarked") {
        checkDisplayBookmarked();
        return;
    } else if (request.callFunction === "saveBookmark") {
        const pin = Pin.fromObject(request.pin);
        if (pins === undefined) {
            pins = await Pins.updateList();
        }
        pins.addPin(pin);
        checkDisplayBookmarked();
        return pin.save();
    } else if (request.callFunction === "forceUpdatePins") {
        pins = await Pins.updateList(true);
        return "OK";
    } else if (request.callFunction === "deleteBookmark") {
        const pin = Pin.fromObject(request.pin);
        const response = await pin.delete();
        pins.delete(pin.url);
        checkDisplayBookmarked();
        return "OK";
    } else if (request.callFunction === "showErrorBadge") {
        SharedFunctions.showErrorBadge(request.error);
    } else if (request.callFunction === "hideErrorBadge") {
        SharedFunctions.hideErrorBadge();
    } else if (request.callFunction === "popupOpened" && waitForOpenedPopup) {
        browser.runtime.sendMessage({"callFunction": "createBookmark"});
        waitForOpenedPopup = false;
    }
}
