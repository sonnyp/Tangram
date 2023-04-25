import Adw from "gi://Adw";

import Window from "./window.js";
import state from "./state.js";

import "./style.css";

const application = new Adw.Application({
  application_id: "re.sonny.Tangram",
});

let window;
application.connect("activate", () => {
  if (!window) {
    window = Window({
      application,
      state,
    });
  }
  window.present();
});

export default application;
