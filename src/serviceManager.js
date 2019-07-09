(() => {
  "use strict";

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

  function register() {
    const resource = Resource.load(
      `${pkg.pkgdatadir}/re.sonny.gigagram.services.gresource`
    );
    resource._register();
  }
  register();

  function load() {
    services.push(
      ...resources_enumerate_children(
        "/re/sonny/gigagram/services/",
        ResourceLookupFlags.NONE
      ).map(child => {
        const info = JSON.parse(
          byteArray.fromGBytes(
            resources_lookup_data(
              `/re/sonny/gigagram/services/${child}service.json`,
              ResourceLookupFlags.NONE
            )
          )
        );
        info.icon = `/re/sonny/gigagram/services/${child}icon.svg`;

        const styleFile = File.new_for_uri(
          `resource:///re/sonny/gigagram/services/${child}style.css`
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
})();
