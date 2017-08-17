///<reference path="pin.ts" />
"use strict";
class Pins extends Map {
    static async updateList(forceUpdate = false) {
        const token = await browser.storage.local.get(["apikey", "lastupdate", "lastsync", "pins"]);
        // Plus 5 at the end for buffer, in order for the alarm to trigger this usually.
        if (token.apikey === "" || (!forceUpdate && !!token.lastsync &&
            new Date(token.lastsync) > new Date(Date.now() - 1000 * 60 * 5 + 5))) {
            return Pins.getObject();
        }
        const lastUpdate = await connector.getLastUpdate();
        // To compare Dates: https://stackoverflow.com/a/493018
        if (!forceUpdate && !!token.pins && token.pins.length > 0 && !!token.lastupdate &&
            new Date(token.lastupdate).getTime() === lastUpdate.getTime()) {
            return Pins.getObject();
        }
        return Pins.sendRequestAllPins(lastUpdate);
    }
    /**
     * Requests all pins from pinboard
     * @param lastUpdate Timestamp of the last update requested before,
     * so the storage can be updated if it was successful
     */
    static async sendRequestAllPins(lastUpdate) {
        const pins = new Pins();
        const json = await connector.getAllPins();
        json.reverse().forEach((pin) => {
            pins.set(pin.href, new Pin(
            // pinboard API gets pin with attribute href, and addPin wants url. so we standardise to url
            pin.href, pin.description, pin.tags, pin.time, pin.extended, pin.toread, pin.shared));
        });
        pins.saveToStorage();
        browser.storage.local.set({ lastupdate: lastUpdate.getTime() });
        browser.storage.local.set({ lastsync: new Date().getTime() });
        return pins;
    }
    static async getObject() {
        const res = await browser.storage.local.get("pins");
        if (res.pins === undefined) {
            return new Pins();
        }
        else {
            return new Pins(res.pins);
        }
    }
    constructor(i) {
        super(i);
    }
    set(key, pin) {
        super.set(key, pin);
        return this;
    }
    delete(key) {
        const result = super.delete(key);
        this.saveToStorage();
        return result;
    }
    addPin(pin) {
        this.set(pin.url, pin);
        this.saveToStorage();
    }
    *forEachReversed() {
        for (const [url, pin] of Array.from(this.entries()).reverse()) {
            yield pin;
        }
    }
    saveToStorage() {
        browser.storage.local.set({ pins: Array.from(this.entries()) });
    }
}
//# sourceMappingURL=pins.js.map