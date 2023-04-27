import "gi://Adw?version=1";
import "gi://WebKit?version=6.0";
import GLib from "gi://GLib";
import Gio from "gi://Gio";

import Application from "./application.js";

pkg.initGettext();

GLib.setenv(
  "PULSE_PROP_application.icon_name",
  "re.sonny.Tangram-symbolic",
  true,
);
GLib.setenv("PULSE_PROP_media.role", "video", true);

export function main(argv = []) {
  const application = Application();

  if (__DEV__) {
    const restart = new Gio.SimpleAction({
      name: "restart",
      parameter_type: null,
    });
    restart.connect("activate", () => {
      application.quit();
      GLib.spawn_async(null, argv, null, GLib.SpawnFlags.DEFAULT, null);
    });
    application.add_action(restart);
    application.set_accels_for_action("app.restart", ["<Primary><Shift>Q"]);
  }

  return application.runAsync(argv);
}
