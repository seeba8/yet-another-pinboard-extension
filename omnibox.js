browser.omnibox.onInputChanged.addListener(handleInputChanged);
browser.omnibox.onInputEntered.addListener(handleInputEntered);

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
    const regex = /^(http:\/\/|https:\/\/|ftp:|mailto:|file:|javascript:|feed:).+$/iu;
    let m;
    if ((m = regex.exec(text)) === null) {
        url = "https:\/\/pinboard.in/search/?query=" + encodeURIComponent(url) + "&mine=Search+Mine";
    }
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
