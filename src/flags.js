const { getenv } = imports.gi.GLib;

this.custom_applications =
  getenv("TANGRAM_ENABLE_CUSTOM_APPLICATIONS") === "true";
log(`flag TANGRAM_ENABLE_CUSTOM_APPLICATIONS ${this.custom_applications}`);

this.custom_icons = getenv("TANGRAM_ENABLE_CUSTOM_ICONS") === "true";
log(`flag TANGRAM_ENABLE_CUSTOM_ICONS ${this.custom_icons}`);
