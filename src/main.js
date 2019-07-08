(() => {
  "use strict";

  pkg.initGettext();
  pkg.initFormat();
  pkg.require({
    Gio: "2.0",
    Gtk: "3.0",
  });

  const { Gio, Gtk } = imports.gi;
  const { GigagramWindow } = imports.window;

  this.main = function main(argv) {
    const application = new Gtk.Application({
      application_id: "re.sonny.gigagram",
      flags: Gio.ApplicationFlags.FLAGS_NONE,
    });

    application.connect("activate", (app, variant) => {
      let activeWindow = app.activeWindow;

      log(app);
      log(variant);

      if (!activeWindow) {
        activeWindow = new GigagramWindow(app);
      }

      activeWindow.present();
    });

    return application.run(argv);
  };
})();
