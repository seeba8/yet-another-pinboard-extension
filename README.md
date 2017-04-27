# pinboard-omnibox
Shows your [Pinboard](https://pinboard.in) bookmarks in the omnibar suggestions if "pin" is prepended.

Current version: Haven't started counting yet.

### Instructions
* To connect the add-on with your pinboard account, enter your API key in the settings page (about:addons). Do *not* enter your main password! The key will be stored in the add-on's local browser storage, and I have no idea if other add-ons / users / whoever can access that.
* The API key can be found on https://pinboard.in/settings/password.

### Future plans
* Refine search to only tags, description or URL using another prefix after "pin", for example `pin u github` would look for entries where the URL contains `github`.
* Start searching only after 3 (?) characters.

### Thanks
Thanks to [lostsnow](https://github.com/lostsnow/pinboard-firefox) for the cool addon and for the bug motivating me to look into WebExtensions.
