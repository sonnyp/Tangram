import Gtk from "gi://Gtk";
import WebKit from "gi://WebKit2";
import Soup from "gi://Soup";

import { getGIRepositoryVersion, getGjsVersion } from "./utils.js";

const WebKitGTKVersion = getGIRepositoryVersion(WebKit);
const gjsVersion = getGjsVersion();
const soupVersion = getGIRepositoryVersion(Soup);

log(`gjs ${gjsVersion}`);
log(`WebKitGTK ${WebKitGTKVersion}`);
log(`libsoup ${soupVersion}`);

export default function AboutDialog({ window }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.aboutdialog
  const aboutDialog = new Gtk.AboutDialog({
    authors: ["Sonny Piers https://sonny.re"],
    artists: ["Tobias Bernard <tbernard@gnome.org>"],
    comments: [
      "Browser for your pinned tabs",
      "",
      `Powered by WebKitGTK ${WebKitGTKVersion}`,
      `Powered by gjs ${gjsVersion}`,
      `Powered by libsoup ${soupVersion}`,
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
