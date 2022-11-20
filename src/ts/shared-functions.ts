import type { Browser } from "webextension-polyfill";
declare let browser: Browser;

import { checkDisplayBookmarked } from "./background.js";

export function executeTitleRegex(title: string, regex: string): string {
    const titleRegex = new RegExp(regex).exec(title);
    if (titleRegex === null || titleRegex.length === 0) {
        return title;
    } else if (titleRegex.length === 1) {
        return titleRegex[0];
    } else {
        return titleRegex[1];
    }
}

export function showErrorBadge(message: string) {
    browser.browserAction.setBadgeBackgroundColor({ color: "#f00" });
    browser.browserAction.setBadgeText({ text: "X" });
    browser.browserAction.setTitle({ title: message });
}

export function hideErrorBadge() {
    browser.browserAction.setBadgeBackgroundColor({ color: "#333" });
    browser.browserAction.setBadgeText({ text: "" });
    browser.browserAction.setTitle({ title: "Yet Another Pinboard Extension" });
    checkDisplayBookmarked();
}

