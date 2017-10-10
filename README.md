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

### To build
* Install npm/node and run npm install
* Alternatively, manually install these packages:
  * webextension-polyfill (necessary to be included)
  * web-ext-types (typescript declarations for web extensions)
  * tslint (optionally, to use standardised formatting)
  * typescript (to cross-compile .ts to .js)
* run the scripts outlined in package.json or:
  * create folder structure below
  * copy html and css in their folders
  * copy browser-polyfill.min.js in the vendor/webextension-polyfill folder
  * (run `tslint`)
  * run `tsc` (typescript compiler)
```
  dist
    +-- hml
    +-- css
    +-- js
    +-- vendor
    |   +-- webextension-polyfill
  ```
### Thanks
* To [lostsnow](https://github.com/lostsnow/pinboard-firefox) for the cool addon and for the bug motivating me to look into WebExtensions.
* To [weinshel](https://github.com/weinshel) for the [commit](https://github.com/seeba8/yet-another-pinboard-extension/commit/3a2c969389d40c357646d0ce97a4425a737c31c6) in his fork which I took the liberty of [bringing into my version](https://github.com/seeba8/yet-another-pinboard-extension/commit/d285bf935facea7a397bab503256e24f1a45c257)
* To [alerque](https://github.com/alerque) for your suggestion in #25 to add regex parsing

### Changelog (incomplete)

#### v1.2.6 - v1.2.9:
* Adds the option to run a regex on the tab title (might be useful when using an addon to modify the tab title). Thanks @alerque for the suggestion (see #25)!
* Adds css scaling on the popup for firefox when using two screens with different DPI (see issue #3)
* Updates the timeout increase to introduce a maximum timeout of 10 minutes
* Adds badges to the button to show when a connection issue occurs
* Fixes a bug causing high CPU load when addon options are missing
* Misc. stuff, check the commits if you are interested, nothing worth mentioning

#### v1.2.1 - v1.2.5:
* Adds symbol in popup for shared bookmarks
* Adds filter in popup for bookmarks flagged as "to read"
* Optimized API request queue (deleting duplicates)
* Added API polling to check every 5 minutes for new bookmarks

#### v1.2: 
* Adds deleting of pins
* Adds private/public flags
* Revamps API access (caches connection if internet doesn't work)
* Adds context menu item for "To Read"
* Changes icon scheme -- show pin status as badge instead of changing the icon itself
* Adds tag suggestions

#### v1.1:
* Adds option to auto-save new bookmarks to pinboard
* Adds Google Chrome support, among others using Mozilla's [Web Extension Polyfill](https://github.com/mozilla/webextension-polyfill)

#### v1.0
* Initial release, only for Firefox
