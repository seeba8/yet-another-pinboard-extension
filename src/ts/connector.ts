import type { Browser, Alarms } from "webextension-polyfill";
declare let browser: Browser;
import { Pin } from "./pin.js";
import { hideErrorBadge, showErrorBadge } from "./shared-functions.js";
type QueueElement = {
    params: any,
    reject: (message: any) => void,
    resolve: (message: any) => void,
    type: string,
}

const API_URL = Object.freeze({
    addPin: "https://api.pinboard.in/v1/posts/add",
    deletePin: "https://api.pinboard.in/v1/posts/delete",
    getAllPins: "https://api.pinboard.in/v1/posts/all",
    // getAuthToken: "https://api.pinboard.in/v1/user/auth_token",
    getLastUpdate: "https://api.pinboard.in/v1/posts/update",
    // suggestTags: "https://api.pinboard.in/v1/posts/suggest",
});

const MIN_INTERVAL = 3 * 1000;
const MIN_INTERVAL_ALL = 5 * 60 * 1000;
let interval = MIN_INTERVAL;
let intervalAll = MIN_INTERVAL_ALL;
let getAllPinsObj: QueueElement;
let localQueue = Array<QueueElement>();
const lastGetAllPins = new Date(0);
let lastRequest = new Date(0);

// Needed for the initial startUp(). In case a new request comes in really quick,
// this de-duplicates the proceedQueue call.

browser.alarms.onAlarm.addListener(onAlarm);

startUp();

// let queue = new Array();
// Array.prototype.queue = function (item) {
//     this.push(item);
//     browser.storage.local.set({"queue": this}).then(() => {
//         if (this.length == 1) {
//         proceedQueue();
//     }
//     });
// }

async function startUp() {
    const queue = await getQueue();
    localQueue = queue.concat(localQueue);
    const alarm = await browser.alarms.get("proceedQueue");
    if (queue.length > 0) {
        cleanQueueDuplicates();
        if (alarm === undefined) {
            proceedQueue();
        }
    }
}

function saveQueue(queue: QueueElement[]) {
    return browser.storage.local.set({ queue: queue as any[] });
}

function addToQueue(item: QueueElement) {
    localQueue.push(item);
    cleanQueueDuplicates();
    saveQueue(localQueue);
    if (localQueue.length === 1) {
        if (lastRequest < new Date(Date.now() - MIN_INTERVAL)) {
            proceedQueue();
        } else {
            browser.alarms.create("proceedQueue", { when: Date.now() + interval });
        }
    }
}

function onAlarm(alarm: Alarms.Alarm) {
    if (alarm.name === "proceedQueue") {
        proceedQueue();
    } else if (alarm.name === "proceedGetAllData") {
        proceedGetAllData();
    }
}

function makeParamString(params: object | any) {
    if (typeof params !== "object") {
        return "";
    }
    let paramStr = "";
    for (const prop in params) {
        // Needs to be for .. in, I don't quite understand why
        if (Object.prototype.hasOwnProperty.call(params, prop)) {
            paramStr += "&" + encodeURIComponent(prop) + "=" + encodeURIComponent(params[prop]);
        }
    }
    return paramStr;
}

async function getQueue(): Promise<any[]> {
    const token = await browser.storage.local.get("queue");
    if (Object.prototype.hasOwnProperty.call(token, "queue") && typeof token.queue === "object") {
        return (token.queue as any[]);
    } else {
        return [];
    }
}

function cleanQueueDuplicates() {
    let update = false;
    let getAll = false;
    const newQueue = [];
    for (const item of localQueue) {
        if (item.type === "getLastUpdate") {
            if (!update) {
                newQueue.push(item);
                update = true;
            }
        } else if (item.type === "getAllPins") {
            if (!getAll) {
                newQueue.push(item);
                getAll = true;
            }
        } else {
            newQueue.push(item);
        }
    }
    localQueue = newQueue;
}

function proceedQueue() {
    lastRequest = new Date();
    if (localQueue.length === 0) {
        return;
    }
    sendRequest(localQueue[0])
        .then(validateResponse)
        .then(parseJSON)
        .then(handleResultJSON)
        .then(onSuccess)
        .catch(onError);
}

function proceedGetAllData() {
    sendRequest(getAllPinsObj)
        .then(validateResponse)
        .then(parseJSON)
        .then((json) => {
            if (typeof json !== "object" || (json.length === 1 && typeof json[0] !== "object")) {
                getAllPinsObj.reject(Error(json));
                return;
            } else {
                getAllPinsObj.resolve(json);
            }
        })
        .catch(() => {
            // intervalAll *= 2; // Removing the doubling as it might cause issues (growing too quickly)
            browser.alarms.create("proceedGetAllData", { when: Date.now() + intervalAll });
        });
}

async function sendRequest(item: QueueElement) {
    const apikey = (await browser.storage.local.get(["apikey"])).apikey as string;
    if(apikey === undefined || apikey.length === 0) {
        throw Error("No API key configured.");
    }
    return fetch(API_URL[item.type] + "?auth_token=" + encodeURIComponent(apikey) + "&format=json" +
        makeParamString(item.params));
}

function validateResponse(response: Response) {
    if (!response.ok || response.status !== 200) {
        throw Error(String(response.status) + " " + response.statusText);
    }
    return response;
}

function parseJSON(response: Response) {
    return response.json();
}

async function handleResultJSON(json) {
    if (localQueue.length === 0) {
        return json;
    }
    switch (localQueue[0].type) {
        case "getLastUpdate":
            if (!Object.prototype.hasOwnProperty.call(json, "update_time")) {
                throw Error(json);
            } else {
                return new Date(json.update_time);
            }
        case "addPin":
            if (json.result_code !== "done") {
                throw Error(json.result_code);
            }
            break;
    }
    return json;
}

function onSuccess(result) {
    hideErrorBadge();
    intervalAll = MIN_INTERVAL_ALL;
    interval = MIN_INTERVAL;
    const promise = localQueue.shift();
    saveQueue(localQueue);
    if (promise !== undefined && typeof promise.resolve === "function") {
        promise.resolve(result);
    }
    if (localQueue.length > 0) {
        browser.alarms.create("proceedQueue", { when: Date.now() + interval });
    }
}

function onError(error: unknown) {
    interval = Math.max(interval * 2, 1000 * 60 * 10);
    showErrorBadge(String(error));
    // Maybe do not show uninteresting errors?
    browser.alarms.create("proceedQueue", { when: Date.now() + interval });
    // Possible:
    // queue.shift().reject(error);
}

// Public methods of the connector "class"

export function getLastUpdate(): Promise<Date> {
    return new Promise((resolve, reject) => {
        addToQueue({
            params: {},
            reject,
            resolve,
            type: "getLastUpdate",
        });
    });

}
export function addPin(pin: Pin): Promise<any> {
    return new Promise((resolve, reject) => {
        addToQueue({
            params: pin,
            reject,
            resolve,
            type: "addPin",
        });
    })
}
export function getAllPins(): Promise<any[]> {
    return new Promise((resolve, reject) => {
        browser.alarms.clear("proceedGetAllData");
        browser.alarms.create("proceedGetAllData", {
            when: Date.now() + intervalAll + 1000 -
                Math.min(intervalAll, (Date.now() - lastGetAllPins.getTime())),
        });
        getAllPinsObj = { // TODO CHECK THIS
            params: {},
            reject,
            resolve,
            type: "getAllPins",
        };
    });
}
export function deletePin(pin: Pin) {
    return new Promise((resolve, reject) => {
        addToQueue({
            params: pin,
            reject,
            resolve,
            type: "deletePin",
        });
    });
}
