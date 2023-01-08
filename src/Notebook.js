import Gio from "gi://Gio";

const { SettingsBindFlags } = Gio;

import { connect } from "./util.js";
import state from "./state.js";

export default function Notebook({ builder, settings, application }) {
  const notebook = builder.get_object("notebook");
  notebook.connect("switch-page", (self, webview) => {
    application.withdraw_notification(webview.instance_id);
    state.set({ webview });
  });
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

  return notebook;
}
