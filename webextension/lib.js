/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";


var main = browser.extension.getBackgroundPage();

/* Object injected for every window */
var VerticalTabsReloaded = class VerticalTabsReloaded
{
    constructor(window, preferences)
    {
        //this.main = main;
        this.window = window;
        this.document = window.document;
        this.webExtPreferences = preferences;
        this.changedDisplayState = false;
        this.unloaders = [];
        this.selectedTabID = undefined;
        this.newOpenedTabSelectIt = undefined;

        this.tabbrowser = this.document.getElementById("tabbrowser-tabs");

        this.init();
    }

    init()
    {
        this.debug_log(this.webExtPreferences);
        this.window.VerticalTabsReloaded = this;
        //this.unloaders.push(function() {
            //delete this.window.VerticalTabsReloaded;
        //});

        this.build_ui();
        this.initEventListeners();
        this.scroll_to_tab(this.selectedTabID);
        this.toolbar_activate();
    }

    preferences(settingName)
    {
        this.debug_log(settingName + " (webext lib): " + this.webExtPreferences[settingName]);
        return this.webExtPreferences[settingName];
    }

    installStylesheet(uri, type)
    {
        this.debug_log("VTR install sheet: " + uri + " of type: " + type);
        this.tabbrowser.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${uri}" id="vtr-${type}">`);
    }

    removeStylesheet(type)
    {
        this.debug_log("VTR remove sheet of type: " + type);
        this.document.getElementById("vtr-"+type).remove();
    }

    applyThemeStylesheet()
    {
        if(this.preferences("theme") != "none")
        {
            this.installStylesheet( this.getThemeStylesheet(this.preferences("theme")), "theme" );
        }
    }

    removeThemeStylesheet()
    {
        if(this.preferences("theme") != "none")
        {
            this.debug_log("remove theme stylesheet!");
            this.removeStylesheet("theme");
        }
    }

    getThemeStylesheet(theme)
    {
        let stylesheet;
        switch (theme)
        {
            default:
                stylesheet = "data/theme/"+theme+"/index.css";
                break;
        }

        return browser.runtime.getURL(stylesheet);
    }

    scroll_to_tab(tabID)
    {
        if(typeof tabID != "number")
        {
            return;
        }

        let tabElement = this.document.getElementById("tab-"+tabID);

        if(tabElement == null)
        {
            setTimeout(() =>
            {
                tabElement = this.document.getElementById("tab-"+tabID);
                if(tabElement == null)
                {
                    return;
                }
            }, 10);
        }

        var rect = tabElement.getBoundingClientRect();

        if(rect.top >= 0
        && rect.left >= 0
        && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        &&  rect.right <= (window.innerWidth || document.documentElement.clientWidth))
        {
            // visible
        }
        else
        {
            tabElement.scrollIntoView({block: "end", behavior: "smooth"});
        }
    }

    build_ui()
    {
        // FIREFIX: Placeholder. Firefox doesn't support hiding the default tabbrowser currently.

        // Injecting CSS
        this.installStylesheet(browser.runtime.getURL("data/theme/base.css"), "base");
        this.applyThemeStylesheet();
        if (this.preferences("compact") == true)
        {
            this.debug_log("compact true");
            this.installStylesheet(browser.runtime.getURL("data/compact.css"), "compact");
        }

        if (this.preferences("style.tab.status") == true)
        {
            this.debug_log("style.tab.status true");
            this.installStylesheet(browser.runtime.getURL("data/status.css"), "status");
        }

        // FIREFIX: Placeholder. Sidebars on the right are currently not suppoted by Firefox.
        //if (this.preferences("right"))

        // Placeholder. Restore width of tab bar from previous session
        //tabs.setAttribute("width", this.preferences("width"));
        // FIREFIX: Firefox doesn't support resizing the sidebar programmatically currently.

        // FIREFIX: Firefox doesn't supporting the moving of toolbars. https://bugzilla.mozilla.org/show_bug.cgi?id=1344959
        //if (this.preferences("tabtoolbarPosition") == "top")
        //{
            //leftbox.insertBefore(toolbar, leftbox.firstChild);
        //}
        //else
        //{
            //leftbox.appendChild(toolbar);
        //}

        browser.tabs.query({currentWindow: true}).then((tabs) =>
        {
            for(let tab of tabs)
            {
                this.create_tab(tab);
            }
        });

        this.unloaders.push(() =>
        {
            // FIXME: Put the tabs back up, unhide tabstrip

            // FIXME: Properly not necessary since sidebars are totally isolated and are just getting "deleted" on closing
            //this.removeThemeStylesheet();
        });
    }

    /* Firefox's security features prevents us from loading some default icons,
    replace with local, exact-same icon versions
    - yes. that's kinda stupid  */
    normalize_tab_icon(iconURL)
    {
        if(typeof iconURL == "undefined")
        {
            return "data/chrome/icon/defaultFavicon.png";
        }

        switch (iconURL)
        {
            case "chrome://mozapps/skin/extensions/extensionGeneric-16.png":
                return "data/chrome/icon/extensionGeneric-16.png"
            break;

            case "chrome://mozapps/skin/places/defaultFavicon.png":
                return "data/chrome/icon/defaultFavicon.png";
            break;

            default:
                return iconURL;
        }

    }

    create_tab(tab)
    {
        let id = tab.id;
        let url = tab.url;
        let title = tab.title || "Connecting...";
        let pinned = tab.pinned;
        let iconURL = this.normalize_tab_icon(tab.favIconUrl);

        /*let div = document.createElement("div");
        div.className = "tabbrowser-tab";
        div.setAttribute('contextmenu', 'tabContextMenu');
        div.id = id;*/

        /*let a = document.createElement('a');
        a.className = 'tab';
        a.innerText = this.url;
        a.href = this.url;*/

        if(pinned == true)
        {
            var pinnedHTML = 'pinned="true"';
        }
        else
        {
            var pinnedHTML = '';
        }


        if(tab.selected == true)
        {
            var selectedAttribute = 'selected="true"';
            this.selectedTabID = id;
        }
        else
        {
            var selectedAttribute = '';
        }

        var tabHTML = `<div id="tab-${id}" class="tabbrowser-tab" title="${title}" ${pinnedHTML} ${selectedAttribute} fadein="true" context="tabContextMenu" linkedpanel="panel-3-77" pending="true" image="" iconLoadingPrincipal="" align="stretch" maxwidth="65000" minwidth="0"> <span class="tab-icon"> <img id="tab-icon-${id}" class="tab-icon-image" src="${iconURL}"> </span> <span id="tab-title-${id}" class="tab-label tab-text">${title}</span> </div>`;

        // Check: fadein="true" context="tabContextMenu" linkedpanel="panel-3-77" pending="true" image="" iconLoadingPrincipal="" align="stretch"
        if(pinned == true)
        {
            this.document.getElementById("tabbrowser-tabs-pinned").insertAdjacentHTML("beforeend", tabHTML);
        }
        else
        {
            this.tabbrowser.insertAdjacentHTML("beforeend", tabHTML);
        }

        this.document.getElementById("tab-"+id).addEventListener('click', (event) =>
        {
            browser.tabs.update(id, {active: true});
            event.preventDefault();
        });


        if(this.newOpenedTabSelectIt == id)
        {
            this.newOpenedTabSelectIt = undefined;
            this.update_tab(id, "selected", "true");
        }
        /*for (let method of ['close', 'reload', 'mute', 'pin', 'newWindow']) {
          let button = document.createElement('a');
          button.className = `button right ${method}`;
          button.href = '#';
          button.innerText = textMap[method];
          button.title = method;
          button.addEventListener('click', buttonEvent);
          div.appendChild(button);
      }*/

        /*let icon = document.createElement('img');
        icon.className = 'icon';
        icon.style.visibility = 'hidden';*/

        //icon.addEventListener('error', handleImageError);

        /*let context = document.createElement('span');
        context.className = 'context';
        context.style.visibility = 'hidden';*/

        /*div.appendChild(icon);
        div.appendChild(context);
        div.appendChild(a);
        tabList.appendChild(div);*/

        /*div.addEventListener('dragstart', handleDragStart, false);
        div.addEventListener('dragover', handleDragOver, false);
        div.addEventListener('drop', handleDrop, false);*/
    }

    update_tab(tabID, attribute, value)
    {
        this.debug_log("update tab: " + tabID + " " + attribute + " " + value);
        switch(attribute)
        {
            case "title":
                this.document.getElementById("tab-"+tabID).setAttribute("label", value);
                this.document.getElementById("tab-title-"+tabID).innerHTML = value;
            break;

            case "pinned":
                if(value == true)
                {
                    this.document.getElementById("tab-"+tabID).setAttribute("pinned", "true");
                    this.document.getElementById("tabbrowser-tabs-pinned").appendChild(this.document.getElementById("tab-"+tabID));
                }
                else
                {
                    this.document.getElementById("tab-"+tabID).removeAttribute("pinned");
                    this.document.getElementById("tabbrowser-tabs").appendChild(this.document.getElementById("tab-"+tabID));
                }
            break;

            case "favIconUrl":
                value = this.normalize_tab_icon(value);
                this.document.getElementById("tab-icon-"+tabID).setAttribute("src", value);
            break;

            case "selected":
                if(this.selectedTabID != undefined)
                {
                    this.document.getElementById("tab-"+this.selectedTabID).removeAttribute("selected");
                }

                let selectedTab = this.document.getElementById("tab-"+tabID);
                if(selectedTab != null)
                {
                    this.document.getElementById("tab-"+tabID).setAttribute("selected", "true");
                    this.selectedTabID = tabID;

                    this.scroll_to_tab(tabID);
                }
                else
                {
                    this.newOpenedTabSelectIt = tabID;
                }

            break;

        }
    }

    remove_tab(tabID)
    {
        this.debug_log("remove tab: " + tabID);
        this.document.getElementById("tab-"+tabID).remove();
    }

    setPinnedSizes()
    {
        //this.window.addEventListener("resize", this, false);

        //this.unloaders.push(function()
        //{
            //this.window.removeEventListener("resize", this, false);
        //});

        //this.debug_log("set pinned sizes!");
    }

    onPreferenceChange(prefName, newValue)
    {
        switch (prefName)
        {
            //case "right":
                //this.webExtPreferences = newValue;
                // Placeholder.
                //break;

            case "tabtoolbarPosition":
                this.webExtPreferences[prefName] = newValue;
                let TabsToolbar = this.document.getElementById("TabsToolbar");

                switch(newValue)
                {
                    case "hide":
                        TabsToolbar.style.display = "none";
                        break;

                    case "top":
                        TabsToolbar.style.display = "";
                        this.document.body.insertBefore(TabsToolbar, this.document.getElementById("tabbrowser-tabs-pinned") );
                        break;

                    case "bottom":
                        TabsToolbar.style.display = "";
                        this.document.appendChild(TabsToolbar);
                        break;
                }
                break;

            case "theme":
                this.removeThemeStylesheet();
                this.webExtPreferences[prefName] = newValue;
                this.applyThemeStylesheet();
                break;

            case "compact":
                this.webExtPreferences[prefName] = newValue;
                if (this.preferences("compact") == true)
                {
                    this.installStylesheet(browser.runtime.getURL("data/compact.css"), "compact");
                }
                else
                {
                    this.removeStylesheet("compact");
                }
                break;

            case "style.tab.status":
                this.webExtPreferences[prefName] = newValue;
                if (this.preferences("style.tab.status") == true)
                {
                    this.installStylesheet(browser.runtime.getURL("data/status.css"), "status");
                }
                else
                {
                    this.removeStylesheet("status");
                }
                break;

            default:
                this.webExtPreferences[prefName] = newValue;
                break;
        }
    }

    on_storage_change_iterator(changes, area)
    {
        /* area = placeholder FIXME */

        Object.keys(changes).forEach(item =>
        {
            this.debug_log("on_storage: " + item + " " + changes[item].newValue);
            this.onPreferenceChange(item, changes[item].newValue);
        });
    }

    initEventListeners()
    {
        // Note: Not all eventsListener are set up here

        browser.storage.onChanged.addListener((changes, area) =>
        {
            this.on_storage_change_iterator(changes, area);
        });

        browser.tabs.onCreated.addListener((tab) =>
        {
            this.create_tab(tab);
        });

        browser.tabs.onActivated.addListener((details) =>
        {
            this.update_tab(details.tabId, "selected", "true");
        });

        browser.tabs.onUpdated.addListener((tabID, changeInfo, tab) =>
        {
            if (changeInfo.hasOwnProperty("title"))
            {
                this.update_tab(tabID, "title", changeInfo["title"]);
            }

            if (changeInfo.hasOwnProperty("pinned"))
            {
                if (changeInfo.pinned === true || changeInfo.pinned === false)
                {
                    this.update_tab(tabID, "pinned", changeInfo.pinned);
                }
            }

            if(changeInfo.hasOwnProperty("favIconUrl"))
            {
                this.update_tab(tabID, "favIconUrl", changeInfo["favIconUrl"]);
            }
            /*if (changeInfo.hasOwnProperty('mutedInfo')) {
                sidetabs.setMuted(tab, changeInfo.mutedInfo);
              }
          if (changeInfo.hasOwnProperty('audible')) {
            sidetabs.setAudible(tab, changeInfo.audible);
          }
          if (changeInfo.status === 'loading') {
            sidetabs.setSpinner(tab);
          }
          if (changeInfo.status === 'complete') {
            sidetabs.setIcon(tab);
        }*/
        });

        browser.tabs.onDetached.addListener((tabID, details) =>
        {
            this.remove_tab(tabID);
        });

        browser.tabs.onRemoved.addListener((tabID, removeInfo) =>
        {
            this.remove_tab(tabID);
        });

        browser.commands.onCommand.addListener((command) =>
        {
            if (command == "toggleTabbrowser")
            {
                this.toggleDisplayState();
            }
        });

        browser.browserAction.onClicked.addListener(() =>
        {
            this.toggleDisplayState();
        });

        // Doubleclick on free space within the tabbrowser opens a new tab
        this.document.getElementById("tabbrowser-tabs").addEventListener("dblclick", (e) =>
        {
            if(e.target == this.document.getElementById("tabbrowser-tabs"))
            {
                browser.tabs.create({
                    active:true
                });
            }
        });

        //Old event handler: case "popupshowing":
            //return;
    }

    toggleDisplayState()
    {
        // FIREFIX: Not yet able to read the status of the sidebar.

        // browser.sidebarAction.toggleSidebar(); /// FIREFIX FIXME: not landed in Nightly yet

        /* if(sidebar visible == true)
        {
            this.changedDisplayState = true;
        }
        else
        {
            this.changedDisplayState = false;
        }*/
    }

    changeDisplayState(display)
    {
        // FIREFIX: Not yet able to read the status of the sidebar.

        /*
        if((display == "none" && sidebar visible == true) || (display == "" && sidebar visible == false))
        {
            // browser.sidebarAction.toggleSidebar(); /// FIREFIX FIXME: not landed in Nightly yet
        } */
    }

    /* Enter/Left fullscreen mode */
    changeFullscreenMode(state)
    {
        if(this.changedDisplayState == true)
        {
            return;
        }

        this.debug_log("changeFullscreenMode " + state);
        if(state == "true")
        {
            this.changeDisplayState("none");
        }
        else
        {
            this.changeDisplayState("");
        }
    }

    toolbar_activate()
    {
        let TabsToolbar = this.document.getElementById("TabsToolbar");

        switch(this.preferences("tabtoolbarPosition"))
        {
            case "hide":
                TabsToolbar.style.display = "none";
                break;

            case "top":
                this.document.insertBefore(TabsToolbar, this.document.getElementById("tabbrowser-tabs-pinned") );
                break;

            case "bottom":
                // Default position
                break;
        }

        this.document.getElementById("toolbar-action-tab-new").addEventListener("click", () => {
            browser.tabs.create({
                active:true
            });
        });
    }

    unload()
    {
        this.unloaders.forEach(function(func)
        {
            func.call(this);
        }, this);

        this.unloaders = [];
    }

    debug_log(output)
    {
        main.debug_log(output);
    }

}

document.addEventListener("DOMContentLoaded", function()
{
    main.get_setting().then(value =>
    {
        var VTR = new VerticalTabsReloaded(window, value);
    });

});

//exports.VerticalTabsReloaded = VerticalTabsReloaded;
