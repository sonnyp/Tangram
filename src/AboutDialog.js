const Gtk = imports.gi.Gtk;
const WebKit = imports.gi.WebKit2;

const { get_major_version, get_minor_version, get_micro_version } = WebKit;
const WebKitGTKVersion = `${get_major_version()}.${get_minor_version()}.${get_micro_version()}`;

this.AboutDialog = function AboutDialog({ window }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.aboutdialog
  const aboutDialog = new Gtk.AboutDialog({
    authors: ["Sonny Piers https://sonny.re"],
    artists: ["Tobias Bernard <tbernard@gnome.org>"],
    comments: [
      "Run web apps on your desktop",
      `Powered by WebKitGTK ${WebKitGTKVersion}`,
    ].join("\n"),
    copyright: "Copyright © 2019 Tangram authors",
    license_type: Gtk.License.GPL_3_0,
    version: pkg.version,
    website_label: "Learn more about Tangram",
    website: "https://github.com/sonnyp/Tangram",
    transient_for: window,
    modal: true,
    logo_icon_name: "re.sonny.Tangram",
  });
  aboutDialog.add_credit_section("Contributors", [
    // Add yourself as
    // "John Doe",
    // or
    // "John Doe <john@example.com>",
    // or
    // "John Doe https://john.com",
    "codyfish https://github.com/codyfish",
  ]);
  aboutDialog.present();
  return aboutDialog;
};
