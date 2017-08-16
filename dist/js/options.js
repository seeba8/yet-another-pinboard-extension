class Options {
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
    save() {
        browser.storage.local.set({ "options": this });
    }
    *getPrefixes() {
        yield ["tagPrefix", this.tagPrefix];
        yield ["titlePrefix", this.titlePrefix];
        yield ["urlPrefix", this.urlPrefix];
        yield ["toReadPrefix", this.toReadPrefix];
    }
    *getBinaryOptions() {
        yield ["showBookmarked", this.showBookmarked];
        yield ["changeActionbarIcon", this.changeActionbarIcon];
        yield ["saveBrowserBookmarks", this.saveBrowserBookmarks];
        yield ["sharedByDefault", this.sharedByDefault];
    }
    constructor(urlPrefix = "u", tagPrefix = "t", titlePrefix = "n", toReadPrefix = "r", showBookmarked = true, changeActionbarIcon = true, saveBrowserBookmarks = false, sharedByDefault = false) {
        this._urlPrefix = urlPrefix;
        this._tagPrefix = tagPrefix;
        this._titlePrefix = titlePrefix;
        this._toReadPrefix = toReadPrefix;
        this._showBookmarked = showBookmarked;
        this._changeActionbarIcon = changeActionbarIcon;
        this._sharedbyDefault = sharedByDefault;
        this.save();
    }
    static async getObject() {
        let o = (await browser.storage.local.get("options"));
        if (o.options === undefined) {
            return new Options();
        }
        else {
            return new Options(o.urlPrefix || o._urlPrefix, o.tagPrefix || o._tagPrefix, o.titlePrefix || o._titlePrefix, o.toReadPrefix || o._toReadPrefix, o.showBookmarked || o._showBookmarked, o.changeActionbarIcon || o._changeActionbarIcon, o.saveBrowserBookmarks || o._saveBrowserBookmarks, o.sharedbyDefault || o._saveBrowserBookmarks);
        }
    }
}
//# sourceMappingURL=options.js.map