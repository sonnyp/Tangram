import GLib from "gi://GLib";

const {
  getenv,
  get_user_cache_dir,
  get_user_data_dir,
  build_filenamev,
  get_current_dir,
  get_home_dir,
  get_user_config_dir,
  file_test,
  FileTest,
} = GLib;

export const env = (() => {
  // On flatpak 1.0 (Ubuntu 18.04 and derivates such as Mint 19.3)
  // FLATPAK_ID is not defined
  if (getenv("FLATPAK_ID") || file_test("/.flatpak-info", FileTest.EXISTS)) {
    return "flatpak";
  }

  if (getenv("DEV")) {
    return "dev";
  }

  return "host";
})();
log(`env: ${env}`);

export const data_dir =
  env === "dev"
    ? build_filenamev([get_current_dir(), "var/data/Tangram"])
    : build_filenamev([get_user_data_dir(), "Tangram"]);
log(`data_dir: ${data_dir}`);

export const cache_dir =
  env === "dev"
    ? build_filenamev([get_current_dir(), "var/cache/Tangram"])
    : build_filenamev([get_user_cache_dir(), "Tangram"]);
log(`cache_dir: ${cache_dir}`);

export const config_dir =
  env === "dev"
    ? build_filenamev([get_current_dir(), "var/config/Tangram"])
    : build_filenamev([get_user_config_dir(), "Tangram"]);
log(`config_dir: ${config_dir}`);

export const applications_dir = (() => {
  switch (env) {
    case "dev":
      return build_filenamev([get_current_dir(), "var/applications"]);
    case "flatpak":
      return build_filenamev([get_home_dir(), ".local/share/applications"]);
    default:
      return build_filenamev([get_user_data_dir(), "applications"]);
  }
})();
log(`applications_dir: ${applications_dir}`);

// On Flatpak with org.gnome.Platform//3.34 (which we use)
// dconf defaults to using the keyfile backend with
// ~/.var/app/re.sonny.Tangram/config/glib-2.0/settings/keyfile
// so there is no need to specify keyfile backend
// see https://blogs.gnome.org/mclasen/2019/07/12/settings-in-a-sandbox-world/
export const keyfile_settings_path =
  env === "dev"
    ? build_filenamev([
        get_current_dir(),
        "var/config/",
        "glib-2.0/settings/keyfile",
      ])
    : "";
log(`keyfile_settings_path: ${keyfile_settings_path}`);
