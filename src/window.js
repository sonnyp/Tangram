(() => {
  "use strict";

  const { getenv, VariantType } = imports.gi.GLib;
  const { ApplicationWindow, Notebook } = imports.gi.Gtk;
  const {
    Notification,
    NotificationPriority,
    SimpleAction,
    Settings,
    SettingsBindFlags,
  } = imports.gi.Gio;

  const { buildHomePage } = imports.homePage;
  const { Tab, TabLabel } = imports.tab;
  const { promptServiceDialog } = imports.serviceDialog;

  const settings = new Settings({
    schema_id: "re.sonny.gigagram",
  });

  this.Window = function Window(application) {
    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.applicationwindow
    const window = new ApplicationWindow({
      application,
      title: "Gigagram",
      default_height: 620,
      default_width: 840,
    });

    const selectTabAction = new SimpleAction({
      name: "selectTab",
      parameter_type: VariantType.new("s"),
    });
    selectTabAction.connect("activate", (self, parameters) => {
      const idx = parameters.deep_unpack();
      notebook.set_current_page(idx);
      window.present();
    });
    application.add_action(selectTabAction);

    const removeInstanceAction = new SimpleAction({
      name: "removeInstance",
      parameter_type: VariantType.new("s"),
    });
    removeInstanceAction.connect("activate", (self, parameters) => {
      const id = parameters.deep_unpack();

      const instances = new Set(settings.get_strv("instances"));
      instances.delete(id);
      settings.set_strv("instances", [...instances]);

      const instanceSettings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });
      // Undocumented?, removes the path
      instanceSettings.reset("");

      onRemoveInstance(id);
    });
    application.add_action(removeInstanceAction);

    function buildInstance({ url, name, service_id, id }) {
      notebook.set_show_tabs(true);
      const { label, page } = Tab(
        {
          url,
          name,
          window,
          service_id,
          id,
          onNotification({ title, body }) {
            // https://gjs-docs.gnome.org/gio20~2.0_api/gio.notification
            const notification = new Notification();
            if (title) notification.set_title(title);
            if (body) notification.set_body(body);
            notification.set_priority(NotificationPriority.HIGH);
            notification.set_default_action(`app.selectTab('${idx}')`);
            application.send_notification(null, notification);
          },
        },
        settings
      );
      const idx = notebook.append_page(page, label);
      notebook.set_tab_reorderable(page, true);
      return idx;
    }

    async function onAddService(service) {
      const instance = await promptServiceDialog({ window, service });
      if (!instance) return;

      const { name, url, id, service_id } = instance;
      const instances = settings.get_strv("instances");
      instances.push(id);
      settings.set_strv("instances", instances);

      const idx = buildInstance({ url, name, service_id, id });
      notebook.show_all();
      notebook.set_current_page(idx);
    }

    async function onRemoveInstance(id) {
      const instances = settings.get_strv("instances");
      const idx = instances.indexOf(id);
      notebook.remove_page(idx);
    }

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
    const notebook = new Notebook({ scrollable: true, show_tabs: false });
    function onPageReordered() {
      const number_of_pages = notebook.get_n_pages();

      const instances = settings.get_strv("instances");
      const reordered = [];

      for (let i = 0; i < number_of_pages; i++) {
        const id = notebook.get_nth_page(i).instance_id;
        if (!instances.includes(id)) continue;
        reordered.push(id);
      }

      settings.set_strv("instances", reordered);
    }
    notebook.connect("page-reordered", onPageReordered);
    settings.bind("tabs-position", notebook, "tab_pos", SettingsBindFlags.GET);
    const page = buildHomePage({ onAddService });
    notebook.append_page(page, TabLabel({ name: "Gigagram" }, settings));
    notebook.set_tab_reorderable(page, true);

    window.add(notebook);

    if (getenv("DEV") === "true") {
      buildInstance({
        url: "https://jhmux.codesandbox.io/",
        name: "Tests",
        id: "gigagram-tests",
        service_id: "custom",
      });
    }
    settings.get_strv("instances").forEach(id => {
      const settings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });
      const name = settings.get_string("name");
      const url = settings.get_string("url");
      const service_id = settings.get_string("service");
      if (!url || !service_id) return;

      buildInstance({ url, name, id, service_id });
    });

    window.show_all();

    return window;
  };
})();
