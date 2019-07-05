/* window.js
 *
 * Copyright 2019 Sonny Piers
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { byteArray } = imports;
const { GObject, Gtk, GLib, Gio, Gdk, GdkPixbuf } = imports.gi;
const {
  WebsiteDataManager,
  WebView,
  WebContext,
  CookiePersistentStorage,
  CookieAcceptPolicy,
  Settings,
  CookieManager,
  LoadEvent,
  PolicyDecisionType
} = imports.gi.WebKit2;

const { buildHomePage } = imports.homePage;
const { buildTab } = imports.tab;

var GigagramWindow = GObject.registerClass(
  {
    // default_width: 600,
    // default_height: 300
    // GTypeName: "GigagramWindow",
    // Template: "resource:///re/sonny/gigagram/window.ui",
    // InternalChildren: ["label"]
  },
  class GigagramWindow extends Gtk.ApplicationWindow {
    _init(application) {
      super._init({ application });

      // this.add(homePage);
      // this.show_all();

      // this._header = this._getHeader();
      // this._window.set_titlebar(this._header);

      // tabs = services.map(service => {
      //   const tab = new Tab(service, this);
      //   this._notebook.append_page(tab.page, tab.label);
      //   return tab;
      // });

      function onAddService(service) {
        log(service.name);
        const dialog = new Gtk.Dialog();
        dialog.add_button("Cancel", Gtk.ResponseType.CANCEL);
        dialog.add_button("Confirm", Gtk.ResponseType.APPLY);
        dialog.set_modal(true);

        const box = new Gtk.HBox();
        const label = new Gtk.Label({ label: "Name" });
        box.add(label);
        const entry = new Gtk.Entry({ text: service.name });
        box.add(entry);
        dialog.get_content_area().add(box);

        dialog.connect("response", (self, response_id) => {
          dialog.close();
          if (response_id !== Gtk.ResponseType.APPLY) {
            return;
          }

          const servicePage = buildTab(service);
          const label = new Gtk.Label({ label: entry.text, margin: 10 });
          const idx = notebook.append_page(servicePage, label);
          log(idx);
          notebook.show_all();
          notebook.set_current_page(idx);
        });

        dialog.show_all();
      }

      const homePage = buildHomePage({ onAddService });
      const notebook = new Gtk.Notebook({ tab_pos: Gtk.PositionType.LEFT });
      notebook.append_page(
        homePage,
        new Gtk.Label({ label: "Gigagram", margin: 10 })
      );
      // notebook.expand = true;
      // notebook.connect("switch-page", (self, page, page_num) => {
      //   const tab = tabs[page_num];
      //   log(tab);
      //   // this._header.set_subtitle(tab.getTitle());
      // });

      this.add(notebook);
      this.show_all();

      // this.connect("activate", () => log("activate"));
      // this.connect("startup", () => log("startup"));

      // this._notebook.connect("switch-page", (self, page, page_num) => {
      //   const tab = tabs[page_num];
      //   this._header.set_subtitle(tab.getTitle());
      // });
      // log("truc");
    }
  }
);
