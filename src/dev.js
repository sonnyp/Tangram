imports.package.init({
  name: "re.sonny.gigagram",
  version: "1.0.0",
  prefix: ".",
  libdir: ".",
  datadir: ".",
});

const { getenv } = imports.gi.GLib;
const { Resource } = imports.gi.Gio;

if (getenv("DEV")) {
  Resource.load(
    `${pkg.pkgdatadir}/re.sonny.gigagram.data.gresource`
  )._register();
}

imports.package.run(imports.main);
