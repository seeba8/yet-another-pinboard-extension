# Yet Another Pinboard Extension
Shows your [Pinboard](https://pinboard.in) bookmarks in the omnibar suggestions if "pin" is prepended.
Also, allows you to view, open and edit your bookmarks in your browser.
Furthermore, enables (optionally) auto-copying new browser bookmarks to pinboard.

Written in pure Javascript/HTML/CSS without external dependencies (But uses Mozilla's [Web Extension Polyfill](https://github.com/mozilla/webextension-polyfill) to be able to handle Chrome's differences (mostly, at least)). 

Does not send any data anywhere, as far as I know (except to pinboard, of course).

### Download / Install
* [Mozilla Addons](https://addons.mozilla.org/en-US/firefox/addon/yet-another-pinboard-extension/)
* [Google Chrome Webstore](https://chrome.google.com/webstore/detail/yet-another-pinboard-exte/dbjklnfejfpbamlcgcpmclkhbodmmbko)

### Instructions
* To connect the add-on with your pinboard account, enter your API key in the options page (about:addons or chrome://extensions). Do *not* enter your normal password! The key will be stored in the add-on's local browser storage, and I have no idea if other add-ons / users / whoever can access that. Also, it probably wouldn't even work.
* The API key can be found on https://pinboard.in/settings/password.
* You can search through your bookmarks, create new ones and edit old ones via the button in the Action Menu (add it to the bar if it is not there)

### Reasons for the permissions
* `"https://api.pinboard.in/v1/*"` to connect to the API of course...
* `"storage"` to save the pins and settings across restarts and network losses
* `"tabs"` to set listeners on changing tab URLs to update the pin button
* `"bookmarks"` to be able to auto-save new bookmarks as pins as well (see issue #31 for a future change)
* `"contextMenus"` to create a context menu entry to save the page as a pin
* `"activeTab"` for the "save link as to read" context menu functionality to read the link URL and text
* `"alarms"` to rate-throttle API requests and periodically check for new pins

### To build
* Install npm/node and run npm install
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
* To [Google](https://material.io/icons) for some of the icons used, under [Apache License v2.0](https://www.apache.org/licenses/LICENSE-2.0)
* To [vurtomatic](https://github.com/vurtomatic) for suggesting dark mode and new icons (#27)
* To [pspinler](https://github.com/pspinler) for debugging the API-key issue with me
* To [marcinsmialek](https://github.com/marcinsmialek) for fixing a bug with the search in the omnibar and adding a keyboard shortcut to open the popup (#48)

### Changelog (incomplete)

#### v1.5.1
- Fix regression of not being able to search in the address bar anymore (#62)

#### v1.5.0
- Added different search modes in the options:
  - Result must contain the exact search phrase
  - Result must contain all words of the search phrase, but in any order (this is the new default)
  - Result must contain at least one of the words in the search phrase (#57)
  - Result must match the regular expression search
- Added an export feature as wished in #55. I was not able to reproduce the reporter's problem though, so I don't see a use case for the export
  - Export a default bookmark HTML format that can be imported into any browser
  - Export a JSON document similar to the pinboard export over at [pinboard's backup page](https://pinboard.in/settings/backup)
- Optimised some code causing API calls to sometimes be fired twice
- Technical changes
  - Optimised how the different files / modules reference each other 
  - Updated dependencies
  - Switched from tslint to eslint
  - Shrank the 16-pixel icon to actually be 16 pixels wide

#### v1.4.1
- Fixed pagination in popup

#### v1.4.0
- Added prettier dark mode and option to use browser/system setting for the dark mode, see [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme).
- (#51) Adds keybind Alt+Shift+P to open the create bookmark dialog within the popup ([Firefox only](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/openPopup))
- (#51) Adds keybind Alt+Shift+Left to open the sidebar (Firefox only)
- (#50) Fixes search prefixing and makes search the same across popup, sidebar and browser address bar
- (#49) Improves tag suggestions when adding a new bookmark 

#### v1.3.7
* Merged pull request #48, thanks @marcinsmialek! This adds the keyboard shortcut Alt-P (by default) to open the pinboard popup. Also, it fixes the behaviour when searching for bookmarks in the omnibar when no results are found.
* On development side: updated dependencies. Did not replace tslint by eslint yet because it seems to be quite the task...

#### v1.3.1 - 1.3.6:
* Fixed some bugs
* Started adding keyboard controls to the popup
* Made the options screen more clear with regards to the API key

#### v1.3.0:
* Adds customisable colours: Set the addon to dark mode, light mode, or any colour scheme your heart desires
* **Firefox only**: Adds a sidebar containing a searchable list of all your bookmarks.
* Updates icons in the popup
* Backend stuff:
  * Updated to v1.2.0 of Mozilla's webextension-polyfill
  * Streamlined some more code
  * The icons were unicode characters before, now they are embedded SVG
  * Moved the filter functionality into appropriate class to try and reduce code duplication
  * Made background scripts not persistent (https://developer.chrome.com/extensions/event_pages)


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
