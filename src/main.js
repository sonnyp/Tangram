(() => {
  "use strict";

  pkg.initGettext();
  pkg.initFormat();
  pkg.require({
    Gio: "2.0",
    Gtk: "3.0",
  });

  const { programInvocationName } = imports.system;
  const { Application, AboutDialog, License } = imports.gi.Gtk;
  const { ApplicationFlags, SimpleAction } = imports.gi.Gio;
  const {
    getenv,
    listenv,
    set_prgname,
    spawn_async,
    SpawnFlags,
  } = imports.gi.GLib;

  const { Window } = imports.window;

  if (getenv("DEV")) {
    listenv().forEach(name => {
      log(`${name}: ${getenv(name)}`);
    });
  }

  this.main = function main(argv) {
    const application = new Application({
      application_id: "re.sonny.gigagram",
      flags: ApplicationFlags.FLAGS_NONE,
    });

    set_prgname("Gigagram");

    let window;

    application.connect("activate", app => {
      window = app.activeWindow;

      if (!window) {
        window = Window(app);
      }

      window.present();
    });

    const showAboutDialog = new SimpleAction({
      name: "about",
      parameter_type: null,
    });
    showAboutDialog.connect("activate", () => {
      const aboutDialog = new AboutDialog({
        authors: ["Sonny Piers <sonny@fastmail.net>"],
        comments: "Web applications runner/manager",
        copyright: "Copyright © 2019 Gigagram authors",
        license_type: License.GPL_3_0_ONLY,
        version: pkg.version,
        website_label: "Learn more about Gigagram",
        website: "https://github.com/sonnyp/gigagram",
        transient_for: window,
        modal: true,
      });
      aboutDialog.present();
    });
    application.add_action(showAboutDialog);

    const quit = new SimpleAction({
      name: "quit",
      parameter_type: null,
    });
    quit.connect("activate", () => {
      application.quit();
    });
    application.add_action(quit);
    application.set_accels_for_action("app.quit", ["<Ctrl>Q"]);

    if (getenv("DEV")) {
      const restart = new SimpleAction({
        name: "restart",
        parameter_type: null,
      });
      restart.connect("activate", () => {
        const argv = [getenv("_"), programInvocationName, ...ARGV];
        application.quit();
        spawn_async(null, argv, null, SpawnFlags.DEFAULT, null);
      });
      application.add_action(restart);
      application.set_accels_for_action("app.restart", ["<Ctrl>R"]);
    }

    return application.run(argv);
  };
})();
