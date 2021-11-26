import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import GdkPixbuf from "gi://GdkPixbuf";

import { MODES } from "./constants.js";
import { getFaviconAsPixbuf } from "./webapp/webapp.js";
import { buildWebView } from "./WebView.js";

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
  const box = new Gtk.Box({
    margin_top: 6,
    margin_bottom: 6,
  });
  const image = new Gtk.Image({ margin_end: 6 });

  function connectFavicon() {
    page.connect("notify::favicon", () => {
      const new_favicon = getFaviconScaled(page);
      if (!new_favicon) {
        return;
      }
      image.set_from_pixbuf(new_favicon);
    });
  }

  const favicon = getFaviconScaled(page);
  if (favicon) {
    image.set_from_pixbuf(favicon);
  }
  connectFavicon();

  box.append(image);

  const label = new Gtk.Label();
  instance.bind("name", label, "label", Gio.SettingsBindFlags.GET);
  box.append(label);

  const menu = new Gio.Menu();
  menu.append("Edit", `win.editInstance("${id}")`);
  menu.append("Remove", `win.removeInstance("${id}")`);

  const popoverMenu = new Gtk.PopoverMenu({ menu_model: menu });
  box.append(popoverMenu);
  settings.bind(
    "tabs-position",
    popoverMenu,
    "position",
    Gio.SettingsBindFlags.GET,
  );

  const eventController = new Gtk.GestureSingle({
    button: Gdk.BUTTON_SECONDARY,
  });
  box.add_controller(eventController);
  eventController.connect("end", () => {
    popoverMenu.popup();
  });

  return box;
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
