declare interface IStyle {
    textColor: string,
    backgroundColor: string,
    disabledColor: string,
    linkColor: string,
    visitedColor: string,
    type: "dark"|"default"|"custom"
}

class Options {
    public static async getObject() {
        const o = await browser.storage.local.get("options");
        if (o.options === undefined) {
            const x = new Options();
            x.save();
            return x;
        } else {
            const options = o.options;
            return new Options( options._urlPrefix,
                                options._tagPrefix,
                                options._titlePrefix,
                                options._toReadPrefix,
                                options._showBookmarked,
                                options._changeActionbarIcon,
                                options._saveBrowserBookmarks,
                                options._sharedbyDefault,
                                options._titleRegex,
                                options._style);
        }
    }
    /* tslint:disable */
    private _tagPrefix: string;
    private _urlPrefix: string;
    private _titlePrefix: string;
    private _toReadPrefix: string;
    private _showBookmarked: boolean;
    private _changeActionbarIcon: boolean;
    private _saveBrowserBookmarks: boolean;
    private _sharedbyDefault: boolean;
    private _titleRegex: string;
    private _style: IStyle;
    
    private static defaultStyle: IStyle = {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        visitedColor: "#551A8B",
        linkColor: "#0000EE",
        disabledColor: "#808080",
        type: "default",
    };
    private static darkStyle: IStyle = {
        textColor: "#eeeeee",
        backgroundColor: "#111111",
        visitedColor: "#6a5480",
        linkColor: "#5555ff",
        disabledColor: "#808080",
        type: "dark",
    };

    /* tslint:enable */

    private constructor(urlPrefix: string = "u",
                        tagPrefix: string = "t",
                        titlePrefix: string = "n",
                        toReadPrefix: string = "r",
                        showBookmarked: boolean = true,
                        changeActionbarIcon: boolean = true,
                        saveBrowserBookmarks: boolean = false,
                        sharedByDefault: boolean = false,
                        titleRegex: string = ".*",
                        style: IStyle = Options.defaultStyle) {
    this._urlPrefix = urlPrefix;
    this._tagPrefix = tagPrefix;
    this._titlePrefix = titlePrefix;
    this._toReadPrefix = toReadPrefix;
    this._showBookmarked = showBookmarked;
    this._changeActionbarIcon = changeActionbarIcon;
    this._sharedbyDefault = sharedByDefault;
    this._titleRegex = titleRegex;
    this._style = style;
}

    public *getStringOptions(): IterableIterator<[string, string]> {
        yield ["tagPrefix", this.tagPrefix];
        yield ["titlePrefix", this.titlePrefix];
        yield ["urlPrefix", this.urlPrefix];
        yield ["toReadPrefix", this.toReadPrefix];
        yield ["titleRegex", this.titleRegex];
    }

    public *getBinaryOptions(): IterableIterator<[string, boolean]> {
        yield ["showBookmarked", this.showBookmarked];
        yield ["changeActionbarIcon", this.changeActionbarIcon];
        yield ["saveBrowserBookmarks", this.saveBrowserBookmarks];
        yield ["sharedByDefault", this.sharedByDefault];
    }

    set tagPrefix(tagPrefix) {
        this._tagPrefix = tagPrefix;
        this.save();
    }
    get tagPrefix() {
        return this._tagPrefix;
    }
    set urlPrefix(urlPrefix) {
        this._urlPrefix = urlPrefix;
        this.save();
    }
    get urlPrefix() {
        return this._urlPrefix;
    }
    set titlePrefix(titlePrefix) {
        this._titlePrefix = titlePrefix;
        this.save();
    }
    get titlePrefix() {
        return this._titlePrefix;
    }
    set toReadPrefix(toReadPrefix) {
        this._toReadPrefix = toReadPrefix;
        this.save();
    }
    get toReadPrefix() {
        return this._toReadPrefix;
    }
    set showBookmarked(showBookmarked) {
        this._showBookmarked = showBookmarked;
        this.save();
    }
    get showBookmarked() {
        return this._showBookmarked;
    }
    set changeActionbarIcon(changeActionbarIcon) {
        this._changeActionbarIcon = changeActionbarIcon;
        this.save();
    }
    get changeActionbarIcon() {
        return this._changeActionbarIcon;
    }
    set saveBrowserBookmarks(saveBrowserBookmarks) {
        this._saveBrowserBookmarks = saveBrowserBookmarks;
        this.save();
    }
    get saveBrowserBookmarks() {
        return this._saveBrowserBookmarks;
    }
    set sharedByDefault(sharedbyDefault) {
        this._sharedbyDefault = sharedbyDefault;
        this.save();
    }
    get sharedByDefault() {
        return this._sharedbyDefault;
    }
    set titleRegex(titleRegex) {
        if (titleRegex === "") {
            titleRegex = ".*";
        }
        try {
            const r = new RegExp(titleRegex);
            this._titleRegex = titleRegex;
            this.save();
        } catch (e) {
            // do nothing, keep the old, valid Regex
        }
    }
    get titleRegex() {
        return this._titleRegex;
    }
    set style(style) {
        this._style = style;
        this.save();
    }
    get style() {
        return this._style;
    }

    public setColorMode(mode: string) {
        switch (mode) {
            case "dark":
                this.style = Options.darkStyle;
                break;
            default:
                this.style = Options.defaultStyle;
        }
    }

    private save() {
        browser.storage.local.set({ options: this });
    }
}
