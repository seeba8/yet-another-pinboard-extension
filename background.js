// Provide help text to the user.
browser.omnibox.setDefaultSuggestion({
  description: `Search your pinboard bookmarks`
});

// Update the pins on startup of the browser
browser.runtime.onStartup.addListener(updatePinData);
browser.runtime.onInstalled.addListener(updatePinData);
browser.storage.onChanged.addListener(checkStorageChange);

// Only update pin data when the api key was modified
function checkStorageChange(changes, area){
    if(Object.keys(changes)[0] == "apikey"){
        updatePinData();
    }
}

// Reloads all bookmarks from pinboard. Should be optimized to get a delta...
function updatePinData(){
    browser.storage.local.get("apikey").then((token) => {
        if(!token.apikey || token.apikey == ""){
            return;
        }
        let headers = new Headers({"Accept": "application/json"});
        let init = {method: 'GET', headers};
        let request = new Request("https://api.pinboard.in/v1/posts/all?auth_token="+token.apikey+"&format=json", init);
        fetch(request).then(function(response){
            response.json().then(json => {
                browser.storage.local.set({pins: json});
                console.log("Pins updated");
            });
        });
    });
}

// Update the suggestions whenever the input is changed.
browser.omnibox.onInputChanged.addListener((text, addSuggestions) => {
    browser.storage.local.get("pins").then((res) => {
        console.log(text);
        let pins = [];
        res['pins'].forEach(function(pin){
            if(pin.description.toLowerCase().includes(text.toLowerCase())){
                pins.push(pin);
            }
        });
        createSuggestions(pins).then(addSuggestions);
    });
});

// Open the page based on how the user clicks on a suggestion.
browser.omnibox.onInputEntered.addListener((text, disposition) => {
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
});

//Create the array with the searchbar suggestions
function createSuggestions(pins){
    return new Promise(resolve => {
        let suggestions = []
        let suggestionsOnEmptyResults = [{
            content: "https://pinboard.in",
            description: "no results found, go to pinboard"
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