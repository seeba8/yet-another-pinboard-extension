var PopupPage;
(function (PopupPage) {
    // Elements
    const bookmarkList = document.getElementById("bookmarks");
    const filterTextbox = document.getElementById("filter");
    const searchForm = document.getElementById("searchform");
    const bookmarkCurrentButton = document.getElementById("bookmarkcurrent");
    const readLaterCurrentButton = document.getElementById("readlatercurrent");
    const filterToReadButton = document.getElementById("filterToRead");
    const greyoutDiv = document.getElementById("greyout");
    const editWrapper = document.getElementById("editwrapper");
    const optionsButton = document.getElementById("optionslink");
    const editForm = document.getElementById("editform");
    const noAPIKeyDiv = document.getElementById("noapikey");
    const tagSuggestionsDiv = document.getElementById("tagsuggestions");
    const prevNext = {
        div: document.getElementById("prevnext"),
        firstPage: document.getElementById("firstPage"),
        lastPage: document.getElementById("lastPage"),
        nextPage: document.getElementById("nextPage"),
        prevPage: document.getElementById("prevPage"),
    };
    const editBox = {
        URL: document.getElementById("url"),
        description: document.getElementById("description"),
        extended: document.getElementById("extended"),
        sharedCheckbox: document.getElementById("shared"),
        tags: document.getElementById("tags"),
        toReadCheckbox: document.getElementById("toread"),
    };
    let offset = 0;
    let toReadOnly = false;
    filterTextbox.addEventListener("keyup", handleFilterChange);
    bookmarkCurrentButton.addEventListener("click", handleBookmarkCurrent);
    readLaterCurrentButton.addEventListener("click", handleReadLaterCurrent);
    filterToReadButton.addEventListener("click", handleFilterToRead);
    editForm.addEventListener("submit", handleSubmit);
    document.getElementById("delete").addEventListener("click", handleDeletePin);
    greyoutDiv.addEventListener("click", (e) => {
        greyoutDiv.classList.toggle("hidden");
        editWrapper.classList.toggle("hidden");
    });
    searchForm.addEventListener("reset", (e) => {
        filterTextbox.value = "";
        handleFilterChange(e);
    });
    document.querySelectorAll(".optionslink").forEach((element) => {
        element.addEventListener("click", onOptionsLinkClick);
    });
    Array.from(prevNext.div.children).forEach((element) => {
        element.addEventListener("click", handlePrevNextClick);
    });
    handleStartup();
    reloadPins();
    async function handleStartup() {
        const token = await browser.storage.local.get(["lastsync"]);
        const options = await Options.getObject();
        editBox.sharedCheckbox.checked = options.sharedByDefault;
        optionsButton.title = "Last bookmark sync: " + new Date(token.lastsync);
    }
    function onOptionsLinkClick(e) {
        browser.runtime.openOptionsPage();
        window.close();
    }
    async function reloadPins() {
        const token = await browser.storage.local.get(["apikey"]);
        if (!token.apikey || token.apikey === "") {
            noAPIKeyDiv.classList.toggle("hidden");
        }
        PopupPage.pins = await Pins.getObject();
        displayPins();
    }
    function handleDeletePin(e) {
        e.preventDefault();
        browser.runtime.sendMessage({
            callFunction: "deleteBookmark",
            pin: PopupPage.pins.get(editBox.URL.value),
        });
        PopupPage.pins.delete(editBox.URL.value);
        displayPins();
        editWrapper.classList.toggle("hidden");
        greyoutDiv.classList.toggle("hidden");
    }
    async function handleReadLaterCurrent(e) {
        e.preventDefault();
        const tabs = await browser.tabs.query({ currentWindow: true, active: true });
        const tab = tabs[0];
        const pin = new Pin(tab.url, tab.title, undefined, undefined, undefined, "yes", "no");
        addPin(pin, true);
    }
    async function handleBookmarkCurrent(e) {
        e.preventDefault();
        document.getElementById("editwrapper").classList.toggle("hidden");
        document.getElementById("greyout").classList.toggle("hidden");
        const tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
        editBox.description.value = tab.title;
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
    function handleAddTag(e) {
        editBox.tags.value += " " + e.target.textContent;
        e.target.parentElement.removeChild(e.target);
    }
    function preparePrevNext(numberPins) {
        Array.from(prevNext.div.children).forEach((element) => {
            element.classList.remove("linkdisabled");
            element.classList.remove("currentpage");
        });
        const firstPage = Math.min(Math.max(1, offset / 100 - 1), Math.max(Math.ceil(numberPins / 100) - 4, 1));
        for (let i = 0; i < 5; i++) {
            const curElement = document.getElementById("pageNo" + (i + 1).toString());
            curElement.textContent = String(firstPage + i);
            curElement.dataset.offset = String((firstPage + i - 1) * 100);
            if (curElement.dataset.offset === String(offset)) {
                curElement.classList.add("currentpage");
            }
            else if (parseInt(curElement.dataset.offset, 10) > numberPins) {
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
    function handlePrevNextClick(e) {
        offset = parseInt(e.target.dataset.offset, 10);
        displayPins();
    }
    function handleSubmit(e) {
        e.preventDefault();
        let pin = PopupPage.pins.get(editBox.URL.dataset.entryId);
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
        addPin(pin, newPin);
        document.getElementById("editwrapper").classList.toggle("hidden");
        document.getElementById("greyout").classList.toggle("hidden");
    }
    function addPin(pin, newPin) {
        PopupPage.pins.addPin(pin);
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
        for (const pin of PopupPage.pins.forEachReversed()) {
            if ((pin.toread === "yes" || !toReadOnly) && (filter === "" || pinContains(pin, filter))) {
                if (c >= offset && c < offset + 100) {
                    addListItem(pin, pin.url);
                }
                c++;
            }
        }
        preparePrevNext(c);
    }
    function pinContains(pin, searchText) {
        return (contains(pin.description, searchText) || contains(pin.url, searchText) ||
            contains(pin.tags, searchText) || contains(pin.extended, searchText));
    }
    function contains(haystack, needle) {
        return haystack.toLowerCase().indexOf(needle.toLowerCase()) > -1;
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
        const pin = PopupPage.pins.get(e.target.dataset.entryId);
        editBox.description.value = pin.description || "";
        editBox.URL.value = pin.url;
        editBox.tags.value = pin.tags || "";
        editBox.toReadCheckbox.checked = (pin.toread === "yes");
        editBox.sharedCheckbox.checked = (pin.shared === "yes");
        editWrapper.classList.toggle("hidden");
        greyoutDiv.classList.toggle("hidden");
        editBox.URL.dataset.entryId = e.target.dataset.entryId;
        editBox.extended.value = pin.extended || "";
    }
    function handleLinkClick(e) {
        e.preventDefault();
        if (e.button === 1 || e.ctrlKey) {
            browser.tabs.create({ url: e.target.href });
        }
        else {
            browser.tabs.update(undefined, { url: e.target.href });
        }
        window.close();
    }
    function handleBookmarkRead(e) {
        e.preventDefault();
        const pin = PopupPage.pins.get(e.target.dataset.entryId);
        pin.toread = "no";
        browser.runtime.sendMessage({
            callFunction: "saveBookmark",
            isNewPin: false,
            pin,
        });
        e.target.classList.toggle("invisible");
    }
    function addListItem(pin, key) {
        function addEditSymbol() {
            const edit = document.createElement("a");
            edit.title = "Edit";
            edit.appendChild(document.createTextNode("\u{270E}"));
            edit.addEventListener("click", handleEditBookmark);
            edit.dataset.entryId = key;
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
            const sharedsymbol = document.createElement("a");
            sharedsymbol.appendChild(document.createTextNode("\u{1f4e2}"));
            sharedsymbol.title = "Shared";
            sharedsymbol.dataset.entryId = key;
            sharedsymbol.classList.add("unclickable");
            if (pin.shared === "no") {
                sharedsymbol.classList.add("invisible");
            }
            entry.appendChild(sharedsymbol);
        }
        function addToReadSymbol() {
            const toreadeye = document.createElement("a");
            toreadeye.appendChild(document.createTextNode("\u{1f441}"));
            toreadeye.addEventListener("click", handleBookmarkRead);
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
})(PopupPage || (PopupPage = {}));
//# sourceMappingURL=popup.js.map