pkg.initGettext();
pkg.initFormat();
pkg.require({
  Gio: "2.0",
  Gtk: "3.0",
  GLib: "2.0",
  WebKit2: "4.0",
  Gdk: "3.0",
  GdkPixbuf: "2.0",
  GObject: "2.0",
});

imports.std.globals;

const { programInvocationName } = imports.system;
const { SimpleAction } = imports.gi.Gio;
const {
  getenv,
  // listenv,
  spawn_async,
  SpawnFlags,
  log_writer_is_journald,
  setenv,
} = imports.gi.GLib;

const { application } = imports.application;

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
// listenv().forEach(name => {
//   log(`env ${name}: ${getenv(name)}`);
// });

this.main = function main(argv) {
  log(`argv: ${argv.join(" ")}`);

  if (getenv("DEV")) {
    const restart = new SimpleAction({
      name: "restart",
      parameter_type: null,
    });
    restart.connect("activate", () => {
      application.quit();
      spawn_async(null, argv, null, SpawnFlags.DEFAULT, null);
    });
    application.add_action(restart);
    application.set_accels_for_action("app.restart", ["<Ctrl><Shift>Q"]);
  }

  return application.run(argv);
};
