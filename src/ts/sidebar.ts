/// <reference path="pins.ts" />
/// <reference path="pin.ts" />

namespace Sidebar {
    let pins: Pins;
    const PINSLIST = document.getElementById("pins") as HTMLUListElement;
    const SEARCH = document.getElementById("search") as HTMLInputElement;
    const TEMPLATELI = document.getElementById("templateli");
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
        pins = await Pins.getObject();
        showPins();
        browser.storage.onChanged.addListener(onStorageChanged);
    }

    async function onStorageChanged(changes: browser.storage.ChangeDict, areaName: browser.storage.StorageName) {
        if (Object.keys(changes).includes("pins")) {
            pins = await Pins.getObject();
            showPins();
        }
    }

    function onLinkClick(e) {

        e.preventDefault();
        if (e.button === 1 || e.ctrlKey) {
            browser.tabs.create({ url: e.target.href });
        } else {
            browser.tabs.update(undefined, {url: e.target.href});
        }
    }

    function showPins(filter?: string) {
        for (const elem of Array.from(PINSLIST.children) as HTMLElement[]) {
            if (elem.id !== TEMPLATELI.id) {
                elem.remove();
            }
        }
        TEMPLATELI.classList.remove("hidden");
        for (const pin of pins.filter(filter)) {
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
}
