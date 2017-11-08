namespace PopupPage {
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
const optionsButton = document.getElementById("optionslink") as HTMLLinkElement;
const editForm = document.getElementById("editform") as HTMLFormElement;
const noAPIKeyDiv = document.getElementById("noapikey") as HTMLDivElement;
const tagSuggestionsDiv = document.getElementById("tagsuggestions") as HTMLDivElement;
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

let offset = 0;
export let pins: Pins;
let toReadOnly = false;
export let options: Options;

filterTextbox.addEventListener("input", handleFilterChange);
bookmarkCurrentButton.addEventListener("click", handleBookmarkCurrent);
readLaterCurrentButton.addEventListener("click", handleReadLaterCurrent);
filterToReadButton.addEventListener("click", handleFilterToRead);
editForm.addEventListener("submit", handleSubmit);
document.getElementById("delete").addEventListener("click", handleDeletePin);
greyoutDiv.addEventListener("click", (e) => {
    greyoutDiv.classList.toggle("hidden");
    editWrapper.classList.toggle("hidden");
});
resetBtn.addEventListener("click", (e) => {
    filterTextbox.value = "";
    handleFilterChange(e);
});
document.querySelectorAll(".optionslink").forEach((element) => {
    element.addEventListener("click", onOptionsLinkClick);
});
Array.from(prevNext.div.children).forEach((element) => {
    element.addEventListener("click", handlePrevNextClick);
});
document.body.addEventListener("keydown", onKeyDown);

handleStartup();

async function getDPI() {
    if (window.navigator.userAgent.indexOf("Gecko/") === -1) {
        // Don't adjust for Chrome, as it has a different problem entirely
        return;
    }
    let dppx = 1;
    try {
        const res = await browser.tabs.executeScript(undefined, {code: "window.devicePixelRatio;"});
        dppx = Number(res[0]);
        browser.storage.local.set({popupdppx : dppx});
    } catch (error) {
        // This happens if we do not have permission to run execute script
        // For example on browser-internal pages such as about:addons or about:newtab
        const res = await browser.storage.local.get("popupdppx");
        if (res.hasOwnProperty("popupdppx")) {
            dppx = res.popupdppx;
        }
    }
    if (dppx !== window.devicePixelRatio) {
        document.body.style.transform = `scale(${dppx / window.devicePixelRatio})`;
        document.body.style.transformOrigin = "top left";
    }
}

async function handleStartup() {
    await Promise.all([loadOptions(), reloadPins(), getDPI()]);
    filterTextbox.focus();

}

async function loadOptions() {
    options = await Options.getObject();
    setColorVariables(options.style);
    editBox.sharedCheckbox.checked = options.sharedByDefault;
    // currently (november 7, 2017) only works in chrome, for firefox, see bug:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1324255
}

async function loadLastSync() {
    const token = await browser.storage.local.get(["lastsync"]);
    optionsButton.title = "Last bookmark sync: " + new Date(token.lastsync);
}

function onOptionsLinkClick(e) {
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

function handleDeletePin(e) {
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

async function handleReadLaterCurrent(e) {
    e.preventDefault();
    const tabs = await browser.tabs.query({currentWindow: true, active: true});
    const tab = tabs[0];
    const title = SharedFunctions.executeTitleRegex(tab.title, options.titleRegex);
    const pin = new Pin(tab.url, title, undefined, undefined, undefined, "yes", "no");
    addPin(pin);
}

async function handleBookmarkCurrent(e) {
    function handleAddTag(ev) {
        editBox.tags.value += " " + ev.target.textContent;
        ev.target.parentElement.removeChild(ev.target);
    }

    e.preventDefault();
    document.getElementById("editwrapper").classList.toggle("hidden");
    document.getElementById("greyout").classList.toggle("hidden");
    const tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
    editBox.description.value = SharedFunctions.executeTitleRegex(tab.title, options.titleRegex);
    editBox.URL.value = tab.url;
    editBox.toReadCheckbox.checked = false;
    editBox.tags.value = "";
    const tagSuggestions = await browser.runtime.sendMessage({
        callFunction: "getTagSuggestions",
        url: tab.url,
    });
    tagSuggestions.forEach((tag) => {
        const t = document.createElement("a");
        t.addEventListener("click", handleAddTag);
        t.appendChild(document.createTextNode(tag));
        tagSuggestionsDiv.appendChild(t);
        tagSuggestionsDiv.appendChild(document.createTextNode(" "));
    });
}

function preparePrevNext(numberPins) {
    Array.from(prevNext.div.children).forEach((element) => {
        element.classList.remove("linkdisabled", "currentpage");
    });
    const firstPage = Math.min(Math.max(1, offset / 100 - 1), Math.max(Math.ceil(numberPins / 100) - 4, 1));
    for (let i = 0; i < 5; i++) {
        const curElement = document.getElementById("pageNo" + (i + 1).toString());
        curElement.textContent = String(firstPage + i);
        curElement.dataset.offset = String((firstPage + i - 1) * 100);
        if (curElement.dataset.offset === String(offset)) {
            curElement.classList.add("currentpage", "linkdisabled");
        } else if (parseInt(curElement.dataset.offset, 10) > numberPins) {
            curElement.classList.add("linkdisabled");
        }
    }
    prevNext.prevPage.dataset.offset = String(offset - 100);
    prevNext.nextPage.dataset.offset = String(offset + 100);
    prevNext.firstPage.dataset.offset = String(0);
    prevNext.lastPage.dataset.offset = String(100 * Math.floor(numberPins / 100));

    if (offset === 0) {
        prevNext.firstPage.classList.add("linkdisabled");
        prevNext.prevPage.classList.add("linkdisabled");
    }
    if (offset === 100 * Math.floor(numberPins / 100) || numberPins <= 100) {
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

function handleSubmit(e) {
    e.preventDefault();
    let pin = pins.get(editBox.URL.dataset.entryId);
    let newPin = false;
    if (pin === undefined) {
        pin = new Pin(editBox.URL.value);
        newPin = true;
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
    for (const pin of pins.filter(filter, {toRead: toReadOnly, offset, count: 100})) {
        if (pin instanceof Pin) {
            addListItem(pin, pin.url);
        } else {
            c = pin;
        }
    }
    preparePrevNext(c);
}

function handleFilterChange(e) {
    offset = 0;
    displayPins();
}

function handleFilterToRead(e) {
    e.target.classList.toggle("bold");
    toReadOnly = !toReadOnly;
    offset = 0;
    displayPins();
}

function handleEditBookmark(e) {
    e.preventDefault();
    const pin = pins.get(e.target.dataset.entryId);
    editBox.description.value = pin.description || "";
    editBox.URL.value = pin.url;
    editBox.tags.value = pin.tags || "";
    editBox.toReadCheckbox.checked = (pin.toread === "yes");
    editBox.sharedCheckbox.checked = (pin.shared === "yes");
    editWrapper.classList.toggle("hidden");
    greyoutDiv.classList.toggle("hidden");
    editBox.URL.dataset.entryId = e.target.dataset.entryId;
    editBox.extended.value = pin.extended || "";
    editBox.description.focus();
}

function handleLinkClick(e) {
    e.preventDefault();
    if (e.button === 1 || e.ctrlKey) {
        browser.tabs.create({ url: e.target.href });
    } else {
        browser.tabs.update(undefined, { url: e.target.href });
    }
    window.close();
}

function handleBookmarkRead(e) {
    e.preventDefault();
    const pin = pins.get(e.target.dataset.entryId);
    pin.toread = "no";
    browser.runtime.sendMessage({
        callFunction: "saveBookmark",
        pin,
    });
    e.target.classList.toggle("invisible");
}

function addListItem(pin, key) {
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
}
