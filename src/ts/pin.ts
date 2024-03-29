declare type YesNo = "yes" | "no";
export declare type PinData = {
    url: string, description: string, tags: string, time: string, extended: string, toread: YesNo, shared: YesNo
}

export class Pin {
    public static fromObject(o: PinData) {
        return new Pin(o.url, o.description, o.tags, o.time, o.extended, o.toread, o.shared);
    }

    public url: string;
    public description?: string;
    public tags?: string;
    public time?: string;
    public extended?: string;
    public toread?: YesNo;
    public shared?: YesNo;

    constructor(url: string, description = "", tags = "", time = "",
        extended = "", toread: YesNo = "no", shared: YesNo = "no") {
        this.url = url;
        this.description = description;
        this.tags = tags;
        this.time = time;
        this.extended = extended;
        this.toread = toread;
        this.shared = shared;
    }

    public update(description = "", tags = "", time = "",
        extended = "", toread: YesNo = "no", shared: YesNo = "no") {
        this.description = description;
        this.tags = tags;
        this.time = time;
        this.extended = extended;
        this.toread = toread;
        this.shared = shared;
    }
}
