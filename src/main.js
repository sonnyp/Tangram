(() => {
  "use strict";

  pkg.initGettext();
  pkg.initFormat();
  pkg.require({
    Gio: "2.0",
    Gtk: "3.0",
  });

  const { programInvocationName } = imports.system;
  const { Application, AboutDialog, License, Builder } = imports.gi.Gtk;
  const { ApplicationFlags, SimpleAction } = imports.gi.Gio;
  const {
    getenv,
    listenv,
    set_prgname,
    spawn_async,
    SpawnFlags,
    OptionFlags,
    OptionArg,
    VariantType,
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
      flags: ApplicationFlags.NON_UNIQUE | ApplicationFlags.CAN_OVERRIDE_APP_ID,
    });

    set_prgname("Gigagram");

    application.add_main_option(
      "application",
      "a".charCodeAt(0),
      OptionFlags.OPTIONAL_ARG,
      OptionArg.STRING,
      "Application id to use",
      "application-id"
    );

    let profile;
    application.connect("handle-local-options", (self, dict) => {
      const variant = dict.lookup_value("application", new VariantType("s"));
      if (variant) {
        [profile] = variant.get_string();
      }

      return -1;
    });

    let window;

    application.connect("activate", app => {
      window = app.activeWindow;

      if (!window) {
        window = Window({ application, profile });
      }

      window.present();
    });

    const showAboutDialog = new SimpleAction({
      name: "about",
      parameter_type: null,
    });
    showAboutDialog.connect("activate", () => {
      const aboutDialog = new AboutDialog({
        authors: ["Sonny Piers https://sonny.re"],
        comments: "Web applications runner/manager",
        copyright: "Copyright © 2019 Gigagram authors",
        license_type: License.GPL_3_0,
        version: pkg.version,
        website_label: "Learn more about Gigagram",
        website: "https://github.com/sonnyp/gigagram",
        transient_for: window,
        modal: true,
      });
      aboutDialog.add_credit_section("Contributors", [
        // Add yourself as
        // "John Doe",
        // or
        // "John Doe <john@example.com>",
        // or
        // "John Doe https://john.com",
      ]);

      aboutDialog.present();
    });
    application.add_action(showAboutDialog);

    const showShortcutsDialog = new SimpleAction({
      name: "shortcuts",
      parameter_type: null,
    });
    showShortcutsDialog.connect("activate", () => {
      const builder = Builder.new_from_resource(
        "/re/sonny/gigagram/data/shortcuts.xml.ui"
      );
      const shortcutsWindow = builder.get_object("shortcuts-window");
      shortcutsWindow.set_transient_for(window);
      shortcutsWindow.present();
    });
    application.add_action(showShortcutsDialog);
    application.set_accels_for_action("app.shortcuts", [
      "<Ctrl>F1",
      "<Ctrl>question",
    ]);

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
      application.set_accels_for_action("app.restart", ["<Ctrl><Shift>Q"]);
    }

    return application.run(argv);
  };
})();
