#!/usr/bin/env gjs

// https://gitlab.gnome.org/GNOME/gjs/wikis/Package/Specification
// https://gitlab.gnome.org/GNOME/gjs/blob/master/modules/package.js
imports.package.init({
  name: "re.sonny.gigagram",
  version: "1.0.0",
  prefix: ".",
  libdir: ".",
  datadir: ".",
});

const { setenv } = imports.gi.GLib;
const { Resource } = imports.gi.Gio;

setenv("DEV", "true", false);

Resource.load(`${pkg.pkgdatadir}/re.sonny.gigagram.data.gresource`)._register();

imports.package.run(imports.main);
