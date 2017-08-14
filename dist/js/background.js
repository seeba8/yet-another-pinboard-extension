var pins;
var apikey = "";
let defaultOptions = {
    "urlPrefix": "u",
    "tagPrefix": "t",
    "titlePrefix": "n",
    "toReadPrefix": "r",
    "showBookmarked": true,
    "changeActionbarIcon": true,
    "saveBrowserBookmarks": false,
    "sharedByDefault": false
};
let options = defaultOptions;
// Listeners
//browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.runtime.onStartup.addListener(handleStartup);
browser.alarms.create("checkUpdate", {
    periodInMinutes: 5,
});
browser.alarms.onAlarm.addListener(onCheckUpdate);
// Update the pins on startup of the browser
function handleStartup() {
    chrome.runtime.onMessage.addListener(handleMessage); // browser.runtime... has a bug where sendResponse does not work currently as of July 2017
    // That is possibly caused by browser-polyfill
    browser.storage.onChanged.addListener(handleStorageChanged);
    browser.tabs.onUpdated.addListener(handleTabUpdated);
    browser.bookmarks.onCreated.addListener(handleBookmarkCreated);
    // Provide help text to the user.
    browser.omnibox.setDefaultSuggestion({
        description: `Search your pinboard bookmarks`
    });
    browser.contextMenus.create({
        "id": "linkAddToToRead",
        "title": "Add to To Read",
        "contexts": ["link"]
    });
    browser.contextMenus.create({
        "id": "tabAddToToRead",
        "title": "Add page to To Read",
        "contexts": ["browser_action", "page"] // chrome can't do context type "tab" yet as of July 2017
    });
    browser.browserAction.setBadgeBackgroundColor({ color: "#333" });
    browser.contextMenus.onClicked.addListener(handleContextMenuClick);
    loadOptions();
    updatePinData(false);
}
function onCheckUpdate(alarm) {
    if (alarm.name === "checkUpdate") {
        updatePinData(false);
    }
}
function handleBookmarkCreated(id, bookmark) {
    if (!options.saveBrowserBookmarks) {
        return;
    }
    if (!!bookmark.url && bookmark.url != "") {
        //console.log(bookmark);
        let pin = {
            "url": bookmark.url,
            "description": bookmark.title,
            "time": new Date().toISOString()
        };
        saveBookmark(pin, true);
    }
}
async function handleContextMenuClick(info, tab) {
    switch (info.menuItemId) {
        case "linkAddToToRead":
            let result = await browser.tabs.executeScript(undefined, {
                allFrames: true,
                code: "document.activeElement.textContent.trim();"
            });
            saveBookmark({
                url: info.linkUrl,
                description: result[0],
                extended: "Found on " + info.pageUrl,
                toread: "yes",
                shared: "no"
            }, true);
            break;
        case "tabAddToToRead":
            saveBookmark({
                url: tab.url,
                description: tab.title,
                toread: "yes",
                shared: "no"
            }, true);
    }
}
async function handleAddonInstalled() {
    let token = await browser.storage.local.get(["options", "lastsync", "lastupdate"]);
    if (!token.hasOwnProperty("options")) {
        token.options = defaultOptions;
        options = defaultOptions;
        token.lastsync = "";
        token.lastupdate = "";
        browser.storage.local.set(token);
    }
    handleStartup();
}
async function loadOptions() {
    let res = await browser.storage.local.get("options");
    if (!res.options) {
        options = defaultOptions;
    }
    else {
        options = res.options;
    }
    loadApiKey();
}
async function loadApiKey() {
    let res = (await browser.storage.local.get("apikey")).apikey;
    if (typeof res !== "undefined") {
        apikey = res;
        if (apikey == "") {
            pins = new Map();
        }
    }
}
// Only update pin data when the api key was modified
function handleStorageChanged(changes, area) {
    if (Object.keys(changes).includes("apikey")) {
        loadApiKey().then(() => {
            updatePinData(true);
        });
        //console.log("update pin data");
    }
    else if (Object.keys(changes).includes("pins")) {
        updatePinVariable();
    }
    else if (Object.keys(changes).includes("options")) {
        loadOptions();
    }
}
async function updatePinVariable() {
    let res = (await browser.storage.local.get("pins")).pins;
    pins = new Map(res);
}
// Reloads all bookmarks from pinboard. Should be optimized to get a delta...
// Should listen to return codes
async function updatePinData(forceUpdate) {
    let token = await browser.storage.local.get(["lastupdate", "lastsync", "pins"]);
    // Plus 5 at the end for buffer, in order for the alarm to trigger this usually.
    if (apikey == "" || (!forceUpdate && !!token.lastsync && new Date(token.lastsync) > new Date(Date.now() - 1000 * 60 * 5 + 5))) {
        updatePinVariable();
        return;
    }
    let lastUpdate = await connector.getLastUpdate();
    // To compare Dates: https://stackoverflow.com/a/493018
    if (!forceUpdate && !!token.pins && token.pins.length > 0 && !!token.lastupdate &&
        new Date(token.lastupdate).getTime() == lastUpdate.getTime()) {
        //console.log("Not syncing, no update available");
        updatePinVariable();
        return;
    }
    // console.log("Loading pins from scratch!");
    setTimeout(sendRequestAllPins, 1000 * 3, lastUpdate);
}
async function sendRequestAllPins(lastUpdate) {
    let pinsMap = new Map();
    let json = await connector.getAllPins();
    json.forEach((pin) => {
        pinsMap.set(pin.href, {
            url: pin.href,
            description: pin.description,
            tags: pin.tags,
            time: pin.time,
            toread: pin.toread,
            extended: pin.extended,
            shared: pin.shared
        });
    });
    browser.storage.local.set({ pins: Array.from(pinsMap.entries()) });
    pins = new Map(Array.from(pinsMap.entries()));
    browser.storage.local.set({ lastupdate: lastUpdate.getTime() });
    browser.storage.local.set({ lastsync: new Date().getTime() });
    /* catch (e) {
         // Not valid Json, maybe pinboard is down? Nothing to do.
         setTimeout(updatePinData,nextErrorTimeout);
         nextErrorTimeout *= 2;
         return;
     }*/
}
function checkDisplayBookmarked(url, tabId) {
    if (!!pins && pins.has(url) && options.changeActionbarIcon) {
        browser.browserAction.setBadgeText({ text: "\u{2713}", tabId: tabId });
    }
    else {
        browser.browserAction.setBadgeText({ text: "", tabId: tabId });
    }
}
function handleTabUpdated(tabId, changeInfo, tab) {
    if (!options.changeActionbarIcon) {
        return;
    }
    if (changeInfo.status == "loading") {
        checkDisplayBookmarked(tab.url, tabId);
    }
}
async function handleMessage(request, sender, sendResponse) {
    if (request.callFunction == "checkDisplayBookmarked" && !!request.url) {
        let tabs = await (browser.tabs.query({ currentWindow: true, active: true }));
        let tab = tabs[0];
        checkDisplayBookmarked(request.url, tab.id);
        return true;
    }
    else if (request.callFunction == "saveBookmark") {
        let resp = await saveBookmark(request.pin, request.isNewPin);
        if (typeof sendResponse == "function") {
            sendResponse(resp);
        }
        return true;
    }
    else if (request.callFunction == "forceUpdatePins") {
        updatePinData(true);
        if (typeof sendResponse == "function") {
            sendResponse("OK");
        }
        return true;
    }
    else if (request.callFunction == "deleteBookmark") {
        let rsponse = await connector.deletePin(request.pin);
        if (typeof request.pin === "string") {
            pins.delete(request.pin);
        }
        else {
            if (request.pin.hasOwnProperty("url")) {
                pins.delete(request.pin.url);
            }
            else {
                pins.delete(request.pin.url);
            }
        }
        let tabs = await browser.tabs.query({ currentWindow: true, active: true });
        let tab = tabs[0];
        checkDisplayBookmarked(request.pin.url, tab.id);
        browser.storage.local.set({ "pins": Array.from(pins.entries()) });
    }
    else if (request.callFunction == "getTagSuggestions") {
        let suggestions = connector.suggestTags(request.url);
        //console.log(suggestions);
        sendResponse(suggestions);
        return true;
    }
}
function addNewPinToMap(pin) {
    let temp = new Map();
    temp.set(pin.url, pin);
    pins = new Map(function* () { yield* temp; yield* pins; }()); //Adds the new entry to the beginning of the map
    // See e.g. https://stackoverflow.com/a/32001750
}
async function saveBookmark(pin, isNewPin) {
    let json = await connector.addPin(pin);
    if (json.result_code == "done") {
        if (isNewPin) {
            addNewPinToMap(pin);
        }
        else {
            pins.set(pin.url, pin);
        }
        browser.storage.local.set({ "pins": Array.from(pins.entries()) });
        // Update the button in case the site is bookmarked and the setting is active
        let tabs = await browser.tabs.query({ currentWindow: true, active: true });
        let tab = tabs[0];
        checkDisplayBookmarked(pin.url, tab.id);
        return "done";
    }
    else {
        //console.log("Error. Reply was not 'done'");
        throw "Oops";
    }
}
//# sourceMappingURL=background.js.map