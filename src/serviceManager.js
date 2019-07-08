(() => {
  "use strict";

  const { byteArray } = imports;
  const {
    ResourceLookupFlags,
    resources_enumerate_children,
    resources_lookup_data,
  } = imports.gi.Gio;

  const services = [];
  this.services = services;

  function register() {
    const resource = imports.gi.Gio.Resource.load(
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
        return info;
      })
    );
  }

  load();
})();
