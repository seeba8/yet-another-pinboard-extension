var pins;
var options = {};

// Listeners
browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.storage.onChanged.addListener(handleStorageChanged);
browser.omnibox.onInputStarted.addListener(() => {
    console.log(pins);
});
browser.omnibox.onInputChanged.addListener(handleInputChanged);
browser.omnibox.onInputEntered.addListener(handleInputEntered);
browser.tabs.onUpdated.addListener(handleTabUpdated);

// Provide help text to the user.
browser.omnibox.setDefaultSuggestion({
    description: `Search your pinboard bookmarks`
});

function handleAddonInstalled() {
    options = {
        "urlPrefix": "u",
        "tagPrefix": "t",
        "titlePrefix": "n",
        "toReadPrefix": "r",
        "showBookmarked": true,
        "changeActionbarIcon": true
    };
    browser.storage.local.set({ "options": options });
    browser.storage.local.get(null).then((res) => {
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
    updatePinData();
    loadOptions();
    updatePinVariable();
}

function loadOptions() {
    browser.storage.local.get("options").then((res) => {
        options = res.options;
        if (options.changeActionbarIcon) {
            browser.browserAction.setIcon({
                path: {
                    19: "img/pinboard-grey-19.png",
                    38: "img/pinboard-grey-38.png"
                }
            });
        }
    });
}

// Only update pin data when the api key was modified
function handleStorageChanged(changes, area) {
    console.log(changes);
    if (Object.keys(changes).includes("apikey")) {
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
        console.log("Updated pin variable");
    });
}

function isUpdateAvailable() {
    browser.storage.local.get(["apikey", "lastsync"]).then((token) => {
        let headers = new Headers({ "Accept": "application/json" });
        let init = { method: 'GET', headers };
        let request = new Request("https://api.pinboard.in/v1/posts/update?auth_token=" + token.apikey + "&format=json", init);
        fetch(request).then((response) => {
            response.json().then((json) => {
                return (Date(json.update_time) > token.lastsync);
            })
        });
    });
}

// Reloads all bookmarks from pinboard. Should be optimized to get a delta...
// Should listen to return codes
function updatePinData() {
    browser.storage.local.get(["apikey", "lastsync", "pins"]).then((token) => {
        if (!token.apikey || token.apikey == "" || (!!token.lastsync && new Date(token.lastsync) > Date.now() - 1000 * 60 * 10)) {
            console.log("Not syncing, either no API key or last sync less than 10 minutes ago.");
            return;
        }

        if (!!token.pins && token.pins.size > 0 && !!token.lastsync && !isUpdateAvailable()) {
            console.log("Not syncing, no update available");
            updatePinVariable();
            return;
        }
        let request = null;
        let headers = new Headers({ "Accept": "application/json" });
        let init = { method: 'GET', headers };
        if (!token.lastsync || token.pins.size == 0) {
            request = new Request("https://api.pinboard.in/v1/posts/all?auth_token=" + token.apikey + "&format=json", init);
            console.log("Loading pins from scratch!");
        }
        else {
            request = new Request("https://api.pinboard.in/v1/posts/all?auth_token=" + token.apikey + "&format=json&fromdt=" +
                new Date(token.lastsync).toISOString(), init);
        }
        browser.storage.local.set({ lastsync: Date.now() });
        fetch(request).then((response) => {
            response.json().then((json) => {

                let pinsMap = new Map();
                json.forEach((pin) => {
                    pinsMap.set(pin.href, {
                        href: pin.href,
                        description: pin.description,
                        tags: pin.tags,
                        time: pin.time,
                        toread: pin.toread
                    });

                });
                console.log(pinsMap.size);
                console.log(pinsMap);
                browser.storage.local.set({ pins: Array.from(pinsMap.entries()) });
                console.log("Sync successful, pins updated");
            });
        });
    });
}

// Update the suggestions whenever the input is changed.
function handleInputChanged(text, addSuggestions) {
    /*    const toReadRegex = new Regex("(^\w\s)?"+options.toReadPrefix+"\w?\s.*","gm");
        text = text.toLowerCase();
        let toReadPrefix = text.search(toReadRegex);
    */
    let searchArea = [];
    let hasPrefix = false;
    let toRead = false;
    if (text.startsWith(options.tagPrefix + " ")) {
        searchArea.push("tags");
        hasPrefix = true;
    }
    else if (text.startsWith(options.urlPrefix + " ")) {
        searchArea.push("href");
        hasPrefix = true;
    }
    else if (text.startsWith(options.titlePrefix + " ")) {
        searchArea.push("description");
        hasPrefix = true;
    }
    else {
        searchArea = ["tags", "href", "description"];
    }
    if (text.startsWith(options.toReadPrefix + " ")) {
        hasPrefix = true;
        toRead = true;
    }
    if (hasPrefix) {
        text = text.slice(text.indexOf(" ") + 1);
    }
    console.log("Searching for: " + text);
    let selectedPins = [];
    for (var [key, pin] of pins) {
        searchArea.forEach((filter) => {
            if (pin[filter].toLowerCase().includes(text)) {
                if (!toRead || pin["toread"] == "yes") {
                    selectedPins.push(pin);
                }
            }
        });
    }
    createSuggestions(selectedPins, text).then(addSuggestions);
}

// Open the page based on how the user clicks on a suggestion.
function handleInputEntered(text, disposition) {
    let url = text;
    switch (disposition) {
        case "currentTab":
            browser.tabs.update({ url });
            break;
        case "newForegroundTab":
            browser.tabs.create({ url });
            break;
        case "newBackgroundTab":
            browser.tabs.create({ url, active: false });
            break;
    }
}

//Create the array with the searchbar suggestions
function createSuggestions(pins, searchtext) {
    return new Promise(resolve => {
        let suggestions = []
        let suggestionsOnEmptyResults = [{
            content: "https://pinboard.in/search/?query=" + encodeURIComponent(searchtext),
            description: "No results found, go to Pinboard search"
        }];
        if (!pins || pins.size == 0) {
            return resolve(suggestionsOnEmptyResults);
        }
        pins.forEach(function (pin) {
            suggestions.push({
                content: pin.href,
                description: pin.description
            });
        });
        return resolve(suggestions);
    })
}

function handleTabUpdated(tabId, changeInfo, tab) {

    if (!options.showBookmarked && !options.changeActionbarIcon) {
        console.log("hm...");
        return;
    }
    if (changeInfo.status == "complete") {
        if (pins.has(tab.url)) {
            console.log("bookmarked!");
            if (options.showBookmarked) {
                browser.pageAction.show(tab.id);
            }
            if (options.changeActionbarIcon) {
                browser.browserAction.setIcon({
                    path: {
                        19: "img/pinboard-19.png",
                        38: "img/pinboard-38.png"
                    },
                    tabId: tabId
                });
            }
        }
        else {
            if (options.changeActionbarIcon) {
                browser.browserAction.setIcon({
                    path: {
                        19: "img/pinboard-grey-19.png",
                        38: "img/pinboard-grey-38.png"
                    },
                    tabId: tabId
                });
            }
        }
    }
}