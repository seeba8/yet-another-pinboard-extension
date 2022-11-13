import type { Browser, Alarms, Menus, Bookmarks, Tabs, Storage, Runtime } from "webextension-polyfill";
import { addPin, deletePin, getAllPins, getLastUpdate } from "./connector.js";
declare let browser: Browser;

import { Options } from "./options.js";
import { Pin, PinData } from "./pin.js";
import { Pins } from "./pins.js";
import { executeTitleRegex } from "./shared-functions.js";

export let pins: Pins;
export let options: Options;

declare type MessageRequest = {
    callFunction: string,
    pin?: PinData,
    error?: string,
};

let waitForOpenedPopup = false;
let backendPort: Runtime.Port;
browser.runtime.onConnect.addListener((port) => {
    if (port.name === "backend") {
        backendPort = port;
        backendPort.onMessage.addListener(handlePortMessage);
    }
})

browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.runtime.onStartup.addListener(handleStartup);
browser.alarms.onAlarm.addListener(onCheckUpdate);


browser.alarms.create("checkUpdate", {
    periodInMinutes: 5,
});

onWakeUp(); // Differs from handleStartup as this also needs to run when the event page refreshes

async function onWakeUp() {
    options = await Options.getObject();
    browser.storage.onChanged.addListener(handleStorageChanged);
    browser.tabs.onUpdated.addListener(handleTabUpdated);
    browser.bookmarks.onCreated.addListener(handleBookmarkCreated);
    browser.commands.onCommand.addListener(handleCommand);
    browser.contextMenus.onClicked.addListener(handleContextMenuClick);
    pins = await updateList();
}

async function handleStartup() {
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
    browser.browserAction.setBadgeBackgroundColor({ color: "#333" });

}

async function handleCommand(command: string) {
    if (command === "create_bookmark") {
        await browser.browserAction.openPopup();
        waitForOpenedPopup = true;
    } else if (command === "execute_sidebar_action") {
        // toggle gives an error with the current type definition, but it works.
        browser.sidebarAction.toggle();
    }
}

async function onCheckUpdate(alarm: Alarms.Alarm) {
    if (alarm.name === "checkUpdate") {
        pins = await updateList();
    }
}

function handleBookmarkCreated(id: string, bookmark: Bookmarks.BookmarkTreeNode) {
    if (!options.saveBrowserBookmarks) {
        return;
    }
    if (!!bookmark.url && bookmark.url !== "") {
        const pin = new Pin(bookmark.url, bookmark.title, undefined, new Date().toISOString());
        pins.addPin(pin);
        addPin(pin);
    }
}

async function handleContextMenuClick(info: Menus.OnClickData, tab: Tabs.Tab) {
    let pin: Pin;
    switch (info.menuItemId) {
        case "linkAddToToRead": {
            const result = await browser.tabs.executeScript(undefined, {
                allFrames: true,
                code: "document.activeElement.textContent.trim();",
            });
            pin = new Pin(info.linkUrl, String(result[0]), undefined, undefined,
                "Found on " + info.pageUrl, "yes", "no");
            pins.addPin(pin);
            addPin(pin);
            checkDisplayBookmarked();
            break;
        }
        case "tabAddToToRead": {
            const title = executeTitleRegex(tab.title, options.titleRegex);
            pin = new Pin(tab.url, title, undefined, undefined, undefined, "yes", "no");
            pins.addPin(pin);
            addPin(pin);
            checkDisplayBookmarked();
            break;
        }
    }
}

async function handleAddonInstalled() {
    handleStartup();
}

async function handleStorageChanged(changes: Record<string, Storage.StorageChange>) {
    if (Object.keys(changes).includes("apikey")) {
        pins = await updateList(true);
    } else if (Object.keys(changes).includes("pins")) {
        pins = await Pins.getObject();
        checkDisplayBookmarked();
    } else if (Object.keys(changes).includes("options")) {
        options = await Options.getObject();
    }
}

export async function checkDisplayBookmarked(tab?: Tabs.Tab) {
    function checkExists(t: Tabs.Tab) {
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

function handleTabUpdated(tabId: number, changeInfo: Tabs.OnUpdatedChangeInfoType, tab: Tabs.Tab) {
    if (!options.changeActionbarIcon) {
        return;
    }
    if (changeInfo?.status === "loading") {
        checkDisplayBookmarked(tab);
    }
}

async function handlePortMessage(message: MessageRequest, port: Runtime.Port) {
    if (pins === undefined) {
        pins = await updateList();
    }
    switch (message.callFunction) {
        case "deletePin": {
            const pin = Pin.fromObject(message.pin);
            pins.delete(pin.url);
            const response = await deletePin(Pin.fromObject(message.pin));
            port.postMessage(response);
            checkDisplayBookmarked();
            break;
        }
        case "savePin": {
            const pin = Pin.fromObject(message.pin);
            pins.addPin(pin);
            const response = await addPin(pin);
            port.postMessage(response);
            break;
        }
        case "forceUpdatePins": {
            pins = await updateList(true);
            break;
        }
        case "popupOpened": {
            if (waitForOpenedPopup) {
                browser.runtime.sendMessage({ "callFunction": "createBookmark" });
                waitForOpenedPopup = false;
            }
            break;
        }
    }
}

async function updateList(forceUpdate = false): Promise<Pins> {
    const token = await browser.storage.local.get(["apikey", "pins"]) as { apikey: string, pins: PinData[] };
    if (token?.apikey === "") {
        return new Pins();
    }
    const lastSync = await getStoredLastSync();
    // Plus 5 at the end for buffer, in order for the alarm to trigger this usually.
    if (!forceUpdate && lastSync.getTime() > new Date(Date.now() - 1000 * 60 * 5 + 5).getTime()) {
        // Not forced and last sync less than 5 minutes ago, therefore we just get the stored object
        return Pins.getObject();
    }
    const lastUpdate = await getLastUpdate();
    const storedLastUpdate = await getStoredLastUpdate();
    // To compare Dates: https://stackoverflow.com/a/493018
    if (!forceUpdate && token?.pins?.length > 0 && storedLastUpdate.getTime() === lastUpdate.getTime()) {
        // Pinboard's last update is the same as the one stored, and the pins Array is non-empty
        // therefore we just get the stored object
        return Pins.getObject();

    }
    return sendRequestAllPins(lastUpdate);
}

/**
     * Requests all pins from pinboard
     * @param lastUpdate Timestamp of the last update requested before,
     * so the storage can be updated if it was successful
     */
async function sendRequestAllPins(lastUpdate): Promise<Pins> {
    const pins = new Pins();
    const json = await getAllPins();
    json.reverse().forEach((pin) => {
        pins.set(pin.href, new Pin(
            // pinboard API gets pin with attribute href, and addPin wants url. so we standardise to url
            pin.href,
            pin.description,
            pin.tags,
            pin.time,
            pin.extended,
            pin.toread,
            pin.shared));
    });
    pins.saveToStorage();
    browser.storage.local.set({ lastupdate: lastUpdate.getTime() });
    browser.storage.local.set({ lastsync: new Date().getTime() });
    return pins;
}

async function getStoredLastSync(): Promise<Date> {
    const token = await browser.storage.local.get("lastsync") as { lastsync: any };
    if (Object.prototype.hasOwnProperty.call(token, "lastsync")) {
        return new Date(token.lastsync);
    }
    return new Date(0);
}
async function getStoredLastUpdate(): Promise<Date> {
    const token = await browser.storage.local.get("lastupdate") as { lastupdate: any };
    if (Object.prototype.hasOwnProperty.call(token, "lastupdate")) {
        return new Date(token.lastupdate);
    }
    return new Date(0);
}
