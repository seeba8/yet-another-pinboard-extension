///<reference path="connector.ts" />
"use strict";
declare type YesNo = "yes"|"no";

class Pin {
    url: string;
    description?: string;
    tags?: string;
    time?: string;
    extended?: string;
    toread?: YesNo;
    shared?: YesNo; 

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

    delete() {
        return connector.deletePin(this);
    }

    save() {
        //console.log("saving");
        return connector.addPin(this);
    }

    update(description: string = "", tags: string = "", time: string = "",
            extended: string = "", toread: YesNo = "no", shared:YesNo = "no") {
        this.description = description;
        this.tags = tags;
        this.time = time;
        this.extended = extended;
        this.toread = toread;
        this.shared = shared;
    }

    static fromObject(o) {
        return new Pin(o.url,o.description,o.tags,o.time,o.extended,o.toread,o.shared);
    }
}