const Gtk = imports.gi.Gtk;
const { SettingsBindFlags } = imports.gi.Gio;

import { Settings, connect } from "./util";
import state from "./state";
import {
  createApplication,
  launchApplication,
  buildApplicationId,
} from "./applicationDialog";
import {
  get as getInstance,
  attach as attachInstance,
  detach as detachInstance,
} from "./instances";
import flags from "./flags";

export function detachTab({ instance_id, notebook, settings }) {
  const instance = getInstance(instance_id);
  const { name, icon } = instance;
  const id = buildApplicationId(name);

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
  attachInstance(newAppSettings, instance.id);

  try {
    launchApplication(desktopFilePath);
  } catch (err) {
    logError(err);
    // todo show error and cleanup
    return;
  }

  const idx = detachInstance(settings, instance.id);

  const page = notebook.get_nth_page(idx);
  notebook.detach_tab(page);
  const label = notebook.get_tab_label(page);
  if (label) label.destroy();
  page.destroy();
}

export default function Notebook({ profile, settings, application }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
  const notebook = new Gtk.Notebook({ scrollable: true });
  // Tab bar only hides on custom applications
  if (profile.id) {
    state.bind(
      "instances",
      notebook,
      "show_tabs",
      instances => instances.length > 1,
    );
  }
  notebook.connect("switch-page", (self, webview) => {
    application.withdraw_notification(webview.instance_id);
    state.set({ webview });
  });
  notebook.set_group_name("tabs");
  notebook.show_all();
  connect(notebook, {
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
  });
  settings.bind("tabs-position", notebook, "tab_pos", SettingsBindFlags.GET);

  if (flags.custom_applications) {
    notebook.connect("create-window", (self, { instance_id } /*_x, _y */) => {
      detachTab({ instance_id, settings, notebook });
    });
  }

  return notebook;
}
