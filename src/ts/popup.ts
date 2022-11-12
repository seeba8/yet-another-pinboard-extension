import type { Browser } from "webextension-polyfill";
declare let browser: Browser;
import { executeTitleRegex } from "./shared-functions.js";
import { Pins } from "./pins.js";
import { Pin } from "./pin.js";
import { IStyle, Options } from "./options.js";

// Elements
const bookmarkList = document.getElementById("bookmarks") as HTMLUListElement;
const filterTextbox = document.getElementById("filter") as HTMLInputElement;
const resetBtn = document.getElementById("resetbutton") as HTMLButtonElement;
const toReadSvg = document.getElementById("toreadsvg");
const sharedSvg = document.getElementById("sharedsvg");
const editSvg = document.getElementById("editsvg");

const bookmarkCurrentButton = document.getElementById("bookmarkcurrent") as HTMLLinkElement;
const readLaterCurrentButton = document.getElementById("readlatercurrent") as HTMLLinkElement;
const filterToReadButton = document.getElementById("filterToRead") as HTMLLinkElement;
const greyoutDiv = document.getElementById("greyout") as HTMLDivElement;
const editWrapper = document.getElementById("editwrapper") as HTMLDivElement;
const editForm = document.getElementById("editform") as HTMLFormElement;
const noAPIKeyDiv = document.getElementById("noapikey") as HTMLDivElement;
const prevNext = {
    div: document.getElementById("prevnext") as HTMLDivElement,
    firstPage: document.getElementById("firstPage") as HTMLLinkElement,
    lastPage: document.getElementById("lastPage") as HTMLLinkElement,
    nextPage: document.getElementById("nextPage") as HTMLLinkElement,
    prevPage: document.getElementById("prevPage") as HTMLLinkElement,
};
const editBox = {
    URL: document.getElementById("url") as HTMLInputElement,
    description: document.getElementById("description") as HTMLInputElement,
    extended: document.getElementById("extended") as HTMLTextAreaElement,
    sharedCheckbox: document.getElementById("shared") as HTMLInputElement,
    tags: document.getElementById("tags") as HTMLInputElement,
    toReadCheckbox: document.getElementById("toread") as HTMLInputElement,
};

const suggestionList = document.getElementById("suggestions") as HTMLOListElement;
const suggestionRow = document.getElementById("suggestion-template") as HTMLTemplateElement;
const MAX_SUGGESTIONS = 7;
const PINS_PER_PAGE = 100;

let offset = 0;
export let pins: Pins;
let toReadOnly = false;
export let options: Options;
export const tags = new Array<string>();


editBox.tags.addEventListener("input", onTagTextInput);
editBox.tags.addEventListener("keydown", onTagTextKeyDown);
suggestionList.addEventListener("click", onSuggestionClick);
suggestionList.addEventListener("mouseover", onSuggestionMouseover);
filterTextbox.addEventListener("input", handleFilterChange);
bookmarkCurrentButton.addEventListener("click", handleBookmarkCurrent);
readLaterCurrentButton.addEventListener("click", handleReadLaterCurrent);
filterToReadButton.addEventListener("click", handleFilterToRead);
editForm.addEventListener("submit", handleSubmit);
document.getElementById("delete").addEventListener("click", handleDeletePin);
greyoutDiv.addEventListener("click", () => {
    greyoutDiv.classList.toggle("hidden");
    editWrapper.classList.toggle("hidden");
});
resetBtn.addEventListener("click", () => {
    filterTextbox.value = "";
    handleFilterChange();
});
document.querySelectorAll(".optionslink").forEach((element) => {
    element.addEventListener("click", onOptionsLinkClick);
});
Array.from(prevNext.div.children).forEach((element) => {
    element.addEventListener("click", handlePrevNextClick);
});
document.body.addEventListener("keydown", onKeyDown);
browser.runtime.onMessage.addListener(onMessage);


handleStartup();

async function handleStartup() {
    await Promise.all([loadOptions(), reloadPins()/*, getDPI()*/]);
    filterTextbox.focus();
    collectTags();
    browser.runtime.sendMessage({ "callFunction": "popupOpened" });
}

function onMessage(data: any) {
    if (data.callFunction === "createBookmark") {
        handleBookmarkCurrent(undefined);
    }
}

function collectTags() {
    const tagsMap = new Map<string, number>();
    // console.time("collectTags");
    for (const pin of pins.forEachReversed()) {
        if (pin.tags !== "") {
            for (const tag of pin.tags.split(" ")) {
                const num = tagsMap.get(tag);
                if (num === undefined) {
                    tagsMap.set(tag, 1);
                } else {
                    tagsMap.set(tag, num + 1);
                }
            }
        }
    }
    // console.timeEnd("collectTags");
    // console.time("sortTags");
    // sort map accpording to https://stackoverflow.com/a/48324540
    tagsMap[Symbol.iterator] = function* () {
        yield* [...this.entries()].sort((a, b) => b[1] - a[1]);
    }
    for (const [key, ] of tagsMap) {
        tags.push(key);
    }
    // console.timeEnd("sortTags");
}

async function loadOptions() {
    options = await Options.getObject();
    setColorVariables(options.style);
    editBox.sharedCheckbox.checked = options.sharedByDefault;
    // currently (november 7, 2017) only works in chrome, for firefox, see bug:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1324255
}
/*
async function loadLastSync() {
    const token = await browser.storage.local.get(["lastsync"]);
    optionsButton.title = "Last bookmark sync: " + new Date(token.lastsync);
}
*/
function onOptionsLinkClick() {
    browser.runtime.openOptionsPage();
    window.close();
}

async function reloadPins() {
    const token = await browser.storage.local.get(["apikey"]);
    if (!token.apikey || token.apikey === "") {
        noAPIKeyDiv.classList.remove("hidden");
        return;
    }
    pins = await Pins.getObject();
    displayPins();
}

function handleDeletePin(e: MouseEvent) {
    e.preventDefault();
    browser.runtime.sendMessage({
        callFunction: "deleteBookmark",
        pin: pins.get(editBox.URL.value),
    });
    pins.delete(editBox.URL.value);
    displayPins();
    editWrapper.classList.toggle("hidden");
    greyoutDiv.classList.toggle("hidden");
}

async function handleReadLaterCurrent(e: MouseEvent) {
    e.preventDefault();
    const tabs = await browser.tabs.query({ currentWindow: true, active: true });
    const tab = tabs[0];
    const title = executeTitleRegex(tab.title, options.titleRegex);
    const pin = new Pin(tab.url, title, undefined, undefined, undefined, "yes", "no");
    addPin(pin);
}

async function handleBookmarkCurrent(e: MouseEvent) {
    if (e !== undefined) {
        e.preventDefault();
    }
    document.getElementById("editwrapper").classList.toggle("hidden");
    document.getElementById("greyout").classList.toggle("hidden");
    const tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
    editBox.description.value = executeTitleRegex(tab.title, options.titleRegex);
    editBox.URL.value = tab.url;
    editBox.toReadCheckbox.checked = false;
    editBox.tags.value = "";
    editBox.description.focus();
}

function preparePrevNext(numberPins: number) {
    Array.from(prevNext.div.children).forEach((element) => {
        element.classList.remove("linkdisabled", "currentpage");
    });
    const firstPage = Math.min(Math.max(1, offset / PINS_PER_PAGE - 1), Math.max(Math.ceil(numberPins / PINS_PER_PAGE) - 4, 1));
    for (let i = 0; i < 5; i++) {
        const curElement = document.getElementById("pageNo" + (i + 1).toString());
        curElement.textContent = String(firstPage + i);
        curElement.dataset.offset = String((firstPage + i - 1) * PINS_PER_PAGE);
        if (curElement.dataset.offset === String(offset)) {
            curElement.classList.add("currentpage", "linkdisabled");
        } else if (parseInt(curElement.dataset.offset, 10) > numberPins) {
            curElement.classList.add("linkdisabled");
        }
    }
    prevNext.prevPage.dataset.offset = String(offset - PINS_PER_PAGE);
    prevNext.nextPage.dataset.offset = String(offset + PINS_PER_PAGE);
    prevNext.firstPage.dataset.offset = String(0);
    prevNext.lastPage.dataset.offset = String(PINS_PER_PAGE * Math.floor(numberPins / PINS_PER_PAGE));

    if (offset === 0) {
        prevNext.firstPage.classList.add("linkdisabled");
        prevNext.prevPage.classList.add("linkdisabled");
    }
    if (offset === PINS_PER_PAGE * Math.floor(numberPins / PINS_PER_PAGE) || numberPins <= PINS_PER_PAGE) {
        prevNext.lastPage.classList.add("linkdisabled");
        prevNext.nextPage.classList.add("linkdisabled");
    }
}

function handlePrevNextClick(e: Event) {
    const newOffset = parseInt((e.target as HTMLElement).dataset.offset, 10);
    if (newOffset < 0 || newOffset > pins.size) {
        return;
    }
    offset = newOffset;
    displayPins();
}

function handleSubmit(e: Event) {
    e.preventDefault();
    let pin = pins.get(editBox.URL.dataset.entryId);
    if (pin === undefined) {
        pin = new Pin(editBox.URL.value);
    }
    pin.description = editBox.description.value;
    pin.time = new Date().toISOString();
    pin.tags = editBox.tags.value;
    pin.toread = (editBox.toReadCheckbox.checked ? "yes" : "no");
    pin.shared = (editBox.sharedCheckbox.checked ? "yes" : "no");
    pin.extended = editBox.extended.value;
    addPin(pin);
    document.getElementById("editwrapper").classList.toggle("hidden");
    document.getElementById("greyout").classList.toggle("hidden");
}

function addPin(pin: Pin) {
    pins.addPin(pin);
    browser.runtime.sendMessage({
        callFunction: "saveBookmark",
        pin,
    });
    displayPins();
}

function displayPins() {
    const filter = filterTextbox.value.toLowerCase();
    while (bookmarkList.firstChild) {
        bookmarkList.removeChild(bookmarkList.firstChild);
    }
    let c = 0;
    for (const pin of pins.filterWithOptions(filter, options, { toRead: toReadOnly, offset, count: PINS_PER_PAGE })) {
        if (pin instanceof Pin) {
            addListItem(pin, pin.url);
        } else {
            c = pin;
        }
    }
    preparePrevNext(c);
}

function handleFilterChange() {
    offset = 0;
    displayPins();
}

function handleFilterToRead(e: MouseEvent) {
    (e.target as HTMLElement).classList.toggle("bold");
    toReadOnly = !toReadOnly;
    offset = 0;
    displayPins();
}

function handleEditBookmark(e: MouseEvent) {
    e.preventDefault();
    const pin = pins.get((e.target as HTMLElement).dataset.entryId);
    editBox.description.value = pin.description || "";
    editBox.URL.value = pin.url;
    editBox.tags.value = pin.tags || "";
    editBox.toReadCheckbox.checked = (pin.toread === "yes");
    editBox.sharedCheckbox.checked = (pin.shared === "yes");
    editWrapper.classList.toggle("hidden");
    greyoutDiv.classList.toggle("hidden");
    editBox.URL.dataset.entryId = (e.target as HTMLElement).dataset.entryId;
    editBox.extended.value = pin.extended || "";
    editBox.description.focus();
}

function handleLinkClick(e: MouseEvent) {
    e.preventDefault();
    if (e.button === 1 || e.ctrlKey) {
        browser.tabs.create({ url: (e.target as HTMLLinkElement).href });
    } else {
        browser.tabs.update(undefined, { url: (e.target as HTMLLinkElement).href });
    }
    window.close();
}

function handleBookmarkRead(e: MouseEvent) {
    e.preventDefault();
    const pin = pins.get((e.target as HTMLElement).dataset.entryId);
    pin.toread = "no";
    browser.runtime.sendMessage({
        callFunction: "saveBookmark",
        pin,
    });
    (e.target as HTMLElement).classList.toggle("invisible");
}

function addListItem(pin: Pin, key: string) {
    function addEditSymbol() {
        const edit = document.createElement("a");
        edit.title = "Edit";
        const img = editSvg.cloneNode(true) as HTMLElement;
        img.classList.add("icon", "edit");
        img.id = "";
        img.classList.remove("hidden");
        edit.appendChild(img);
        edit.addEventListener("click", handleEditBookmark);
        edit.dataset.entryId = key;
        edit.classList.add("button");
        entry.appendChild(edit);
    }
    function addMainLink() {
        const link = document.createElement("a");
        link.href = pin.url;
        link.addEventListener("click", handleLinkClick);
        link.id = key;
        const textcontent = pin.description === "Twitter" ?
            (pin.extended !== "" ? "(Twitter) " + pin.extended : pin.description) : pin.description;
        link.appendChild(document.createTextNode(textcontent));
        link.title = pin.url || "";
        entry.appendChild(link);
    }
    function addSharedSymbol() {
        const sharedsymbol = document.createElement("div");
        const img = sharedSvg.cloneNode(true) as HTMLElement;
        img.classList.add("icon", "shared");
        img.id = "";
        img.classList.remove("hidden");
        sharedsymbol.appendChild(img);
        sharedsymbol.title = "Shared";
        sharedsymbol.dataset.entryId = key;
        sharedsymbol.classList.add("shared");
        if (pin.shared === "no") {
            sharedsymbol.classList.add("invisible");
        }
        entry.appendChild(sharedsymbol);
    }
    function addToReadSymbol() {
        const toreadeye = document.createElement("a");
        const img = toReadSvg.cloneNode(true) as HTMLElement;
        img.classList.add("icon");
        img.id = "";
        toreadeye.appendChild(img);
        // toreadeye.appendChild(document.createTextNode(""));
        toreadeye.addEventListener("click", handleBookmarkRead);
        toreadeye.classList.add("button", "toread");
        toreadeye.title = "Mark as read";
        toreadeye.dataset.entryId = key;
        if (pin.toread === "no") {
            toreadeye.classList.add("invisible");
        }
        entry.appendChild(toreadeye);
    }
    const entry = document.createElement("li");
    addEditSymbol();
    addMainLink();
    addSharedSymbol();
    addToReadSymbol();
    bookmarkList.appendChild(entry);
}

function setColorVariables(style: IStyle) {
    document.documentElement.style.setProperty("--text-color", style.textColor);
    document.documentElement.style.setProperty("--background-color", style.backgroundColor);
    document.documentElement.style.setProperty("--link-color", style.linkColor);
    document.documentElement.style.setProperty("--visited-color", style.visitedColor);
    document.documentElement.style.setProperty("--disabled-color", style.disabledColor);
}

function onKeyDownTextbox(e: KeyboardEvent) {
    if (e.key === "Enter") {
        (bookmarkList.children[0].children[1] as HTMLElement).focus();
    } else if (e.key === "Escape") {
        if (filterTextbox.value !== "") {
            e.preventDefault();
            e.stopPropagation();
            filterTextbox.value = "";
            displayPins();
        }
    }
}

function onKeyDownBookmarkList(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
        (document.activeElement.closest("li").nextElementSibling.children[1] as HTMLElement).focus();
        e.preventDefault();
        return;
    } else if (e.key === "ArrowUp") {
        (document.activeElement.closest("li").previousElementSibling.children[1] as HTMLElement).focus();
        e.preventDefault();
        return;
    } else if (e.key === "F2") {
        (document.activeElement.closest("li").children[0] as HTMLElement).click();
    }
}

function onKeyDownEditWrapper(e: KeyboardEvent) {
    if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        const url = editBox.URL.dataset.entryId;
        greyoutDiv.click();
        document.getElementById(url).focus();
    }
}

function onKeyDown(e: KeyboardEvent) {
    if (e.target === filterTextbox) {
        onKeyDownTextbox(e);
        return;
    }
    if (e.key === "ArrowLeft") {
        prevNext.prevPage.click();
        (bookmarkList.children[0].children[1] as HTMLElement).focus();
        return;
    } else if (e.key === "ArrowRight") {
        prevNext.nextPage.click();
        (bookmarkList.children[0].children[1] as HTMLElement).focus();
        return;
    } else if (e.key === "f" && e.ctrlKey) {
        filterTextbox.focus();
        return;
    }
    if (bookmarkList.contains(document.activeElement)) {
        onKeyDownBookmarkList(e);
        return;
    }
    if (!editWrapper.classList.contains("hidden")) {
        onKeyDownEditWrapper(e);
        return;
    }
    // Todo: More keyboard controls: e.g. to save bookmark, to filter for toread, ...
    // Escape key capturing does not work on firefox
}

// suggestions

function acceptSuggestion(suggestionText: string) {
    editBox.tags.value = editBox.tags.value.slice(0, editBox.tags.value.lastIndexOf(" ") + 1) + suggestionText + " ";
    editBox.tags.focus();
    clearSuggestionList();
}

function fillSuggestionList(currentToken: string) {
    let numSuggestions = 0;
    for (const o of tags) {
        if (numSuggestions < MAX_SUGGESTIONS && o.toLocaleLowerCase().startsWith(currentToken)) {
            const clone = suggestionRow.content.cloneNode(true) as HTMLElement;
            clone.firstElementChild.textContent = o;
            suggestionList.appendChild(clone);
            numSuggestions++;
        }
    }
    if (suggestionList.children.length > 0) {
        suggestionList.firstElementChild.classList.toggle("selected");
        suggestionList.classList.remove("hidden");
    }
}

function clearSuggestionList() {
    while (suggestionList.lastChild) {
        suggestionList.lastChild.remove();
    }
    suggestionList.classList.add("hidden");
}

function getCurrentToken() {
    const inputText = String(editBox.tags.value);
    return inputText.slice(inputText.lastIndexOf(" ") + 1).trim().toLocaleLowerCase();
}

function onTagTextKeyDown(e: KeyboardEvent) {

    const selectedSuggestion = document.getElementsByClassName("selected").item(0);
    if (selectedSuggestion === null) { return; }
    switch (e.code) {
        case "ArrowDown":
            e.stopPropagation();
            e.preventDefault();
            if (selectedSuggestion.nextElementSibling) {
                selectedSuggestion.classList.toggle("selected");
                selectedSuggestion.nextElementSibling.classList.toggle("selected");
            }
            break;
        case "ArrowUp":
            e.stopPropagation();
            e.preventDefault();
            if (selectedSuggestion.previousElementSibling) {
                selectedSuggestion.classList.toggle("selected");
                selectedSuggestion.previousElementSibling.classList.toggle("selected");
            }
            break;
        case "Enter":
        case "Tab":
            e.stopPropagation();
            e.preventDefault();
            acceptSuggestion(selectedSuggestion.textContent);
            break;
    }
}

function onTagTextInput() {
    clearSuggestionList();
    const currentToken = getCurrentToken();
    if (currentToken === "") { return; }
    fillSuggestionList(currentToken);

}

function onSuggestionMouseover(e: MouseEvent) {
    if ((e.target as HTMLElement).id === "suggestions") { return; }
    const selectedSuggestion = document.getElementsByClassName("selected").item(0);
    selectedSuggestion.classList.toggle("selected");
    (e.target as HTMLElement).classList.toggle("selected");
}

function onSuggestionClick(e: MouseEvent) {
    if ((e.target as HTMLElement).id === "suggestions") { return; }
    acceptSuggestion((e.target as HTMLElement).textContent);
}
