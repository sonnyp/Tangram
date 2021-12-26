import Gtk from "gi://Gtk";
import WebKit from "gi://WebKit2";
import Soup from "gi://Soup";
import { gettext as _ } from "gettext";

import { getGIRepositoryVersion, getGjsVersion } from "./utils.js";

const WebKitGTKVersion = getGIRepositoryVersion(WebKit);
const gjsVersion = getGjsVersion();
const soupVersion = getGIRepositoryVersion(Soup);

log(`gjs ${gjsVersion}`);
log(`WebKitGTK ${WebKitGTKVersion}`);
log(`libsoup ${soupVersion}`);

export default function AboutDialog({ window }) {
  const aboutDialog = new Gtk.AboutDialog({
    authors: ["Sonny Piers https://sonny.re"],
    artists: ["Tobias Bernard <tbernard@gnome.org>"],
    comments: [
      "Browser for your pinned tabs",
      "Powered by",
      `WebKitGTK ${WebKitGTKVersion}`,
      `gjs ${gjsVersion}`,
      `libsoup ${soupVersion}`,
    ].join("\n"),
    copyright: "Copyright 2019-2022 Sonny Piers",
    license_type: Gtk.License.GPL_3_0,
    version: pkg.version,
    website: "https://github.com/sonnyp/Tangram",
    transient_for: window,
    modal: true,
    logo_icon_name: "re.sonny.Tangram",
    // TRANSLATORS: eg. 'Translator Name <your.email@domain.com>' or 'Translator Name https://website.example'
    translator_credits: _("translator-credits"),
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
}
