namespace optionsPage {
let options: Options;
// TODO browser.storage.sync

// Elements
const changeActionbarIcon = document.getElementById("changeActionbarIcon") as HTMLInputElement;
const sharedByDefault = document.getElementById("sharedByDefault") as HTMLInputElement;
const saveBrowserBookmarks = document.getElementById("saveBrowserBookmarks") as HTMLInputElement;
const apiKeyInput = document.getElementById("apikey") as HTMLInputElement;
const saveAPIButton = document.getElementById("saveapi") as HTMLButtonElement;
const clearAPIButton = document.getElementById("clearapi") as HTMLButtonElement;
const forceReloadButton = document.getElementById("forcereload") as HTMLButtonElement;
const errorSymbol = document.getElementById("errorsymbol") as HTMLDivElement;

// Event listeners
changeActionbarIcon.addEventListener("change", handleOptionChange);
saveBrowserBookmarks.addEventListener("change", handleOptionChange);
sharedByDefault.addEventListener("change", handleOptionChange);
saveAPIButton.addEventListener("click", saveAPIKey);
clearAPIButton.addEventListener("click", clearAPIKey);
forceReloadButton.addEventListener("click", forcePinReload);
document.querySelectorAll(".prefixes").forEach((element) => {
    element.addEventListener("change", handleOptionChange);
});

onLoad();

async function onLoad() {
    const token = await browser.storage.local.get(["lastsync", "apikey"]);
    forceReloadButton.title = "Last bookmark sync: " + new Date(token.lastsync);
    options = await Options.getObject();
    if (!! token.apikey && token.apikey !== "") {
        toggleAPIKeyInputs();
    }
    if (options.changeActionbarIcon) {
        changeActionbarIcon.checked = true;
    }
    if (options.saveBrowserBookmarks) {
        saveBrowserBookmarks.checked = true;
    }
    if (options.sharedByDefault) {
        sharedByDefault.checked = true;
    }

    for (const [k, v] of options.getPrefixes()) {
        (document.getElementById(k) as HTMLInputElement).value = v;
    }
}

function forcePinReload() {
    browser.runtime.sendMessage({callFunction: "forceUpdatePins"});
}

function toggleAPIKeyInputs() {
    document.getElementById("apikey").classList.toggle("hidden");
    document.getElementById("saveapi").classList.toggle("hidden");
    document.getElementById("clearapi").classList.toggle("hidden");
    document.getElementById("forcereload").classList.toggle("hidden");
}

function clearAPIKey() {
    browser.storage.local.set({apikey : "", pins: [], lastupdate: ""});
    toggleAPIKeyInputs();
}

async function saveAPIKey() {
    // Call pinboard to check if the API key is working
    const headers = new Headers({ Accept: "application/json" });
    const apikey = apiKeyInput.value;
    const init = { method: "GET", headers };
    const request = new Request("https://api.pinboard.in/v1/user/api_token/?auth_token=" +
    apikey + "&format=json", init);
    const response = await fetch(request);
    if (!response || response.status !== 200) {
        apiKeyInput.value = "";
        errorSymbol.classList.remove("hidden");
        errorSymbol.title = response.statusText;
        return;
    }
    const json = await response.json();
    if (json.result === apikey.split(":")[1]) {
        browser.storage.local.set({apikey: apiKeyInput.value});
        apiKeyInput.value = "";
        toggleAPIKeyInputs();
        errorSymbol.classList.add("hidden");
    } else {
        return;
    }
}

function handleOptionChange(e) {
    if (e.target.type === "checkbox") {
        options[e.target.name] = e.target.checked;
    } else {
        options[e.target.name] = e.target.value;
    }
}
}
