enum StyleType {
    "browser",
    "dark",
    "light",
    "custom",
}

declare interface IStyle {
    textColor: string,
    backgroundColor: string,
    disabledColor: string,
    linkColor: string,
    visitedColor: string,
    type: StyleType
}

class Options {
    public static async getObject() {
        const o = await browser.storage.local.get("options") as any;
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
                                options._style,
                                options._styleType,);
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
    private _styleType: StyleType;
    
    private static lightStyle: Readonly<IStyle> = Object.freeze({
        textColor: "#000000",
        backgroundColor: "#ffffff",
        visitedColor: "#551A8B",
        linkColor: "#0000EE",
        disabledColor: "#808080",
        type: StyleType.light,
    });
    private static darkStyle: Readonly<IStyle> = Object.freeze({
        textColor: "#f9f9fa",
        backgroundColor: "#4a4a4f",
        visitedColor: "#f9f9fa",
        linkColor: "#f9f9fa",
        disabledColor: "#b1b1b3",
        type: StyleType.dark,
    });

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
                        style: IStyle = JSON.parse(JSON.stringify(Options.lightStyle)),
                        styleType: StyleType = StyleType.browser) {
    this._urlPrefix = urlPrefix;
    this._tagPrefix = tagPrefix;
    this._titlePrefix = titlePrefix;
    this._toReadPrefix = toReadPrefix;
    this._showBookmarked = showBookmarked;
    this._changeActionbarIcon = changeActionbarIcon;
    this._saveBrowserBookmarks = saveBrowserBookmarks;
    this._sharedbyDefault = sharedByDefault;
    this._titleRegex = titleRegex;
    this._style = style;
    this._styleType = styleType;
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
        // Fix for a bug in a previous version
        // Otherwise redundant
        if (!this._style.hasOwnProperty("textColor")) {
            this._style = JSON.parse(JSON.stringify(Options.lightStyle));
        }
        return this._style;
    }

    get styleType() {
        return this._styleType;
    }

    public setColorMode(mode: string) {
        switch (mode) {
            case "dark":
                this.style = JSON.parse(JSON.stringify(Options.darkStyle));
                this._styleType = StyleType.dark;
                break;
            case "light":
                this.style = JSON.parse(JSON.stringify(Options.lightStyle));
                this._styleType = StyleType.light;
                break;
            case "browser":
                // see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
                if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                    this.style = JSON.parse(JSON.stringify(Options.darkStyle));
                } else {
                    this.style = JSON.parse(JSON.stringify(Options.lightStyle));
                }
                this._styleType = StyleType.browser;
                break;
            default:
                this.style = JSON.parse(JSON.stringify(Options.lightStyle));
                this._styleType = StyleType.browser;
        }
    }

    private save() {
        browser.storage.local.set({ options: this as any });
    }
}
