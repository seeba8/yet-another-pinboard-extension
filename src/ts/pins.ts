import type { Browser } from "webextension-polyfill";
declare let browser: Browser;

import { Options, SearchMode } from "./options.js";
import { Pin } from "./pin.js";

export class Pins extends Map<string, Pin> {
    public static async getObject(): Promise<Pins> {
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

    public constructor(i?: any) {
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
        for (const [, pin] of Array.from(this.entries()).reverse()) {
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
    public *filter(text?: string, options?: { toRead?: boolean, shared?: boolean, offset?: number, count?: number, searchMode?: SearchMode }, searchFields?: ("tags" | "description" | "url" | "extended")[]) {
        if (options === undefined) {
            options = {};
        }
        if (!Object.prototype.hasOwnProperty.call(options, "offset")) {
            options.offset = 0;
        }
        if (!Object.prototype.hasOwnProperty.call(options, "count")) {
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
            if (options.toRead && pin.toread !== "yes") { continue; }
            if (text === "" 
                || (options.searchMode === SearchMode.searchAny && searchFields.some(field => text.split(/\s+/).some(word => pin[field].toLowerCase().includes(word))))
                || (options.searchMode === SearchMode.searchAll && searchFields.some(field => text.split(/\s+/).every(word => pin[field].toLowerCase().includes(word))))
                || (options.searchMode === SearchMode.searchPhrase && searchFields.some(field => pin[field].toLowerCase().includes(text)))
                || (options.searchMode === SearchMode.searchRegex && searchFields.some(field => new RegExp(text, "i").test(pin[field])))) {
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

    public *filterWithOptions(text: string, options: Options, additional: { count?: number, toRead?: boolean, offset?: number } = {}) {
        if (text === undefined) { text = ""; }
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
        for (const pin of this.filter(text, { toRead: toRead || additional.toRead, count: additional.count, offset: additional.offset , searchMode: options.searchMode}, searchArea)) {
            yield pin;
        }
    }
}
