imports.package.init({
  name: "re.sonny.gigagram",
  version: "1.0.0",
  prefix: ".",
  libdir: ".",
  datadir: ".",
});

const { Gio } = imports.gi;
const resource = Gio.Resource.load(
  "./src/re.sonny.gigagram.services.gresource"
);
resource._register();

imports.package.run(imports.main);
