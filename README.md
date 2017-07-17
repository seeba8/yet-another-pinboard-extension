# Yet Another Pinboard Extension
Shows your [Pinboard](https://pinboard.in) bookmarks in the omnibar suggestions if "pin" is prepended.
Also, allows you to view, open and edit your bookmarks in your browser.
Furthermore, enables (optionally) auto-copying new browser bookmarks to pinboard.

Written in pure Javascript/HTML/CSS without external dependencies (But uses Mozilla's [Web Extension Polyfill](https://github.com/mozilla/webextension-polyfill) to be able to handle Chrome's differences (mostly, at least). 

Does not send any data anywhere, as far as I know (except to pinboard, of course).

### Download / Install
* [Mozilla Addons](https://addons.mozilla.org/en-US/firefox/addon/yet-another-pinboard-extension/)
* [Google Chrome Webstore](https://chrome.google.com/webstore/detail/yet-another-pinboard-exte/dbjklnfejfpbamlcgcpmclkhbodmmbko)
* [Github Release](https://github.com/seeba8/yet-another-pinboard-extension/releases/latest) (Signed by AMO, can be installed in regular Firefox and should get updates too)

### Instructions
* To connect the add-on with your pinboard account, enter your API key in the options page (about:addons or chrome://extensions). Do *not* enter your normal password! The key will be stored in the add-on's local browser storage, and I have no idea if other add-ons / users / whoever can access that. Also, it probably wouldn't even work.
* The API key can be found on https://pinboard.in/settings/password.
* You can search through your bookmarks, create new ones and edit old ones via the button in the Action Menu (add it to the bar if it is not there)

### Thanks
Thanks to [lostsnow](https://github.com/lostsnow/pinboard-firefox) for the cool addon and for the bug motivating me to look into WebExtensions.

### Plans for the future
* ~Enable deleting of bookmarks~ Done!
* ~Enable deleting the API key~ Done!
* ~Enable force-updating the locally stored pins~ Done!
* Probably a lot of bugfixes
* ~Add field for the longer link description~ Done!
* ~Add private / public flag~ Done!
* ~Adapt it for Google Chrome, maybe?~ Done!
* Re-add page action button for Firefox, maybe? (Chrome [doesn't support](https://developer.chrome.com/extensions/manifest) using both Browser and Page Action)
* Keyboard shortcut to open the popup?
* ~Cache saved pins locally in case connection does not work~ Done!
* Add context menu when clicking on links: read later
* ...

### Changelog (incomplete)
#### v1.2: 
* Adds deleting of pins
* Adds private/public flags
* Revamps API access (caches connection if internet doesn't work)

#### v1.1:
* Adds option to auto-save new bookmarks to pinboard
* Adds Google Chrome support, among others using Mozilla's [Web Extension Polyfill](https://github.com/mozilla/webextension-polyfill)

#### v1.0
* Initial release, only for Firefox
