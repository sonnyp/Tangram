(() => {
  "use strict";

  const {
    getenv,
    get_user_cache_dir,
    get_user_data_dir,
    build_filenamev,
    get_current_dir,
    get_home_dir,
    get_user_config_dir,
  } = imports.gi.GLib;

  const FLATPAK_ID = getenv("FLATPAK_ID");
  const DEV = getenv("DEV");
  let env;
  if (FLATPAK_ID) {
    env = "flatpak";
  } else if (DEV) {
    env = "dev";
  } else {
    env = "host";
  }

  this.env = env;
  log(`env: ${env}`);

  this.data_dir =
    env === "dev"
      ? build_filenamev([get_current_dir(), "var/data"])
      : build_filenamev([get_user_data_dir(), "gigagram"]);
  log(`data_dir: ${this.data_dir}`);

  this.cache_dir =
    env === "dev"
      ? build_filenamev([get_current_dir(), "var/cache"])
      : build_filenamev([get_user_cache_dir(), "gigagram"]);
  log(`cache_dir: ${this.cache_dir}`);

  this.config_dir =
    env === "dev"
      ? build_filenamev([get_current_dir(), "var/config"])
      : build_filenamev([get_user_config_dir(), "gigagram"]);
  log(`config: ${this.config_dir}`);

  this.applications_dir = (() => {
    switch (env) {
      case "dev":
        return build_filenamev([get_current_dir(), "var/applications"]);
      case "flatpak":
        return build_filenamev([get_home_dir(), ".local/share/applications"]);
      default:
        return build_filenamev([get_user_data_dir(), "applications"]);
    }
  })();
  log(`applications_dir: ${this.applications_dir}`);

  this.keyfile_settings_path = (() => {
    switch (env) {
      case "host":
        return "";
      // TODO with Sdk 3.34 null backend should just work on flatpak
      // and no need to migrate as we already use the right path
      // flatpak: https://blogs.gnome.org/mclasen/2019/07/12/settings-in-a-sandbox-world/
      default:
        return build_filenamev([this.config_dir, "glib-2.0/settings/keyfile"]);
    }
  })();
  log(`keyfile_settings_path: ${this.keyfile_settings_path}`);
})();
