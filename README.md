# Yet Another Pinboard Extension
Shows your [Pinboard](https://pinboard.in) bookmarks in the omnibar suggestions if "pin" is prepended.
Also, allows you to view, open and edit your bookmarks in your browser.

Written in pure Javascript without external dependencies. Does not send any data anywhere, as far as I know (except to pinboard, of course).

Current version: 1.0

### Download / Install
* [Mozilla Addons](https://addons.mozilla.org/en-US/firefox/addon/yet-another-pinboard-extension/)
* [Github Release](https://github.com/seeba8/yet-another-pinboard-extension/releases/latest) (Signed by AMO, can be installed in regular Firefox)

### Instructions
* To connect the add-on with your pinboard account, enter your API key in the options page (about:addons). Do *not* enter your main password! The key will be stored in the add-on's local browser storage, and I have no idea if other add-ons / users / whoever can access that.
* The API key can be found on https://pinboard.in/settings/password.
* You can search through your bookmarks, create new ones and edit old ones via the button in the Action Menu (add it to the bar if it is not there)

### Thanks
Thanks to [lostsnow](https://github.com/lostsnow/pinboard-firefox) for the cool addon and for the bug motivating me to look into WebExtensions.

### Plans for the future
* Enable deleting of bookmarks
* Enable deleting the API key
* Enable force-updating the locally stored pins
* Probably a lot of bugfixes
* Adapt it for Google Chrome, maybe?
* ...
