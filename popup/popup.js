var bookmarkList = document.getElementById("bookmarks");
var offset = 0;
var pins;

document.getElementById("filter").addEventListener("keyup", handleFilterChange);
document.getElementById("searchform").addEventListener("reset", (e) => {
    document.getElementById("filter").value = "";
    handleFilterChange(e);
});
document.getElementById("bookmarkcurrent").addEventListener("click", handleBookmarkCurrent);

//document.getElementById("deleteBookmark").addEventListener("click", handleDelete);
document.getElementById("editform").addEventListener("submit", handleSubmit);
document.getElementById("greyout").addEventListener("click", (e) => {
    e.target.classList.toggle("hidden");
    document.getElementById("editwrapper").classList.toggle("hidden");
});

document.getElementById("optionspage").addEventListener("click", (e) => {
    browser.runtime.openOptionsPage();
    window.close();
});
document.getElementById("optionslink").addEventListener("click", (e) => {
    browser.runtime.openOptionsPage();
    window.close();
});

Array.from(document.getElementById("prevnext").children).forEach(element => {
    element.addEventListener("click", handlePrevNextClick);
});

reloadPins();

function reloadPins() {
    browser.storage.local.get(["apikey", "pins"]).then((token) => {
        if(!token.apikey || token.apikey == "") {
           document.getElementById("noapikey").classList.toggle("hidden");
        }
        pins = new Map(token.pins);
        displayPins();
    });
 }


function handleBookmarkCurrent(e) {
    document.getElementById("editwrapper").classList.toggle("hidden");
    document.getElementById("greyout").classList.toggle("hidden");
    browser.tabs.query({ currentWindow: true, active: true }).then((tab) => {
        tab = tab[0];
        document.getElementById("description").value = tab.title;
        document.getElementById("url").value = tab.url;
        document.getElementById("toread").checked = false;
        document.getElementById("tags").value = "";
    });
}

function preparePrevNext(numberPins) {
    Array.from(document.getElementById("prevnext").children).forEach(element => {
        element.classList.remove("linkdisabled");
        element.classList.remove("currentpage");
    });
    let firstPage = Math.min(Math.max(1, offset / 100 - 1), Math.max(Math.ceil(numberPins / 100) - 4, 1));
    for (let i = 0; i < 5; i++) {
        let curElement = document.getElementById("pageNo" + (i + 1).toString());
        curElement.firstChild.nodeValue = firstPage + i;
        curElement.dataset.offset = (firstPage + i - 1) * 100;
        if (curElement.dataset.offset == offset) {
            curElement.classList.add("currentpage");
        }
        else if (parseInt(curElement.dataset.offset) > numberPins) {
            curElement.classList.add("linkdisabled");
        }
    }
    document.getElementById("prevPage").dataset.offset = offset - 100;
    document.getElementById("nextPage").dataset.offset = offset + 100;
    document.getElementById("firstPage").dataset.offset = 0;
    document.getElementById("lastPage").dataset.offset = 100 * Math.floor(numberPins / 100);

    if (offset == 0) {
        document.getElementById("firstPage").classList.add("linkdisabled");
        document.getElementById("prevPage").classList.add("linkdisabled");
    }
    if (offset == 100 * Math.floor(numberPins / 100) || numberPins <= 100) {
        document.getElementById("nextPage").classList.add("linkdisabled");
        document.getElementById("lastPage").classList.add("linkdisabled");
    }
}

function handlePrevNextClick(e) {
    offset = parseInt(e.target.dataset["offset"]);
    displayPins();
}

function handleDelete(e) {
    //console.log("Not quite implemented...");
    browser.runtime.sendMessage({
        "callFunction": "deleteBookmark",
        "pin": {"url": document.getElementById("url").value}
    }).then((callback) => {
        // Do nothing?
    });
}

function handleSubmit(e) {
    e.preventDefault();
    let pin = pins.get(document.getElementById("url").dataset.entryId);
    let newPin = false;
    if (pin === undefined) {
        pin = Object();      
        pin.href = document.getElementById("url").value;
        newPin = true;
    }
    pin.description = document.getElementById("description").value;
    pin.time = new Date().toISOString();
    pin.tags = document.getElementById("tags").value;
    pin.toread = (document.getElementById("toread").checked ? "yes" : "no");
    browser.runtime.sendMessage({
        "callFunction":"saveBookmark", 
        "pin":pin, 
        "isNewPin": newPin
    }).then((callback) => {
        //console.log("test4");
        reloadPins();
        document.getElementById("editwrapper").classList.toggle("hidden");
        document.getElementById("greyout").classList.toggle("hidden");
    });
}

function displayPins() {
    let filter = document.getElementById("filter").value.toLowerCase();
    while (bookmarkList.firstChild) {
        bookmarkList.removeChild(bookmarkList.firstChild);
    }
    let c = 0;
    for (var [key, pin] of pins) {
        if (filter == "" || pinContains(pin, filter)) {
            if (c >= offset && c < offset + 100) {
                addListItem(pin, key);
            }
            c++;
        }
    }
    preparePrevNext(c);
}

function pinContains(pin, searchText) {
    return (contains(pin.description, searchText) || contains(pin.href, searchText) || contains(pin.tags, searchText));
}

function contains(haystack, needle) {
    return haystack.toLowerCase().indexOf(needle.toLowerCase()) > -1;
}

function handleFilterChange(e) {
    offset = 0;
    displayPins();
}

function handleEditBookmark(e) {
    e.preventDefault();
    let pin = pins.get(e.target.dataset.entryId);
    document.getElementById("description").value = pin.description || "";
    document.getElementById("url").value = pin.href;
    document.getElementById("tags").value = pin.tags || "";
    document.getElementById("toread").checked = (pin.toread == "yes");
    document.getElementById("editwrapper").classList.toggle("hidden");
    document.getElementById("greyout").classList.toggle("hidden");
    document.getElementById("url").dataset.entryId = e.target.dataset.entryId;
    //document.getElementById("listdiv").style.maxHeight = "360px";
    //document.getElementById("deleteBookmark").dataset["entryId"] = e.target.dataset.entryId;
}

function handleLinkClick(e) {
    e.preventDefault();
    if (e.button == 1 || e.ctrlKey) {
        browser.tabs.create({ url: e.target.href });
    }
    else {
        browser.tabs.update({ url: e.target.href });
    }
    window.close();
}

function addListItem(pin, key) {
    let entry = document.createElement('li');
    let edit = document.createElement("a");
    edit.appendChild(document.createTextNode("\u{270E}"));
    edit.addEventListener("click", handleEditBookmark);
    edit.dataset.entryId = key;
    entry.appendChild(edit);
    let link = document.createElement("a");
    link.href = pin.href;
    link.addEventListener("click", handleLinkClick);
    link.id = key;
    link.appendChild(document.createTextNode(pin.description));
    link.title = pin.tags || "";
    entry.appendChild(link);
    bookmarkList.appendChild(entry);
}