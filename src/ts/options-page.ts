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
const titleRegex = document.getElementById("titleRegex") as HTMLInputElement;
const regexPreview = document.getElementById("regexPreview") as HTMLUListElement;
const toggleAdvanced = document.getElementById("toggleAdvanced") as HTMLButtonElement;
const advancedOptions = document.getElementById("advancedOptions") as HTMLDivElement;

// Event listeners
changeActionbarIcon.addEventListener("change", handleOptionChange);
saveBrowserBookmarks.addEventListener("change", handleOptionChange);
sharedByDefault.addEventListener("change", handleOptionChange);
saveAPIButton.addEventListener("click", saveAPIKey);
clearAPIButton.addEventListener("click", clearAPIKey);
forceReloadButton.addEventListener("click", forcePinReload);
titleRegex.addEventListener("input", onTitleRegexChange);
titleRegex.addEventListener("focus", (e) => {
    regexPreview.classList.remove("hidden");
    onTitleRegexChange(e);
});
titleRegex.addEventListener("blur", (e) => {
    if (titleRegex.value === "") {
        titleRegex.value = ".*";
    }
    regexPreview.classList.add("hidden");
    handleOptionChange(e);
})
document.querySelectorAll(".prefixes").forEach((element) => {
    element.addEventListener("change", handleOptionChange);
});
toggleAdvanced.addEventListener("click", (e) => {
    advancedOptions.classList.toggle("hidden");
    toggleAdvanced.textContent = (toggleAdvanced.textContent.startsWith("Show") ? "Hide" : "Show")
            + " advanced options";
});
document.getElementsByName("styleselect").forEach((element) => {
    element.addEventListener("change", handleStyleSelectChange);
});
document.querySelectorAll(".customstyle").forEach((element) => {
    element.addEventListener("change", onCustomStyleChange);
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
    if (options.style.type === StyleType.dark) {
        (document.getElementById("dark") as HTMLInputElement).checked = true;
    } else if (options.style.type === StyleType.default) {
        (document.getElementById("default") as HTMLInputElement).checked = true;
    } else {
        (document.getElementById("custom") as HTMLInputElement).checked = true;
    }
    updateColorSelectors();

    for (const [k, v] of options.getStringOptions()) {
        (document.getElementById(k) as HTMLInputElement).value = v;
    }

    browser.tabs.query({}).then((tabs: browser.tabs.Tab[]) => {
        for (const tab of tabs) {
            const li = document.createElement("li") as HTMLLIElement;
            li.textContent = tab.title;
            regexPreview.appendChild(li);
        }
    });
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

function onTitleRegexChange(e: Event) {
    let regex: RegExp;
    try {
        regex = new RegExp((e.target as HTMLInputElement).value);
    } catch (error) {

        for (const child of Array.from(regexPreview.children) as HTMLLIElement[]) {
            child.textContent = child.textContent;
        }
        titleRegex.title = String(error);
        titleRegex.classList.add("wronginput");
        return;
    }
    titleRegex.classList.remove("wronginput");
    titleRegex.title = "";
    for (const child of Array.from(regexPreview.children) as HTMLLIElement[]) {
        const res = regex.exec(child.textContent);
        if (res === null) {
            child.textContent = child.textContent;
            continue;
        }
        // If we have more than one match (thus, a capture group), look at the first capture group
        const match: string = (res.length > 1 ? res[1] : res[0]);
        const matchElement = document.createElement("span");
        matchElement.classList.add("match");
        matchElement.textContent = match;
        const full = child.textContent;
        child.textContent = full.substring(0, full.indexOf(match));
        child.appendChild(matchElement);
        child.appendChild(document.createTextNode(full.substring(full.indexOf(match) + match.length)));
    }
}

function handleStyleSelectChange(e: Event) {
    const target = (e.target as HTMLInputElement);
    if (target.id !== "custom") {
        options.setColorMode(target.id);
    } else {
        const style = options.style;
        style.type = StyleType.custom;
        document.querySelectorAll(".customstyle").forEach((element: HTMLInputElement) => {
            style[element.id] = element.value;
        });
        options.style = style;
    }
    updateColorSelectors();
}

function onCustomStyleChange(e: Event) {
    (document.getElementById("custom") as HTMLInputElement).checked = true;
    const style = options.style;
    const target = e.target as HTMLInputElement;
    style.type = StyleType.custom;
    style[target.id] = target.value;
    options.style = style;
}

function updateColorSelectors() {
    for (const o in options.style) {
        if (options.style.hasOwnProperty(o) && o !== "type") {
            (document.getElementById(o) as HTMLInputElement).value = options.style[o];
        }
    }
}
}
