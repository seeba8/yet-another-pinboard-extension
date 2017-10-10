/* tslint variable-name: 0 */
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
                                options._saveBrowserBookmarks,
                                options._titleRegex);
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
    /* tslint:enable */

    private constructor(urlPrefix: string = "u",
                        tagPrefix: string = "t",
                        titlePrefix: string = "n",
                        toReadPrefix: string = "r",
                        showBookmarked: boolean = true,
                        changeActionbarIcon: boolean = true,
                        saveBrowserBookmarks: boolean = false,
                        sharedByDefault: boolean = false,
                        titleRegex: string = ".*") {
    this._urlPrefix = urlPrefix;
    this._tagPrefix = tagPrefix;
    this._titlePrefix = titlePrefix;
    this._toReadPrefix = toReadPrefix;
    this._showBookmarked = showBookmarked;
    this._changeActionbarIcon = changeActionbarIcon;
    this._sharedbyDefault = sharedByDefault;
    this._titleRegex = titleRegex;
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

    private save() {
        browser.storage.local.set({ options: this });
    }
}
