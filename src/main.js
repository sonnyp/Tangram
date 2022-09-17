import "gi://WebKit2?version=5.0";
import { programInvocationName } from "system";
import GLib from "gi://GLib";
import Gio from "gi://Gio";

// FIXME: investigate pkg not being defined
// for some reason globalThis appears to be different in re.sonny.Tangram / scripts
// globalThis.pkg = imports.package;

const { SimpleAction } = Gio;
const {
  getenv,
  // listenv,
  spawn_async,
  SpawnFlags,
  log_writer_is_journald,
  setenv,
} = GLib;

GLib.set_prgname("re.sonny.Tangram");
GLib.set_application_name("Tangram");

import application from "./application.js";

if (getenv("DEV")) {
  if (log_writer_is_journald(2)) {
    setenv("G_MESSAGES_DEBUG", "re.sonny.Tangram", false);
  }
}

// Debug
log(`programInvocationName: ${programInvocationName}`);
log(`_: ${getenv("_")}`);
for (const i in pkg) {
  if (typeof pkg[i] === "string") {
    log(`pkg.${i}: ${pkg[i]}`);
  }
}
// listenv().forEach((name) => {
//   log(`env ${name}: ${getenv(name)}`);
// });

export default function main(argv = []) {
  log("argv " + argv.join(" "));

  if (getenv("DEV")) {
    const restart = new SimpleAction({
      name: "restart",
      parameter_type: null,
    });
    restart.connect("activate", () => {
      application.quit();
      log(argv);
      spawn_async(null, argv, null, SpawnFlags.DEFAULT, null);
    });
    application.add_action(restart);
    application.set_accels_for_action("app.restart", ["<Primary><Shift>Q"]);
  }
  return application.run(argv);
}
