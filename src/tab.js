import Gio from "gi://Gio";
import GdkPixbuf from "gi://GdkPixbuf";
import GObject from "gi://GObject";

import { MODES } from "./constants.js";
import { getFaviconAsPixbuf } from "./webapp/webapp.js";
import { buildWebView } from "./WebView.js";
import TabWidget from "./TabWidget.js";

const ICON_SIZE = 16;

function getFaviconScaled(webview) {
  const pixbuf = getFaviconAsPixbuf(webview);
  if (!pixbuf) return null;
  return pixbuf.scale_simple(
    ICON_SIZE,
    ICON_SIZE,
    GdkPixbuf.InterpType.BILINEAR,
  );
}

export function TabLabel({ instance, leaflet, editTab }) {
  const { webview } = instance;

  const list_box_row = new TabWidget();

  function connectFavicon() {
    webview.connect("notify::favicon", () => {
      const new_favicon = getFaviconScaled(webview);
      if (!new_favicon) {
        return;
      }
      list_box_row.image.set_from_pixbuf(new_favicon);
    });
  }

  const favicon = getFaviconScaled(webview);
  if (favicon) {
    list_box_row.image.set_from_pixbuf(favicon);
  }
  connectFavicon();

  instance.bind("name", list_box_row, "label", Gio.SettingsBindFlags.GET);

  list_box_row.button.connect("clicked", () => {
    editTab(instance, false);
  });

  leaflet.bind_property(
    "folded",
    list_box_row.button,
    "visible",
    GObject.BindingFlags.SYNC_CREATE,
  );

  list_box_row.instance_id = instance.id;

  return list_box_row;
}

export function TabPage({ instance, window, onNotification, application }) {
  const webview = buildWebView({
    instance,
    window,
    onNotification,
    application,
  });
  instance.webview = webview;
  webview.mode = MODES.PERMANENT;
  webview.instance_id = instance.id;
  return webview;
}
