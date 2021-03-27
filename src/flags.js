import GLib from "gi://GLib";

const { getenv } = GLib;

const custom_applications =
  getenv("TANGRAM_ENABLE_CUSTOM_APPLICATIONS") === "true";
log(`flag TANGRAM_ENABLE_CUSTOM_APPLICATIONS ${custom_applications}`);

const custom_icons = getenv("TANGRAM_ENABLE_CUSTOM_ICONS") === "true";
log(`flag TANGRAM_ENABLE_CUSTOM_ICONS ${custom_icons}`);

export default { custom_applications, custom_icons };
