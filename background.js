if(typeof browser === "undefined") {
    browser = chrome;
}
var pins;
var options = {};
var apitoken = "";

// Listeners

//browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.runtime.onMessage.addListener(handleMessage);
browser.storage.onChanged.addListener(handleStorageChanged);
browser.omnibox.onInputChanged.addListener(handleInputChanged);
browser.omnibox.onInputEntered.addListener(handleInputEntered);
browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.bookmarks.onCreated.addListener(handleBookmarkCreated);

// Provide help text to the user.
browser.omnibox.setDefaultSuggestion({
    description: `Search your pinboard bookmarks`
});

handleStartup();

function handleBookmarkCreated(id, bookmark) {
    if(!!bookmark.url && bookmark.url != "") {
        console.log(bookmark);    
    }
}



function handleAddonInstalled() {
    options = {
        "urlPrefix": "u",
        "tagPrefix": "t",
        "titlePrefix": "n",
        "toReadPrefix": "r",
        "showBookmarked": true,
        "changeActionbarIcon": true
    };
    browser.storage.local.set({ 
        "options": options,
        "lastsync": "",
        "lastupdate": ""
    });
    browser.storage.local.get(null, (res) => {
        if (!!res.apikey && res.pins.size == 0) {
            updatePinData();
        }
        else if (!!res.pins && res.pins.size > 0) {
            updatePinVariable();
        }
    })
}
// Update the pins on startup of the browser
function handleStartup() {
    loadOptions();
    updatePinData();
}

function loadOptions() {
    browser.storage.local.get("options",(res) => {
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
    browser.storage.local.get("apikey", (res) => {
        if(typeof res.apikey != "undefined" && !!res.apikey && res.apikey != ""){
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
    browser.storage.local.get("pins",(res) => {
        pins = new Map(res["pins"]);
    });
}

function getLastUpdateTime() {
    let headers = new Headers({ "Accept": "application/json" });
    let init = { method: 'GET', headers };
    let request = new Request("https://api.pinboard.in/v1/posts/update?auth_token=" + apikey + "&format=json", init);
    fetch(request).then((response) => {
        response.json().then((json) => {
            return (Date(json.update_time));
        })
    });
}

// Reloads all bookmarks from pinboard. Should be optimized to get a delta...
// Should listen to return codes
function updatePinData() {
    browser.storage.local.get(["lastupdate", "lastsync", "pins"], (token) => {
        if (apikey == "" || (!!token.lastsync && new Date(token.lastsync) > Date.now() - 1000 * 60 * 10)) {
            //console.log("Not syncing, either no API key or last sync less than 10 minutes ago.");
            updatePinVariable();
            return;
        }
        let lastUpdate = getLastUpdateTime();
        //pins.length, because we are in the token, where the pins are stored as Array, not Map
        if (!!token.pins && token.pins.length > 0 && !!token.lastupdate && new Date(token.lastupdate) == lastUpdate) {
            //console.log("Not syncing, no update available");
            updatePinVariable();
            return;
        }
        let request = null;
        let headers = new Headers({ "Accept": "application/json" });
        let init = { method: 'GET', headers };
        //pins.length, because we are in the token, where the pins are stored as Array, not Map
        if (!!token.lastupdate || token.lastupdate == "" || token.pins.length == 0) {
            request = new Request("https://api.pinboard.in/v1/posts/all?auth_token=" + apikey + "&format=json", init);
                console.log("Loading pins from scratch!");
        }
        // Optimisation does not work (?) because updated pins are not included in the &fromdt timestamp thing 
        // It looks at pin creation time
        // Maybe some other optimisation would be possible, who knows
        /*else {
            request = new Request("https://api.pinboard.in/v1/posts/all?auth_token=" + apikey + "&format=json&fromdt=" +
                new Date(token.lastupdate).toISOString(), init);
        }*/
        browser.storage.local.set({lastsync: Date.now()});
        fetch(request).then((response) => {
            response.json().then((json) => {
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
                pins = pinsMap;
                request = new Request("https://api.pinboard.in/v1/posts/update?auth_token=" + apikey + "&format=json", init);
                fetch(request).then((response) => {
                    response.json().then((json) => {
                        browser.storage.local.set({lastupdate: Date(json.update_time)});
                    });
                });
                //console.log("Sync successful, pins updated");
            });
        });
    });
}

function checkDisplayBookmarked(url, tabId) {
    if (pins.has(url)) {
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
    console.log(request);
    if (request.callFunction == "checkDisplayBookmarked" && !!request.url) {
        browser.tabs.query({ active: true }, (tab) => {
            tab = tab[0];
            checkDisplayBookmarked(request.url, tab.id);
        });
    }
    else if (request.callFunction == "saveBookmark") {
        console.log("blubbbb");
        sendResponse(saveBookmark(request.pin));
    }
}

function saveBookmark(pin) {
    browser.storage.local.get("apikey",(token) => {
        let headers = new Headers({ "Accept": "application/json" });
        let apikey = token.apikey;
        let init = { method: 'GET', headers };
        let request = new Request("https://api.pinboard.in/v1/posts/add/?auth_token=" + apikey +
                "&url=" + encodeURIComponent(pin.href) +
                "&description=" + encodeURIComponent(pin.description) +
                "&tags=" + encodeURIComponent(pin.tags) +
                "&toread=" + pin.toread +
                "&format=json", init);
        fetch(request).then((response) => {
            if (response.status == 200 && response.ok) {
                response.json().then(json => {
                    if (json.result_code == "done") {
                        browser.storage.local.set({ pins: Array.from(pins.entries()) });
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
            else {
                //console.log("Error. Not status code 200 or not response OK");
            }
        });
    });
}