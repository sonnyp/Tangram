(() => {
  "use strict";

  const { GObject, Gtk } = imports.gi;

  const { instances, addInstance } = imports.instanceManager;
  const { buildHomePage } = imports.homePage;
  const { buildTab } = imports.tab;
  const { promptServiceDialog } = imports.serviceDialog;

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

          addInstance({ url, service_id: service.id, id, title: name });

          const instancePage = buildTab({
            url: service.url,
            title: name,
            window,
          });
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

        instances.forEach(instance => {
          const { title, url } = instance;
          const instancePage = buildTab({ url, title, window });
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
