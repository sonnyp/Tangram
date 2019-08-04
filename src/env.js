(() => {
  "use strict";

  const {
    getenv,
    get_user_cache_dir,
    get_user_data_dir,
    build_filenamev,
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
      ? "./var/data/"
      : build_filenamev([get_user_data_dir(), "gigagram"]);
  log(`data_dir: ${this.data_dir}`);
  this.cache_dir =
    env === "dev"
      ? "./var/cache/"
      : build_filenamev([get_user_cache_dir(), "gigagram"]);
  log(`cache_dir: ${this.cache_dir}`);
  this.applications_dir =
    env === "dev"
      ? `./var/applications/`
      : build_filenamev([get_user_data_dir(), "applications"]);
  log(`applications_dir: ${this.applications_dir}`);
})();
