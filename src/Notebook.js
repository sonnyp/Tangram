const { build_filenamev } = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const { SettingsBindFlags, File, FileCopyFlags } = imports.gi.Gio;

const { Settings, connect } = imports.util;
const { state } = imports.state;
const {
  createApplication,
  launchApplication,
  buildApplicationId,
} = imports.applicationDialog;
const instances = imports.instances;
const { data_dir } = imports.env;
const flags = imports.flags;

this.detachTab = detachTab;
function detachTab({ instance_id, notebook, settings }) {
  const instance = instances.get(instance_id);
  const { name } = instance;
  const id = buildApplicationId(name);

  let icon = instance.getIconForDisplay();
  if (icon && icon.startsWith("resource://")) {
    const file = File.new_for_uri(icon);
    const dest = build_filenamev([data_dir, `${id}.svg`]);
    file.copy(File.new_for_path(dest), FileCopyFlags.OVERWRITE, null, null);
    icon = dest;
  }

  let desktopFilePath;
  try {
    desktopFilePath = createApplication({ name, icon, id }).desktopFilePath;
  } catch (err) {
    logError(err);
    // TODO show error
    return;
  }

  const newAppSettings = new Settings({
    schema_id: "re.sonny.Tangram",
    path: `/re/sonny/Tangram/applications/${id}/`,
  });
  instances.attach(newAppSettings, instance.id);

  try {
    launchApplication(desktopFilePath);
  } catch (err) {
    logError(err);
    // todo show error and cleanup
    return;
  }

  const idx = instances.detach(settings, instance.id);

  const page = notebook.get_nth_page(idx);
  notebook.detach_tab(page);
  const label = notebook.get_tab_label(page);
  if (label) label.destroy();
  page.destroy();
}

this.Notebook = function Notebook({ profile, settings }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
  const notebook = new Gtk.Notebook({ scrollable: true });
  this.notebook = notebook;
  // Tab bar only hides on custom applications
  if (profile.id) {
    state.bind(
      "instances",
      notebook,
      "show_tabs",
      instances => instances.length > 1
    );
  }
  notebook.connect("switch-page", (self, webview) => {
    state.set({ webview });
  });
  notebook.set_group_name("tabs");
  notebook.show_all();
  connect(
    notebook,
    {
      ["page-reordered"]() {
        const number_of_pages = notebook.get_n_pages();

        const instances = settings.get_strv("instances");
        const reordered = [];

        for (let i = 0; i < number_of_pages; i++) {
          const id = notebook.get_nth_page(i).instance_id;
          if (!instances.includes(id)) continue;
          reordered.push(id);
        }

        settings.set_strv("instances", reordered);
      },
    }
  );
  settings.bind("tabs-position", notebook, "tab_pos", SettingsBindFlags.GET);

  if (flags.custom_applications) {
    notebook.connect("create-window", (self, { instance_id } /*_x, _y */) => {
      detachTab({ instance_id, settings, notebook });
    });
  }

  return notebook;
};
