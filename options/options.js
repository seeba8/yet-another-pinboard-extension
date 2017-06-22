if(typeof browser === "undefined") {
    browser = chrome;
}
var options = {};
// TODO browser.storage.sync

document.getElementById('changeActionbarIcon').addEventListener("change", handleOptionChange);
document.getElementById('saveBrowserBookmarks').addEventListener("change", handleOptionChange);
document.querySelector("#saveapi").addEventListener("click", saveAPIKey);
document.querySelectorAll(".shortcuts").forEach((element) => {
    element.addEventListener("change", handleOptionChange);
});

browser.storage.local.get("options",(token) => {
    options = token.options;
    if (!!options.changeActionbarIcon && options.changeActionbarIcon) {
        document.getElementById("changeActionbarIcon").checked = true;
    }
    if(!!options.saveBrowserBookmarks && options.saveBrowserBookmarks) {
        document.getElementById("saveBrowserBookmarks").checked = true;
    }

    Object.keys(options).forEach((k, v) => {
        if (k !== "showBookmarked" && k !== "changeActionbarIcon" && k !== "saveBrowserBookmarks") {
            document.querySelector('input[name=' + k + ']').value = options[k];
        }
    });
});

function saveAPIKey() {
    // Call pinboard to check if the API key is working
    let headers = new Headers({ "Accept": "application/json" });
    let apikey = document.querySelector("#apikey").value;
    let init = { method: 'GET', headers };
    let request = new Request("https://api.pinboard.in/v1/user/api_token/?auth_token=" + apikey + "&format=json", init);
    fetch(request).then(function (response) {
        if (!response) {
            //console.log("Error while parsing result");
            document.querySelector("#testresult").textContent = "Error!";
            return;
        }
        response.json().then(json => {
            if (json.result == apikey.split(":")[1]) {
                browser.storage.local.set({
                    apikey: document.querySelector("#apikey").value
                });
                //console.log("Saved successfully");
                document.querySelector("#testresult").textContent = "Saved!";
                document.querySelector("#apikey").value = "";
            }
            else {
                //console.log("Error while parsing result");
                document.querySelector("#testresult").textContent = "Error!";
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

