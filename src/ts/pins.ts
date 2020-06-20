///<reference path="pin.ts" />
"use strict";

class Pins extends Map<string, Pin> {
    public static async updateList(forceUpdate: boolean = false): Promise<Pins> {
        if (typeof Connector === "undefined") {
            throw new Error("Wrong scope. Connector does not exist. Only call this from the background script");
        }

        const token = await browser.storage.local.get(["apikey", "pins"]) as { apikey: string, pins: any[] };
        if (!token.hasOwnProperty("apikey") || token.apikey === "") {
            return new Pins();
        }
        const lastSync = await this.getStoredLastSync();
        // Plus 5 at the end for buffer, in order for the alarm to trigger this usually.
        if (!forceUpdate && lastSync.getTime() > new Date(Date.now() - 1000 * 60 * 5 + 5).getTime()) {
            // Not forced and last sync less than 5 minutes ago, therefore we just get the stored object
            return Pins.getObject();
        }
        const lastUpdate = await Connector.getLastUpdate();
        const storedLastUpdate = await this.getStoredLastUpdate();
        // To compare Dates: https://stackoverflow.com/a/493018
        if (!forceUpdate && token.hasOwnProperty("pins") && token.pins.length > 0 &&
            storedLastUpdate.getTime() === lastUpdate.getTime()) {
            // Pinboard's last update is the same as the one stored, and the pins Array is non-empty
            // therefore we just get the stored object
            return Pins.getObject();

        }
        return Pins.sendRequestAllPins(lastUpdate);
    }

    public static async getObject() {
        const res = await browser.storage.local.get("pins") as { pins: any[] };
        if (res.pins === undefined) {
            return new Pins();
        } else {
            const pins = new Pins();
            for (const p of res.pins) {
                pins.set(p[0], Pin.fromObject(p[1]));
            }
            return pins;
        }
    }

    /**
     * Requests all pins from pinboard
     * @param lastUpdate Timestamp of the last update requested before,
     * so the storage can be updated if it was successful
     */
    private static async sendRequestAllPins(lastUpdate) {
        const pins = new Pins();
        const json = await Connector.getAllPins();
        json.reverse().forEach((pin) => {
            pins.set(pin.href, new Pin(
                // pinboard API gets pin with attribute href, and addPin wants url. so we standardise to url
                pin.href,
                pin.description,
                pin.tags,
                pin.time,
                pin.extended,
                pin.toread,
                pin.shared));
        });
        pins.saveToStorage();
        browser.storage.local.set({ lastupdate: lastUpdate.getTime() });
        browser.storage.local.set({ lastsync: new Date().getTime() });
        return pins;
    }

    private static async getStoredLastUpdate() {
        const token = await browser.storage.local.get("lastupdate") as { lastupdate: any };
        if (token.hasOwnProperty("lastupdate")) {
            return new Date(token.lastupdate);
        }
        return new Date(0);
    }

    private static async getStoredLastSync() {
        const token = await browser.storage.local.get("lastsync") as { lastsync: any };
        if (token.hasOwnProperty("lastsync")) {
            return new Date(token.lastsync);
        }
        return new Date(0);
    }

    private constructor(i?: any) {
        super(i);
    }

    public set(key: string, pin: Pin) {
        super.set(key, pin);
        return this;
    }
    public delete(key: string): boolean {
        const result = super.delete(key);
        this.saveToStorage();
        return result;
    }

    public addPin(pin: Pin): void {
        this.set(pin.url, pin);
        this.saveToStorage();
    }

    public *forEachReversed() {
        for (const [url, pin] of Array.from(this.entries()).reverse()) {
            yield pin;
        }
    }

    public saveToStorage(): void {
        browser.storage.local.set({ pins: Array.from(this.entries()) as any });
    }
    /**
     * Last value returned is the total number of hits when ignoring the offset and count
     * @param text
     * @param options
     */
    public *filter(text?: string, options?: { toRead?: boolean, shared?: boolean, offset?: number, count?: number }, searchFields?: ("tags" | "description" | "url" | "extended")[]) {
        if (options === undefined) {
            options = {};
        }
        if (!options.hasOwnProperty("offset")) {
            options.offset = 0;
        }
        if (!options.hasOwnProperty("count")) {
            options.count = Number.MAX_VALUE;
        }

        if (searchFields === undefined) {
            searchFields = ["tags", "description", "extended", "url"];
        }

        if (text === undefined) {
            text = "";
        } else {
            text = text.toLowerCase();
        }

        let c = -1;
        for (const pin of this.forEachReversed()) {
            if (options.toRead && pin.toread !== "yes") continue;
            if (text === "" || searchFields.some(field => { return pin[field].toLowerCase().includes(text) })) {
                c++;
                if (options.offset > c) {
                    continue;
                }
                if (c >= options.offset + options.count) {
                    continue;
                }
                yield pin;
            }
        }
        yield c;

    }

    public *filterWithOptions(text: string, options: Options, additional:{count?: number, toRead?: boolean, offset?: number} = {}) {
        if(text === undefined) text = "";
        text = text.toLowerCase();
        let searchArea = [];
        let hasPrefix = false;
        let toRead = false;
        if (text.startsWith(options.tagPrefix + " ")) {
            searchArea.push("tags");
            hasPrefix = true;
        } else if (text.startsWith(options.urlPrefix + " ")) {
            searchArea.push("url");
            hasPrefix = true;
        } else if (text.startsWith(options.titlePrefix + " ")) {
            searchArea.push("description");
            hasPrefix = true;
        } else {
            searchArea = ["tags", "url", "description", "extended"];
        }
        if (text.startsWith(options.toReadPrefix + " ")) {
            hasPrefix = true;
            toRead = true;
        }
        if (hasPrefix) {
            text = text.slice(text.indexOf(" ") + 1);
        }
        for (const pin of this.filter(text, {toRead: toRead || additional.toRead, count: additional.count}, searchArea)) {
            yield pin;
        }
    }
}
