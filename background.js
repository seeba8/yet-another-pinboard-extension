let pins = [];
let options = {};

// Listeners
browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleAddonInstalled);
browser.storage.onChanged.addListener(handleStorageChanged);
browser.omnibox.onInputChanged.addListener(handleInputChanged);
browser.omnibox.onInputEntered.addListener(handleInputEntered);

// Provide help text to the user.
browser.omnibox.setDefaultSuggestion({
  description: `Search your pinboard bookmarks`
});

function handleAddonInstalled(){
    loadOptions();
}
// Update the pins on startup of the browser
function handleStartup(){
    updatePinData();
    loadOptions();
}

function loadOptions(){
    options.startSearchLength = 3;
    options.urlPrefix = "u";
    options.tagPrefix = "t";
    options.titlePrefix = "n"; // Name...
    options.toReadPrefix = "r";
}

// Only update pin data when the api key was modified
function handleStorageChanged(changes, area){
    if(Object.keys(changes).includes("apikey")){
        updatePinData();
    }
    else if(Object.keys(changes).includes("pins")){
        updatePinVariable();
    }
}

function updatePinVariable(){
    browser.storage.local.get("pins").then((res) => {
        pins = res["pins"]["posts"];
        console.log("Updated pin variable");
    });
}

function updateAvailable(){
    browser.storage.local.get(["apikey", "lastsync"]).then((token) => {
        let headers = new Headers({"Accept": "application/json"});
        let init = {method: 'GET', headers};
        let request = new Request("https://api.pinboard.in/v1/posts/update?auth_token="+token.apikey+"&format=json", init);
        fetch(request).then((response) =>{
            response.json().then((json) => {
                return (Date(json.update_time) > token.lastsync);
            })
        });
    });
}

// Reloads all bookmarks from pinboard. Should be optimized to get a delta...
// Should listen to return codes
function updatePinData(){
    browser.storage.local.get(["apikey", "lastsync"]).then((token) => {
        if(!token.apikey || token.apikey == "" ||(!!token.lastsync && token.lastsync > Date.now() - 1000*60*10)){
            console.log("Not syncing, either no API key or last sync less than 10 minutes ago.");
            return;
        }
        let headers = new Headers({"Accept": "application/json"});
        let init = {method: 'GET', headers};
        if(!updateAvailable()){
            console.log("Not syncing, no update available");
            return;
        }
        if(!token.lastsync){
            let request = new Request("https://api.pinboard.in/v1/posts/all?auth_token="+token.apikey+"&format=json", init);
        }
        else {
            let request = new Request("https://api.pinboard.in/v1/posts/all?auth_token="+token.apikey+"&format=json&fromdt="+
            token.lastsync.toISOString(), init);
        }
        browser.storage.local.set({lastsync:Date.now()});
        fetch(request).then((response) => {
            response.json().then((json) => {
                browser.storage.local.set({pins: json});
                console.log("Sync successful, pins updated");
            });
        });
    });
}

// Update the suggestions whenever the input is changed.
function handleInputChanged(text, addSuggestions){
/*    const toReadRegex = new Regex("(^\w\s)?"+options.toReadPrefix+"\w?\s.*","gm");
    text = text.toLowerCase();
    let toReadPrefix = text.search(toReadRegex);
*/
    let searchArea = [];
    let hasPrefix = false;
    let toRead = false;
    if(text.startsWith(options.tagPrefix + " ")){
        searchArea.push("tags");
        hasPrefix = true;  
    }
    else if(text.startsWith(options.urlPrefix + " ")){
        searchArea.push("href");
        hasPrefix = true;
    }
    else if(text.startsWith(options.titlePrefix + " ")){
        searchArea.push("description");
        hasPrefix = true;
    }
    else {
        searchArea = ["tags", "href", "description"];
    }
    if(text.startsWith(options.toReadPrefix + " ")){
        hasPrefix = true;
        toRead = true;
    }
    if(hasPrefix){
        text = text.slice(text.indexOf(" ")+1);
    }
    console.log("Searching for: "+text);
    let selectedPins = [];
    pins.forEach((pin) => {
        searchArea.forEach((filter) => {
            if(pin[filter].toLowerCase().includes(text)){
                if(!toRead || pin["toread"]=="yes"){
                    selectedPins.push(pin);
                }
            }
        });
    });
    createSuggestions(selectedPins).then(addSuggestions);
}

// Open the page based on how the user clicks on a suggestion.
function handleInputEntered(text, disposition){
    let url = text;
    switch (disposition) {
        case "currentTab":
            browser.tabs.update({url});
            break;
        case "newForegroundTab":
            browser.tabs.create({url});
            break;
        case "newBackgroundTab":
            browser.tabs.create({url, active: false});
            break;
  }
}

//Create the array with the searchbar suggestions
function createSuggestions(pins){
    return new Promise(resolve => {
        let suggestions = []
        let suggestionsOnEmptyResults = [{
            content: "https://pinboard.in",
            description: "No results found, go to Pinboard"
        }];
        if(!pins || pins.length == 0){
            return resolve(suggestionsOnEmptyResults);
        }
        pins.forEach(function(pin){
            suggestions.push({
                content: pin.href,
                description: pin.description
            });
        });
        return resolve(suggestions);
    })
}