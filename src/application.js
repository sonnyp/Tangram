import Adw from "gi://Adw";

import Window from "./window.js";
import state from "./state.js";

import "./blank.html";

const application = new Adw.Application({
  application_id: "re.sonny.Tangram",
});

application.connect("activate", () => {
  Window({ state, application });
});

export default application;
