///<reference path="connector.ts" />
"use strict";
class Pin {
    constructor(url, description = "", tags = "", time = "", extended = "", toread = "no", shared = "no") {
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
    update(description = "", tags = "", time = "", extended = "", toread = "no", shared = "no") {
        this.description = description;
        this.tags = tags;
        this.time = time;
        this.extended = extended;
        this.toread = toread;
        this.shared = shared;
    }
    static fromObject(o) {
        return new Pin(o.url, o.description, o.tags, o.time, o.extended, o.toread, o.shared);
    }
}
//# sourceMappingURL=pin.js.map