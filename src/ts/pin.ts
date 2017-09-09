///<reference path="connector.ts" />
"use strict";
declare type YesNo = "yes"|"no";

class Pin {
    public static fromObject(o) {
        return new Pin(o.url, o.description, o.tags, o.time, o.extended, o.toread, o.shared);
    }

    public url: string;
    public description?: string;
    public tags?: string;
    public time?: string;
    public extended?: string;
    public toread?: YesNo;
    public shared?: YesNo;

    constructor(url: string, description: string = "", tags: string = "", time: string = "",
                extended: string = "", toread: YesNo = "no", shared: YesNo = "no") {
        this.url = url;
        this.description = description;
        this.tags = tags;
        this.time = time;
        this.extended = extended;
        this.toread = toread;
        this.shared = shared;
    }

    public delete() {
        return connector.deletePin(this);
    }

    public save() {
        return connector.addPin(this);
    }

    public update(description: string = "", tags: string = "", time: string = "",
                  extended: string = "", toread: YesNo = "no", shared: YesNo = "no") {
        this.description = description;
        this.tags = tags;
        this.time = time;
        this.extended = extended;
        this.toread = toread;
        this.shared = shared;
    }
}
