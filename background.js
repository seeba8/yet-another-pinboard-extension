var pins;
var options = {};
var apikey = "";
const MIN_ERR_TIMEOUT = 1000 * 60;
var nextErrorTimeout = MIN_ERR_TIMEOUT;

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
    if(!options.saveBrowserBookmarks) {
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
        "saveBrowserBookmarks": false
    };
    browser.storage.local.set({
        "options": options,
        "lastsync": "",
        "lastupdate": ""
    });
}
// Update the pins on startup of the browser
function handleStartup() {
    loadOptions();
    updatePinData();
}

function loadOptions() {
    browser.storage.local.get("options").then((res) => {
        if(!res.options) {
            handleAddonInstalled();
        }
        options = res.options;
        if (options.changeActionbarIcon) {
            browser.browserAction.setIcon({
                path: {
                    16: "img/pinboard-icon-grey.svg",
                    32: "img/pinboard-icon-grey.svg"
                }
            });
        }
        else {
            browser.browserAction.setIcon({
                path: {
                    16: "img/pinboard-icon.svg",
                    32: "img/pinboard-icon.svg"
                }
            });
        }
    });
    loadApiKey();
}

function loadApiKey() {
    browser.storage.local.get("apikey").then((res) => {
        if (typeof res.apikey != "undefined" && !!res.apikey && res.apikey != "") {
            apikey = res.apikey;
        }
    });
}

// Only update pin data when the api key was modified
function handleStorageChanged(changes, area) {
    if (Object.keys(changes).includes("apikey")) {
        loadApiKey();
        //console.log("update pin data");
        updatePinData();
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

function getLastUpdateTime() {
    
}

// Reloads all bookmarks from pinboard. Should be optimized to get a delta...
// Should listen to return codes
function updatePinData() {
    let headers = new Headers({ "Accept": "application/json" });
    let init = { method: 'GET', headers };
    browser.storage.local.get(["lastupdate", "lastsync", "pins"]).then((token) => {
        if (apikey == "" || (!!token.lastsync && new Date(token.lastsync) > Date.now() - 1000 * 60 * 5)) {
            //console.log("Not syncing, either no API key or last sync less than 5 minutes ago.");
            updatePinVariable();
            return;
        }
        let lastUpdate = getLastUpdateTime();
        let request = new Request("https://api.pinboard.in/v1/posts/update?auth_token=" + apikey + "&format=json", init);
        fetch(request)
            .then((response) => { return response.json(); })
            .then((json) => {
                lastUpdate = Date(json.update_time);
                //console.log(lastUpdate);
                if (!lastUpdate) {
                    //console.log("firstException");
                    setTimeout(updatePinData, nextErrorTimeout);
                    nextErrorTimeout *= 2;
                    return;
                }
                else {
                    nextErrorTimeout = MIN_ERR_TIMEOUT;
                }
                //pins.length, because we are in the token, where the pins are stored as Array, not Map
                if (!!token.pins && token.pins.length > 0 && !!token.lastupdate && new Date(token.lastupdate) == lastUpdate) {
                    //console.log("Not syncing, no update available");
                    updatePinVariable();
                    return;
                }
                //console.log("Loading pins from scratch!");
                setTimeout(sendRequestAllPins, 1000 * 3, lastUpdate);
            }); 
        
        // Optimisation does not work (?) because updated pins are not included in the &fromdt timestamp thing 
        // It looks at pin creation time
        // Maybe some other optimisation would be possible, who knows
        /*else {
            request = new Request("https://api.pinboard.in/v1/posts/all?auth_token=" + apikey + "&format=json&fromdt=" +
                new Date(token.lastupdate).toISOString(), init);
        }*/
    });
}

function sendRequestAllPins(lastUpdate) {
    let request = null;
    let headers = new Headers({ "Accept": "application/json" });
    let init = { method: 'GET', headers };
    request = new Request("https://api.pinboard.in/v1/posts/all?auth_token=" + apikey + "&format=json", init);
    fetch(request)
        .then((response) => { return response.json(); })
        .then((json) => {
            let pinsMap = new Map();
            json.forEach((pin) => {
                pinsMap.set(pin.href, {
                    href: pin.href,
                    description: pin.description,
                    tags: pin.tags,
                    time: pin.time,
                    toread: pin.toread,
                    extended: pin.extended
                });
            });
            browser.storage.local.set({ pins: Array.from(pinsMap.entries()) });
            pins = new Map(Array.from(pinsMap.entries()));
            //console.log("Sync successful, pins updated");
            browser.storage.local.set({ lastupdate: lastUpdate });
            browser.storage.local.set({ lastsync: Date.now() });
            nextErrorTimeout = MIN_ERR_TIMEOUT;
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
                    16: "img/pinboard-icon-blue.svg",
                    32: "img/pinboard-icon-blue.svg"
                },
                tabId: tabId
            });
        }
    }
    else {
        if (options.changeActionbarIcon) {
            browser.browserAction.setIcon({
                path: {
                    16: "img/pinboard-icon-grey.svg",
                    32: "img/pinboard-icon-grey.svg"
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
        browser.tabs.query({ active: true }, (tab) => {
            tab = tab[0];
            checkDisplayBookmarked(request.url, tab.id);
        });
    }
    else if (request.callFunction == "saveBookmark") {
        sendResponse(saveBookmark(request.pin, request.isNewPin));
    }
}

function saveBookmark(pin, isNewPin) {
    let headers = new Headers({ "Accept": "application/json" });
    let init = { method: 'GET', headers };
    let r = "https://api.pinboard.in/v1/posts/add/?auth_token=" + apikey +
        "&url=" + encodeURIComponent(pin.href) + "&format=json";
    if (!!pin.description) {
        r += "&description=" + encodeURIComponent(pin.description);
    }
    if (!!pin.tags) {
        r += "&tags=" + encodeURIComponent(pin.tags);
    }
    if (!!pin.toread) {
        r += "&toread=" + pin.toread;
    }
    let request = new Request(r, init);
    fetch(request)
        .then((response) => {
            if (response.status == 200 && response.ok) {
                return response.json();
            }
        })
        .then(json => {
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
                browser.runtime.sendMessage({
                    callFunction: "checkDisplayBookmarked",
                    url: pin.href
                });
                return "done";

            }
            else {
                //console.log("Error. Reply was not 'done'");
            }
        });
}
