///<reference path="pin.ts" />
///<reference path="pins.ts" />
browser.omnibox.onInputChanged.addListener(handleInputChanged);
browser.omnibox.onInputEntered.addListener(handleInputEntered);

// Update the suggestions whenever the input is changed.
function handleInputChanged(text: string, addSuggestions: (arg: browser.omnibox.SuggestResult[]) => void): void{
    /*    const toReadRegex = new Regex("(^\w\s)?"+options.toReadPrefix+"\w?\s.*","gm");
        text = text.toLowerCase();
        let toReadPrefix = text.search(toReadRegex);
    */
    const selectedPins: Pin[] = [];
    for (const pin of pins.filterWithOptions(text, options, {count: 6})) {
        if (pin instanceof Pin) {
            selectedPins.push(pin);
        }
    }
    createSuggestions(selectedPins, text).then(addSuggestions);
}

// Open the page based on how the user clicks on a suggestion.
function handleInputEntered(text: string, disposition: browser.omnibox.OnInputEnteredDisposition): void{
    let url = text;
    const regex = /^(http:\/\/|https:\/\/|ftp:|mailto:|file:|javascript:|feed:).+$/iu;
    if (regex.exec(text) === null) {
        url = "https:\/\/pinboard.in/search/?query=" + encodeURIComponent(url) + "&mine=Search+Mine";
    }
    switch (disposition) {
        case "currentTab":
            browser.tabs.update(undefined, { url });
            break;
        case "newForegroundTab":
            browser.tabs.create({ url });
            break;
        case "newBackgroundTab":
            browser.tabs.create({ url, active: false });
            break;
    }
}

// Create the array with the searchbar suggestions
function createSuggestions(pins: Pin[], searchtext: string): Promise<browser.omnibox.SuggestResult[]> {
    return new Promise((resolve) => {
        const suggestions = []
        const suggestionsOnEmptyResults = [{
            content: "https://pinboard.in/search/?query=" + encodeURIComponent(searchtext),
            description: "No results found, go to Pinboard search",
        }];
        if (!pins || pins.length === 0) {
            return resolve(suggestionsOnEmptyResults);
        }
        pins.forEach((pin) => {
            suggestions.push({
                content: pin.url,
                description: pin.description,
            });
        });
        return resolve(suggestions);
    })
}
