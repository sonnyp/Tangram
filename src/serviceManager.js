const { byteArray } = imports;
const {
  ResourceLookupFlags,
  resources_enumerate_children,
  resources_lookup_data,
  File,
  IOErrorEnum,
  Resource,
} = imports.gi.Gio;
const {
  UserStyleSheet,
  UserContentInjectedFrames,
  UserStyleLevel,
} = imports.gi.WebKit2;

const services = [];
this.services = services;

const stylesheets = {};
this.stylesheets = stylesheets;

Resource.load(
  `${pkg.pkgdatadir}/re.sonny.Tangram.services.gresource`
)._register();

function load() {
  services.push(
    ...resources_enumerate_children(
      "/re/sonny/Tangram/services/",
      ResourceLookupFlags.NONE
    ).map(child => {
      const info = JSON.parse(
        byteArray.fromGBytes(
          resources_lookup_data(
            `/re/sonny/Tangram/services/${child}service.json`,
            ResourceLookupFlags.NONE
          )
        )
      );
      info.icon = `/re/sonny/Tangram/services/${child}icon.svg`;

      const styleFile = File.new_for_uri(
        `resource:///re/sonny/Tangram/services/${child}style.css`
      );
      let success;
      let content;
      try {
        [success, content] = styleFile.load_contents(null);
      } catch (err) {
        if (err.code !== IOErrorEnum.NOT_FOUND) {
          logError(err);
          throw err;
        }
      }
      if (success) {
        stylesheets[child.slice(0, -1)] = new UserStyleSheet(
          content.toString(),
          UserContentInjectedFrames.TOP_FRAME,
          UserStyleLevel.USER,
          null,
          null
        );
      }

      return info;
    })
  );
}
load();

this.get = function get(id) {
  return services.find(service => service.id === id);
};
