(() => {
  "use strict";

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

  const { programInvocationName } = imports.system;
  const { Application, AboutDialog, License, Builder } = imports.gi.Gtk;
  const { ApplicationFlags, SimpleAction } = imports.gi.Gio;
  const {
    getenv,
    // listenv,
    spawn_async,
    SpawnFlags,
    OptionFlags,
    OptionArg,
    set_prgname,
    set_application_name,
  } = imports.gi.GLib;
  const { set_program_class } = imports.gi.Gdk;

  const { Window } = imports.window;
  const { lookup } = imports.util;
  const { state } = imports.state;

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
    const application = new Application({
      application_id: "re.sonny.gigagram",
      flags: ApplicationFlags.NON_UNIQUE,
    });

    application.add_main_option(
      "name",
      null,
      OptionFlags.OPTIONAL_ARG,
      OptionArg.STRING,
      "Display name to use",
      "name"
    );
    application.add_main_option(
      "id",
      null,
      OptionFlags.OPTIONAL_ARG,
      OptionArg.STRING,
      "Application id to use",
      "application-id"
    );

    const profile = {
      title: "Gigagram",
      application_id: "re.sonny.gigagram",
    };
    // https://gitlab.gnome.org/GNOME/epiphany/blob/master/lib/ephy-web-app-utils.c#L484
    function setupProfile() {
      application.set_application_id(profile.application_id);
      // On X11 and wayland Shows in about dialog
      set_application_name("Gigagram");

      if (profile.id) {
        // On X11 does not show anywhere
        // I think this is supposed to be proc name
        // but does not work in gjs?
        // On wayland shows in GNOME Shell header bar
        // and task bar
        // On wayland is the wmclass
        set_prgname(profile.id);
        // On X11 shows in GNOME Shell header bar
        // on X11 is the wmclass
        // on Wayland does not show anywhere
        set_program_class(profile.id);
      } else {
        set_prgname("gigagram");
        set_program_class("Gigagram");
      }
    }
    application.connect("handle-local-options", (self, dict) => {
      const name = lookup(dict, "name");
      const id = lookup(dict, "id");

      if (name) {
        profile.name = name;
        profile.title = name;
      }
      if (id) {
        profile.id = id;
        profile.application_id += `.${id}`;
      }
      setupProfile();

      return -1;
    });

    let window;

    application.connect("activate", app => {
      window = app.activeWindow;

      if (!window) {
        window = Window({ state, application, profile });
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
        logo_icon_name: "re.sonny.gigagram",
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
        application.quit();
        spawn_async(null, argv, null, SpawnFlags.DEFAULT, null);
      });
      application.add_action(restart);
      application.set_accels_for_action("app.restart", ["<Ctrl><Shift>Q"]);
    }

    return application.run(argv);
  };
})();
