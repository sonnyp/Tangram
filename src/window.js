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

  const { instances, addInstance } = imports.instanceManager;
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

    const action = new SimpleAction({
      name: "selectTab",
      parameter_type: VariantType.new("s"),
    });
    action.connect("activate", (self, parameters) => {
      const [idx] = parameters.deep_unpack();
      notebook.set_current_page(idx);
      window.present();
    });
    application.add_action(action);

    function buildInstance({ url, name, service_id, id }) {
      const { label, page } = Tab({
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
      });
      const idx = notebook.append_page(page, label);
      return idx;
    }

    async function onAddService(service) {
      const instance = await promptServiceDialog({ window, service });
      if (!instance) return;

      const { name, url, id, service_id } = instance;
      addInstance(id);

      const idx = buildInstance({ url, name, service_id, id });
      notebook.show_all();
      notebook.set_current_page(idx);
    }

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
    const notebook = new Notebook();
    settings.bind("tabs-position", notebook, "tab_pos", SettingsBindFlags.GET);
    notebook.append_page(
      buildHomePage({ onAddService }),
      TabLabel({ name: "Gigagram" })
    );

    window.add(notebook);

    if (getenv("DEV") === "true") {
      buildInstance({
        url: "https://jhmux.codesandbox.io/",
        name: "Tests",
        id: "gigagram-tests",
        service_id: "custom",
      });
    }
    instances.forEach(id => {
      const settings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });
      const name = settings.get_string("name");
      const url = settings.get_string("url");
      const service_id = settings.get_string("service");

      buildInstance({ url, name, id, service_id });
    });

    window.show_all();

    return window;
  };
})();
