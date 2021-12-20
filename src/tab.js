import Gio from "gi://Gio";
import GdkPixbuf from "gi://GdkPixbuf";

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

export function TabLabel({ instance, settings, page }) {
  const { id } = instance;

  // FIXME: Replace with padding
  // so that right click on the space works
  // const box = new Gtk.Box({
  //   margin_top: 6,
  //   margin_bottom: 6,
  // });
  const widget = new TabWidget();

  function connectFavicon() {
    page.connect("notify::favicon", () => {
      const new_favicon = getFaviconScaled(page);
      if (!new_favicon) {
        return;
      }
      widget.image.set_from_pixbuf(new_favicon);
    });
  }

  const favicon = getFaviconScaled(page);
  if (favicon) {
    widget.image.set_from_pixbuf(favicon);
  }
  connectFavicon();

  instance.bind("name", widget, "label", Gio.SettingsBindFlags.GET);

  const menu = new Gio.Menu();
  menu.append("Edit", `win.editInstance("${id}")`);
  menu.append("Remove", `win.removeInstance("${id}")`);
  widget.popover.set_menu_model(menu);

  // FIXME we should invert for better placement
  // top <-> bottom
  // left <-> right
  settings.bind(
    "tabs-position",
    widget.popover,
    "position",
    Gio.SettingsBindFlags.GET,
  );

  return widget;
}

export function TabPage({ instance, window, onNotification, application }) {
  const webView = buildWebView({
    instance,
    window,
    onNotification,
    application,
  });
  instance.page = webView;
  webView.mode = MODES.PERMANENT;
  return webView;
}
