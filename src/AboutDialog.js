const Gtk = imports.gi.Gtk;
const WebKit = imports.gi.WebKit2;
const system = imports.system;

const { get_major_version, get_minor_version, get_micro_version } = WebKit;
const WebKitGTKVersion = `${get_major_version()}.${get_minor_version()}.${get_micro_version()}`;

const gjsVersion = (() => {
  const v = system.version.toString();
  return `${v[0]}.${+(v[1] + v[2])}.${+(v[3] + v[4])}`;
})();

log(`gjs ${gjsVersion}`);
log(`WebKitGTK ${WebKitGTKVersion}`);

export default function AboutDialog({ window }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.aboutdialog
  const aboutDialog = new Gtk.AboutDialog({
    authors: ["Sonny Piers https://sonny.re"],
    artists: ["Tobias Bernard <tbernard@gnome.org>"],
    comments: [
      "Run web apps on your desktop",
      "",
      `Powered by WebKitGTK ${WebKitGTKVersion}`,
      `Powered by gjs ${gjsVersion}`,
    ].join("\n"),
    copyright: "Copyright 2019-2021 Sonny Piers",
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
  aboutDialog.connect("response", () => {
    aboutDialog.destroy();
  });

  return aboutDialog;
}
