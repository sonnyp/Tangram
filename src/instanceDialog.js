import Gtk from "gi://Gtk";
import { gettext as _ } from "gettext";
import WebKit2 from "gi://WebKit2";
import Adw from "gi://Adw";
import GObject from "gi://GObject";

import { once } from "../troll/src/util.js";
import instance_dialog from "./instanceDialog.blp" assert { type: "string" };

export function editInstanceDialog(props) {
  return instanceDialog({ ...props, mode: "edit" });
}

export function addInstanceDialog(props) {
  return instanceDialog({ ...props, mode: "add" });
}

const webkit_settings = [
  [
    "enable-javascript",
    "auto-load-images",
    "load-icons-ignoring-image-load-setting",
    "enable-offline-web-application-cache",
    "enable-html5-local-storage",
    "enable-html5-database",
    "enable-xss-auditor",
    "enable-frame-flattening",
    "enable-plugins",
    "enable-java",
    "javascript-can-open-windows-automatically",
    "enable-hyperlink-auditing",
    "default-font-family",
    "monospace-font-family",
    "serif-font-family",
    "sans-serif-font-family",
    "cursive-font-family",
    "fantasy-font-family",
    "pictograph-font-family",
    "default-font-size",
    "default-monospace-font-size",
    "minimum-font-size",
    "default-charset",
    "enable-private-browsing",
    "enable-developer-extras",
    "enable-resizable-text-areas",
    "enable-tabs-to-links",
    "enable-dns-prefetching",
    "enable-caret-browsing",
    "enable-fullscreen",
    "print-backgrounds",
    "enable-webaudio",
    "enable-webgl",
    "allow-modal-dialogs",
    "zoom-text-only",
    "javascript-can-access-clipboard",
    "media-playback-requires-user-gesture",
    "media-playback-allows-inline",
    "draw-compositing-indicators",
    "enable-site-specific-quirks",
    "enable-page-cache",
    "user-agent",
    "enable-smooth-scrolling",
    "enable-accelerated-2d-canvas",
    "enable-write-console-messages-to-stdout",
    "enable-media-stream",
    "enable-mock-capture-devices",
    "enable-spatial-navigation",
    "enable-mediasource",
    "enable-encrypted-media",
    "enable-media-capabilities",
    "allow-file-access-from-file-urls",
    "allow-universal-access-from-file-urls",
    "allow-top-navigation-to-data-urls",
    "hardware-acceleration-policy",
    "enable-back-forward-navigation-gestures",
    "enable-javascript-markup",
    "enable-media",
    "media-content-types-requiring-hardware-support",
    "enable-webrtc",
  ],
];

async function instanceDialog({ window, instance, mode }) {
  const builder = Gtk.Builder.new_from_string(instance_dialog, -1);
  const dialog = builder.get_object("dialog");
  dialog.title = instance.name;
  dialog.set_transient_for(window);

  const button_save = builder.get_object("button_save");
  button_save.label = mode === "add" ? _("Add") : _("Update");

  const nameEntry = builder.get_object("name");
  nameEntry.text = instance.settings.get_string("name");

  const URLEntry = builder.get_object("url");
  URLEntry.text = instance.settings.get_string("url");

  button_save.set_sensitive(!!URLEntry.text);
  URLEntry.connect("changed", () => {
    const isValid = !!URLEntry.text;
    button_save.set_sensitive(isValid);
  });

  const notificationsPriority = builder.get_object("notifications-priority");
  notificationsPriority.selected = instance.settings.get_enum(
    "notifications-priority",
  );

  const userAgentEntry = builder.get_object("user-agent");
  userAgentEntry.text = instance.settings.get_string("user-agent");

  if (mode === "edit") {
    builder.get_object("advanced_row").visible = true;
    const webview_settings = instance.webview.get_settings();

    log(WebKit2.Settings.list_properties().map((prop) => prop.name));
    for (const prop of WebKit2.Settings.list_properties()) {
      const gtype = prop.value_type.name;
      let row;

      log(prop.name, gtype);

      if (gtype === "gboolean") {
        row = new Adw.ActionRow({
          title: prop.nick,
        });
        const gswitch = new Gtk.Switch({
          valign: Gtk.Align.CENTER,
        });
        row.add_suffix(gswitch);
        webview_settings.bind_property(
          prop.name,
          gswitch,
          "active",
          GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL,
        );
      } else if (gtype === "gchararray") {
        row = new Adw.EntryRow({
          title: prop.nick,
        });
        webview_settings.bind_property_full(
          prop.name,
          row,
          "text",
          GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL,
          (bind, value) => [true, typeof value === "string" ? value : ""],
          null,
        );
      }
      // else if (gtype === "WebKitHardwareAccelerationPolicy") {
      //   const value = instance.webview.get_settings()[prop.name];
      //   row = new Adw.ComboRow({
      //     title: prop.nick,
      //     model: new Adw.EnumListModel({
      //       enum_type: WebKit2.HardwareAccelerationPolicy,
      //     }),
      //     expression: new Gtk.Expression(
      //       WebKit2.HardwareAccelerationPolicy,
      //       null,
      //       "nick",
      //     ),
      //   });
      //   log(value);
      // }

      if (row) {
        builder.get_object("advanced").add_row(row);
      }
    }
  }

  dialog.show();

  const [response_id] = await once(dialog, "response");
  if (response_id === Gtk.ResponseType.DELETE_EVENT) {
    return true;
  }

  if (response_id !== Gtk.ResponseType.APPLY) {
    dialog.destroy();
    return true;
  }

  instance.settings.set_string("name", nameEntry.text);
  instance.settings.set_string("url", URLEntry.text);
  instance.settings.set_string("user-agent", userAgentEntry.text);
  instance.settings.set_enum(
    "notifications-priority",
    notificationsPriority.selected,
  );

  dialog.destroy();

  return false;
}
