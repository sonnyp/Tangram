(() => {
  "use strict";

  const { getenv, VariantType } = imports.gi.GLib;
  const { ApplicationWindow, Label, PositionType, Notebook } = imports.gi.Gtk;
  const { Notification, NotificationPriority, SimpleAction } = imports.gi.Gio;

  const { instances, addInstance } = imports.instanceManager;
  const { buildHomePage } = imports.homePage;
  const { buildTab } = imports.tab;
  const { promptServiceDialog } = imports.serviceDialog;

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

    function buildInstance({ url, name, service_id }) {
      const instancePage = buildTab({
        url: url,
        title: name,
        window,
        service_id,
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
      const instanceLabel = new Label({ label: name, margin: 10 });
      const idx = notebook.append_page(instancePage, instanceLabel);
      return idx;
    }

    async function onAddService(service) {
      const instance = await promptServiceDialog({ window, service });
      if (!instance) return;

      const { name, url, id } = instance;

      addInstance({ url, service_id: service.id, id, title: name });

      const idx = buildInstance({ url, name, service_id: service.id });
      notebook.show_all();
      notebook.set_current_page(idx);
    }

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
    const notebook = new Notebook({ tab_pos: PositionType.LEFT });
    notebook.append_page(
      buildHomePage({ onAddService }),
      new Label({ label: "Gigagram", margin: 10 })
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
    instances.forEach(instance => {
      const { title, url, service_id } = instance;
      buildInstance({ url, name: title, service_id });
    });

    window.show_all();

    return window;
  };
})();
