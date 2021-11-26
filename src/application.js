import Gtk from "gi://Gtk";

import Window from "./window.js";
import state from "./state.js";

const application = new Gtk.Application({
  application_id: "re.sonny.Tangram",
});

application.connect("activate", () => {
  Window({ state, application });
});

export default application;
