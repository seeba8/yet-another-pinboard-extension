namespace optionsPage {
let options: Options = {};
declare interface Options {
    changeActionbarIcon?: boolean;
    saveBrowserBookmarks?: boolean;
    sharedByDefault?: boolean;
}
// TODO browser.storage.sync

//Elements
const changeActionbarIcon = <HTMLInputElement> document.getElementById('changeActionbarIcon');
const sharedByDefault = <HTMLInputElement> document.getElementById("sharedByDefault");
const saveBrowserBookmarks = <HTMLInputElement> document.getElementById("saveBrowserBookmarks");
const apiKeyInput = <HTMLInputElement> document.getElementById("apikey");

const saveAPIButton = <HTMLButtonElement> document.getElementById("saveapi");
const clearAPIButton = <HTMLButtonElement> document.getElementById("clearapi");
const forceReloadButton = <HTMLButtonElement> document.getElementById("forcereload");

//Event listeners
changeActionbarIcon.addEventListener("change", handleOptionChange);
saveBrowserBookmarks.addEventListener("change", handleOptionChange);
sharedByDefault.addEventListener("change", handleOptionChange);
saveAPIButton.addEventListener("click", saveAPIKey);
clearAPIButton.addEventListener("click", clearAPIKey);
forceReloadButton.addEventListener("click", forcePinReload);
document.querySelectorAll(".shortcuts").forEach((element) => {
    element.addEventListener("change", handleOptionChange);
});

onLoad();

async function onLoad() {
    let token = await browser.storage.local.get(["lastsync", "options", "apikey"]);
    forceReloadButton.title = "Last bookmark sync: " + new Date(token.lastsync);
    options = token.options;
    if(!! token.apikey && token.apikey != "") {
        toggleAPIKeyInputs();
    }
    if (!!options.changeActionbarIcon && options.changeActionbarIcon) {
        changeActionbarIcon.checked = true;
    }
    if(!!options.saveBrowserBookmarks && options.saveBrowserBookmarks) {
        saveBrowserBookmarks.checked = true;
    }
    if(options.hasOwnProperty("sharedByDefault") && options.sharedByDefault) {
        sharedByDefault.checked = true;
    }

    Object.keys(options).forEach((k, v) => {
        if (k !== "showBookmarked" && k !== "changeActionbarIcon" && k !== "saveBrowserBookmarks" && k !== "sharedByDefault") {
            (<HTMLInputElement> document.querySelector('input[name=' + k + ']')).value = options[k];
        }
    });

}



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

async function saveAPIKey() {
    // Call pinboard to check if the API key is working
    let headers = new Headers({ "Accept": "application/json" });
    let apikey = apiKeyInput.value;
    let init = { method: 'GET', headers };
    let request = new Request("https://api.pinboard.in/v1/user/api_token/?auth_token=" + apikey + "&format=json", init);
    let response = await fetch(request);
    if (!response) {
        //console.log("Error while parsing result");
        return;
    }
    let json = await response.json();
    if (json.result == apikey.split(":")[1]) {
        browser.storage.local.set({apikey: apiKeyInput.value});
        //console.log("Saved successfully");
        apiKeyInput.value = "";
        toggleAPIKeyInputs();
    }
    else {
        //console.log("Error while parsing result");
        return;
    }
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
}