var pins;
var options = {};
var apikey = "";

// Listeners

//browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.runtime.onMessage.addListener(handleMessage);
browser.storage.onChanged.addListener(handleStorageChanged);

browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.bookmarks.onCreated.addListener(handleBookmarkCreated);

// Provide help text to the user.
browser.omnibox.setDefaultSuggestion({
    description: `Search your pinboard bookmarks`
});

handleStartup();

function handleBookmarkCreated(id, bookmark) {
    if (!options.saveBrowserBookmarks) {
        return;
    }
    if (!!bookmark.url && bookmark.url != "") {
        //console.log(bookmark);
        let pin = {
            "href": bookmark.url,
            "description": bookmark.title,
            "time": new Date().toISOString()
        };
        saveBookmark(pin, true);
    }
}

function handleAddonInstalled() {
    options = {
        "urlPrefix": "u",
        "tagPrefix": "t",
        "titlePrefix": "n",
        "toReadPrefix": "r",
        "showBookmarked": true,
        "changeActionbarIcon": true,
        "saveBrowserBookmarks": false,
        "sharedByDefault": false
    };
    browser.storage.local.set({
        "options": options,
        "lastsync": "",
        "lastupdate": ""
    });
    return options;
}
// Update the pins on startup of the browser
function handleStartup() {
    loadOptions();
    updatePinData(false);
}

function loadOptions() {
    browser.storage.local.get("options").then((res) => {
        if (!res.options) {
            options = handleAddonInstalled();
        }
        else {
            options = res.options;
        }
        if (!!options.changeActionbarIcon) {
            browser.browserAction.setIcon({
                path: {
                    16: "img/pinboard-grey-16.png",
                    19: "img/pinboard-grey-19.png",
                    32: "img/pinboard-grey-32.png",
                    38: "img/pinboard-grey-38.png",
                    64: "img/pinboard-grey-64.png"
                }
            });
        }
        else {
            browser.browserAction.setIcon({
                path: {
                    16: "img/pinboard-16.png",
                    32: "img/pinboard-32.png",
                    48: "img/pinboard-48.png",
                    96: "img/pinboard-96.png"
                }
            });
        }
    });
    loadApiKey();
}

function loadApiKey() {
    browser.storage.local.get("apikey").then((res) => {
        if (typeof res.apikey != "undefined" && !!res.apikey) {
            apikey = res.apikey;
        }
    });
}

// Only update pin data when the api key was modified
function handleStorageChanged(changes, area) {
    if (Object.keys(changes).includes("apikey")) {
        loadApiKey();
        //console.log("update pin data");
        updatePinData(false);
    }
    else if (Object.keys(changes).includes("pins")) {
        updatePinVariable();
    }
    else if (Object.keys(changes).includes("options")) {
        loadOptions();
    }
}

function updatePinVariable() {
    browser.storage.local.get("pins").then((res) => {
        pins = new Map(res["pins"]);
    });
}

// Reloads all bookmarks from pinboard. Should be optimized to get a delta...
// Should listen to return codes
function updatePinData(forceUpdate) {
    browser.storage.local.get(["lastupdate", "lastsync", "pins"]).then((token) => {
        if (apikey == "" || (!forceUpdate && !!token.lastsync && new Date(token.lastsync) > Date.now() - 1000 * 60 * 5)) {
            //console.log("Not syncing, either no API key or last sync less than 5 minutes ago.");
            updatePinVariable();
            return;
        }
        connector.getLastUpdate()
            .then(lastUpdate => {
                if (!forceUpdate && !!token.pins && token.pins.length > 0 && !!token.lastupdate && new Date(token.lastupdate) == lastUpdate) {
                    //console.log("Not syncing, no update available");
                    updatePinVariable();
                    return;
                }
                //console.log("Loading pins from scratch!");
                setTimeout(sendRequestAllPins, 1000 * 3, lastUpdate);
            });

    });
}

function sendRequestAllPins(lastUpdate) {
    connector.getAllPins()
        .then((json) => {
            let pinsMap = new Map();
            json.forEach((pin) => {
                pinsMap.set(pin.href, {
                    href: pin.href,
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
            //console.log("Sync successful, pins updated");
            browser.storage.local.set({ lastupdate: lastUpdate.getTime() });
            browser.storage.local.set({ lastsync: new Date().getTime() });
        });
    /* catch (e) {
         // Not valid Json, maybe pinboard is down? Nothing to do.
         setTimeout(updatePinData,nextErrorTimeout);
         nextErrorTimeout *= 2;
         return;
     }*/
}

function checkDisplayBookmarked(url, tabId) {
    if (!!pins && pins.has(url)) {
        if (options.changeActionbarIcon) {
            browser.browserAction.setIcon({
                path: {
                    16: "img/pinboard-blue-16.png",
                    19: "img/pinboard-blue-19.png",
                    32: "img/pinboard-blue-32.png",
                    38: "img/pinboard-blue-38.png",
                    64: "img/pinboard-blue-64.png"
                },
                tabId: tabId
            });
        }
    }
    else {
        if (options.changeActionbarIcon) {
            browser.browserAction.setIcon({
                path: {
                    16: "img/pinboard-grey-16.png",
                    19: "img/pinboard-grey-19.png",
                    32: "img/pinboard-grey-32.png",
                    38: "img/pinboard-grey-38.png",
                    64: "img/pinboard-grey-64.png"
                },
                tabId: tabId
            });
        }
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

function handleMessage(request, sender, sendResponse) {
    //console.log(request);
    if (request.callFunction == "checkDisplayBookmarked" && !!request.url) {
        browser.tabs.query({ currentWindow: true, active: true }, (tab) => {
            tab = tab[0];
            checkDisplayBookmarked(request.url, tab.id);
        });
    }
    else if (request.callFunction == "saveBookmark") {
        saveBookmark(request.pin, request.isNewPin).then(resp => {
            if (typeof sendResponse == "function") {
                sendResponse(resp);
            }
        });
    }
    else if (request.callFunction == "forceUpdatePins") {
        updatePinData(true);
        if (typeof sendResponse == "function") {
            sendResponse("OK");
        }
    }
    else if (request.callFunction == "deleteBookmark") {
        connector.deletePin(request.pin).then(response => {
            if (typeof request.pin === "string") {
                pins.delete(request.pin);
            }
            else {
                if (request.pin.hasOwnProperty("href")) {
                    pins.delete(request.pin.href);
                }
                else {
                    pins.delete(request.pin.url);
                }
            }
            browser.storage.local.set({ "pins": Array.from(pins.entries()) });
            if (typeof sendResponse == "function") {
                sendResponse("OK");
            }
        });
    }
}

function saveBookmark(pin, isNewPin) {
    return new Promise((resolve, reject) => {
        connector.addPin(pin).then(json => {
            if (json.result_code == "done") {
                if (isNewPin) {
                    var temp = new Map();
                    temp.set(pin.href, pin);
                    pins = new Map(function* () { yield* temp; yield* pins; }()); //Adds the new entry to the beginning of the map
                    // See e.g. https://stackoverflow.com/a/32001750
                }
                else {
                    pins.set(pin.href, pin);
                }
                browser.storage.local.set({ "pins": Array.from(pins.entries()) });
                // Update the button in case the site is bookmarked and the setting is active
                checkDisplayBookmarked();
                resolve("done");
            }
            else {
                //console.log("Error. Reply was not 'done'");
                reject("Oops");
            }
        });
    });
}
