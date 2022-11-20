import type { Browser } from "webextension-polyfill";
declare let browser: Browser;
import { Options, SearchMode, StyleType } from "./options.js";
import { Pins } from "./pins.js";
const port = browser.runtime.connect({"name": "backend"});
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
const exportToHtml = document.getElementById("exportToHTML") as HTMLButtonElement;
const exportToJson = document.getElementById("exportToJSON") as HTMLButtonElement;

// Event listeners
changeActionbarIcon.addEventListener("change", handleOptionChange);
saveBrowserBookmarks.addEventListener("change", handleOptionChange);
sharedByDefault.addEventListener("change", handleOptionChange);
saveAPIButton.addEventListener("click", saveAPIKey);
clearAPIButton.addEventListener("click", clearAPIKey);
forceReloadButton.addEventListener("click", forcePinReload);
exportToHtml.addEventListener("click", onExportToHtml);
exportToJson.addEventListener("click", onExportToJson);
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
toggleAdvanced.addEventListener("click", () => {
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

document.getElementsByName("searchMode").forEach((element) => {
    element.addEventListener("change", handleSearchBehaviourChange);
});

onLoad();

async function onLoad() {
    const token = await browser.storage.local.get(["lastsync", "apikey"]) as { lastsync: number, apikey: string };
    forceReloadButton.title = "Last bookmark sync: " + new Date(token.lastsync);
    options = await Options.getObject();
    if (!!token.apikey && token.apikey !== "") {
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
    if (options.styleType === StyleType.dark) {
        (document.getElementById("dark") as HTMLInputElement).checked = true;
    } else if (options.styleType === StyleType.light) {
        (document.getElementById("light") as HTMLInputElement).checked = true;
    } else if (options.styleType === StyleType.browser) {
        (document.getElementById("browser") as HTMLInputElement).checked = true;
    } else {
        (document.getElementById("custom") as HTMLInputElement).checked = true;
    }
    document.getElementsByName("searchMode").forEach((element: HTMLInputElement) => {
        if(options.searchMode === SearchMode[element.id]) {
            element.checked = true;
        } else {
            element.checked = false;
        }
    });
    updateColorSelectors();

    for (const [k, v] of options.getStringOptions()) {
        (document.getElementById(k) as HTMLInputElement).value = v;
    }

    const tabs = await browser.tabs.query({});// .then((tabs: browser.tabs.Tab[]) => {
    for (const tab of tabs) {
        const li = document.createElement("li") as HTMLLIElement;
        li.textContent = tab.title;
        regexPreview.appendChild(li);
    }
}

function forcePinReload() {
    port.postMessage({ callFunction: "forceUpdatePins" });
}

function toggleAPIKeyInputs() {
    document.getElementById("apikey").classList.toggle("hidden");
    document.getElementById("saveapi").classList.toggle("hidden");
    document.getElementById("clearapi").classList.toggle("hidden");
    document.getElementById("forcereload").classList.toggle("hidden");
}

function clearAPIKey() {
    browser.storage.local.set({ apikey: "", pins: [], lastupdate: "" });
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
        browser.storage.local.set({ apikey: apiKeyInput.value });
        apiKeyInput.value = "";
        toggleAPIKeyInputs();
        errorSymbol.classList.add("hidden");
    } else {
        return;
    }
}

function handleOptionChange(e: Event) {
    const target = (e.target as HTMLInputElement);
    if (target.type === "checkbox") {
        options[target.name] = target.checked;
    } else {
        options[target.name] = target.value;
    }
}

function onTitleRegexChange(e: Event) {
    let regex: RegExp;
    try {
        regex = new RegExp((e.target as HTMLInputElement).value);
    } catch (error) {
        // TODO: What is this below? I commented it out now...
        // for (const child of Array.from(regexPreview.children) as HTMLLIElement[]) {
        //     child.textContent = child.textContent;
        // }
        titleRegex.title = String(error);
        titleRegex.classList.add("wronginput");
        return;
    }
    titleRegex.classList.remove("wronginput");
    titleRegex.title = "";
    for (const child of Array.from(regexPreview.children) as HTMLLIElement[]) {
        const res = regex.exec(child.textContent);
        if (res === null) {
            // TODO why was this there?
            //child.textContent = child.textContent;
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
        if (Object.prototype.hasOwnProperty.call(options.style, o) && o !== "type") {
            (document.getElementById(o) as HTMLInputElement).value = options.style[o];
        }
    }
}

function handleSearchBehaviourChange(e: Event) {
    const selected = (e.target as HTMLInputElement).id;
    options.searchMode = SearchMode[selected];
}

async function onExportToHtml() {
    function escape(input: string): string {
        return input.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");        
     }
    const bookmarks = await Pins.getObject();
    let out = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
    <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
    <TITLE>Pinboard Bookmarks</TITLE>
    <H1>Bookmarks</H1>
    <DL><p>`;
    for(const bookmark of bookmarks.forEachReversed()) {
        out += `<DT><A HREF="${escape(bookmark.url)}" ADD_DATE="${new Date(bookmark.time).getTime()}" PRIVATE="${bookmark.shared === "yes" ? "0" : "1"}" TOREAD="${bookmark.toread === "yes" ? "1" : "0"}" TAGS="${escape(bookmark.tags)}">` 
            + `${escape(bookmark.description)}</A>\n`;
        if(bookmark.extended !== undefined && bookmark.extended.length > 0) {
            out += `<DD>${escape(bookmark.extended)}`;
        }
        out += '\n\n';
    }
    const j = document.createElement("a");
    j.download = "pinboard_export_"+Date.now()+".html";
    j.href = URL.createObjectURL(new Blob([out]));
    j.click();
}

async function onExportToJson() {
    const bookmarks = await Pins.getObject();
    const out = [];
    for(const bookmark of bookmarks.forEachReversed()) {
        out.push({
            "href": bookmark.url ?? "",
            "description": bookmark.description ?? "",
            "extended": bookmark.extended ?? "",
            "time": bookmark.time ?? "",
            "shared": bookmark.shared ?? "no",
            "toread": bookmark.toread ?? "no",
            "tags": bookmark.tags ?? "",
        });
    }
    const j = document.createElement("a");
    j.download = "pinboard_export_"+Date.now()+".json";
    j.href = URL.createObjectURL(new Blob([JSON.stringify(out)]));
    j.click();
}