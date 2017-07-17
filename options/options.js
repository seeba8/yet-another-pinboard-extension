var options = {};
// TODO browser.storage.sync

document.getElementById('changeActionbarIcon').addEventListener("change", handleOptionChange);
document.getElementById('saveBrowserBookmarks').addEventListener("change", handleOptionChange);
document.getElementById("sharedByDefault").addEventListener("change", handleOptionChange);
document.getElementById("saveapi").addEventListener("click", saveAPIKey);
document.getElementById("clearapi").addEventListener("click", clearAPIKey);
document.getElementById("forcereload").addEventListener("click", forcePinReload);
document.querySelectorAll(".shortcuts").forEach((element) => {
    element.addEventListener("change", handleOptionChange);
});
browser.storage.local.get("lastsync").then(token => {
    document.getElementById("forcereload").title = "Last bookmark sync: " + new Date(token.lastsync);
});
browser.storage.local.get(["options", "apikey"]).then((token) => {
    options = token.options;
    if(!! token.apikey && token.apikey != "") {
        toggleAPIKeyInputs();
    }
    if (!!options.changeActionbarIcon && options.changeActionbarIcon) {
        document.getElementById("changeActionbarIcon").checked = true;
    }
    if(!!options.saveBrowserBookmarks && options.saveBrowserBookmarks) {
        document.getElementById("saveBrowserBookmarks").checked = true;
    }
    if(options.hasOwnProperty("sharedByDefault") && options.sharedByDefault) {
        document.getElementById("sharedByDefault").checked = true;
    }

    Object.keys(options).forEach((k, v) => {
        if (k !== "showBookmarked" && k !== "changeActionbarIcon" && k !== "saveBrowserBookmarks" && k !== "sharedByDefault") {
            document.querySelector('input[name=' + k + ']').value = options[k];
        }
    });
});

function forcePinReload() {
    //console.log("forcereload");
    browser.runtime.sendMessage({"callFunction": "forceUpdatePins"}).then((response) => {return;});
}

function toggleAPIKeyInputs() {
    document.getElementById("apikey").classList.toggle("hidden");
    document.getElementById("saveapi").classList.toggle("hidden");
    document.getElementById("clearapi").classList.toggle("hidden");
    document.getElementById("forcereload").classList.toggle("hidden");
}

function clearAPIKey() {
    browser.storage.local.set({"apikey" : "", "pins": [], "lastupdate": ""});
    toggleAPIKeyInputs();
}

function saveAPIKey() {
    // Call pinboard to check if the API key is working
    let headers = new Headers({ "Accept": "application/json" });
    let apikey = document.getElementById("apikey").value;
    let init = { method: 'GET', headers };
    let request = new Request("https://api.pinboard.in/v1/user/api_token/?auth_token=" + apikey + "&format=json", init);
    fetch(request).then(function (response) {
        if (!response) {
            //console.log("Error while parsing result");
            return;
        }
        response.json().then(json => {
            if (json.result == apikey.split(":")[1]) {
                browser.storage.local.set({
                    apikey: document.getElementById("apikey").value
                });
                //console.log("Saved successfully");
                document.getElementById("apikey").value = "";
                toggleAPIKeyInputs();
            }
            else {
                //console.log("Error while parsing result");
                return;
            }
        });
    });
}

function handleOptionChange(e) {
    if (e.target.type == "checkbox") {
        options[e.target.name] = e.target.checked;
    }
    else {
        options[e.target.name] = e.target.value;
    }

    let o = { options };
    browser.storage.local.set(o);
}

