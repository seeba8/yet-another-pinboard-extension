import type { Browser, Storage } from "webextension-polyfill";
declare let browser: Browser;

import { IStyle, Options } from "./options.js";
import { Pins } from "./pins.js";

let pins: Pins;
let options: Options;
const PINSLIST = document.getElementById("pins") as HTMLUListElement;
const SEARCH = document.getElementById("search") as HTMLInputElement;
const TEMPLATELI = document.getElementById("templateli") as HTMLLIElement;
const NOAPIKEYDIV = document.getElementById("noapikey") as HTMLDivElement;
document.getElementById("optionspage").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
})
SEARCH.addEventListener("input", onSearchInput);
SEARCH.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        e.preventDefault();
        (e.target as HTMLInputElement).value = "";
        onSearchInput(e);
    }
});
PINSLIST.addEventListener("click", onLinkClick);
startup();

async function startup() {
    await Promise.all([loadOptions(), loadPins()]);
    browser.storage.onChanged.addListener(onStorageChanged);
    checkAPIKey();
}

async function loadOptions() {
    options = await Options.getObject();
    setColorVariables(options.style);
}

async function loadPins() {
    pins = await Pins.getObject();
    showPins();
}

function setColorVariables(style: IStyle) {
    document.documentElement.style.setProperty("--text-color", style.textColor);
    document.documentElement.style.setProperty("--background-color", style.backgroundColor);
    document.documentElement.style.setProperty("--link-color", style.linkColor);
    document.documentElement.style.setProperty("--visited-color", style.visitedColor);
    document.documentElement.style.setProperty("--disabled-color", style.disabledColor);
}

async function onStorageChanged(changes: Record<string, Storage.StorageChange>) {
    if (Object.keys(changes).includes("pins")) {
        loadPins();
    } else if (Object.keys(changes).includes("options")) {
        loadOptions();
    } else if (Object.keys(changes).includes("apikey")) {
        checkAPIKey();
    }
}

async function checkAPIKey() {
    const token = await browser.storage.local.get("apikey");
    if (!Object.prototype.hasOwnProperty.call(token, "apikey") || token.apikey === "") {
        NOAPIKEYDIV.classList.remove("hidden");
        SEARCH.classList.add("hidden");
    } else {
        NOAPIKEYDIV.classList.add("hidden");
        SEARCH.classList.remove("hidden");
    }
}

function onLinkClick(e: MouseEvent) {
    e.preventDefault();
    if (e.button === 1 || e.ctrlKey) {
        browser.tabs.create({ url: (e.target as HTMLLinkElement).href });
    } else {
        browser.tabs.update(undefined, { url: (e.target as HTMLLinkElement).href });
    }
}

function showPins(filter?: string) {
    for (const elem of Array.from(PINSLIST.children) as HTMLElement[]) {
        if (elem.id !== TEMPLATELI.id) {
            elem.remove();
        }
    }
    TEMPLATELI.classList.remove("hidden");
    for (const pin of pins.filterWithOptions(filter || "", options)) {
        if (typeof pin === "number") {
            continue;
        }
        const li = TEMPLATELI.cloneNode(true) as HTMLLIElement;
        li.id = "";
        li.children[0].textContent = pin.description;
        (li.children[0] as HTMLAnchorElement).href = pin.url;
        (li.children[0] as HTMLAnchorElement).title = pin.url;
        PINSLIST.appendChild(li);
    }
    TEMPLATELI.classList.add("hidden");
}

function onSearchInput(e: Event) {
    showPins((e.target as HTMLInputElement).value);
}
