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

(() => {
  "use strict";

  const { GObject, Gtk, GLib, Gio } = imports.gi;

  const { buildHomePage } = imports.homePage;
  const { buildTab } = imports.tab;
  const { promptServiceDialog } = imports.serviceDialog;

  const db = [];

  const dbPath = GLib.build_filenamev([
    GLib.get_user_config_dir(),
    "Gigagram.json",
  ]);
  const dbFile = Gio.File.new_for_path(dbPath);

  function save() {
    dbFile.replace_contents(
      JSON.stringify(db, null, 2),
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null
    );
  }

  function load() {
    let success;
    let content;

    try {
      [success, content] = dbFile.load_contents(null);
    } catch (err) {
      if (err.code === Gio.IOErrorEnum.NOT_FOUND) {
        return;
      }
      throw err;
    }
    if (!success) {
      return;
    }

    try {
      db.push(...JSON.parse(content));
    } catch (err) {
      logError(err);
    }
  }

  load();

  this.GigagramWindow = GObject.registerClass(
    {
      // GTypeName: "GigagramWindow",
      // Template: "resource:///re/sonny/gigagram/window.ui",
      // InternalChildren: ["label"]
    },
    class GigagramWindow extends Gtk.ApplicationWindow {
      _init(application) {
        super._init({
          application,
          title: "Gigagram",
          default_height: 620,
          default_width: 840,
        });

        const window = this;

        // this.add(homePage);
        // this.show_all();

        // this._header = this._getHeader();
        // this._window.set_titlebar(this._header);

        // tabs = services.map(service => {
        //   const tab = new Tab(service, this);
        //   this._notebook.append_page(tab.page, tab.label);
        //   return tab;
        // });

        async function onAddService(service) {
          const instance = await promptServiceDialog({ window, service });
          if (!instance) return;

          const { name, url, id } = instance;

          db.push({ url, service_id: service.id, id, title: name });
          save();

          const instancePage = buildTab(service.url, name);
          const instanceLabel = new Gtk.Label({ label: name, margin: 10 });
          const idx = notebook.append_page(instancePage, instanceLabel);
          notebook.show_all();
          notebook.set_current_page(idx);
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

        db.forEach(instance => {
          const { title, url } = instance;
          const instancePage = buildTab(url, title);
          const label = new Gtk.Label({ label: title, margin: 10 });
          notebook.append_page(instancePage, label);
        });

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
})();
