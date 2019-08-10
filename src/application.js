const { Application, Builder } = imports.gi.Gtk;
const { ApplicationFlags, SimpleAction } = imports.gi.Gio;
const {
  OptionFlags,
  OptionArg,
  set_prgname,
  set_application_name,
} = imports.gi.GLib;
const { set_program_class } = imports.gi.Gdk;
const { AboutDialog } = imports.AboutDialog;

const { Window } = imports.window;
const { lookup } = imports.util;
const { state } = imports.state;

const application = new Application({
  application_id: "re.sonny.Tangram",
  flags: ApplicationFlags.NON_UNIQUE,
});
this.application = application;

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
  title: "Tangram",
  application_id: "re.sonny.Tangram",
};
// https://gitlab.gnome.org/GNOME/epiphany/blob/master/lib/ephy-web-app-utils.c#L484
function setupProfile() {
  application.set_application_id(profile.application_id);
  // On X11 and wayland Shows in about dialog
  set_application_name("Tangram");

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
    set_prgname("Tangram");
    set_program_class("Tangram");
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
  AboutDialog({ window });
});
application.add_action(showAboutDialog);

const showShortcutsDialog = new SimpleAction({
  name: "shortcuts",
  parameter_type: null,
});
showShortcutsDialog.connect("activate", () => {
  const builder = Builder.new_from_resource(
    "/re/sonny/Tangram/data/shortcuts.xml.ui"
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
