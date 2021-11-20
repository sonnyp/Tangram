import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import GdkPixbuf from "gi://GdkPixbuf";

const { Label, Image, Box, EventBox, Popover } = Gtk;
const { EventMask } = Gdk;
const { Menu, SettingsBindFlags } = Gio;
const { InterpType } = GdkPixbuf;

import { MODES } from "./constants.js";
import { getFaviconAsPixbuf } from "./webapp/webapp.js";
import { buildWebView } from "./WebView.js";

const ICON_SIZE = 16;

function getFaviconScaled(webview) {
  const pixbuf = getFaviconAsPixbuf(webview);
  if (!pixbuf) return null;
  return pixbuf.scale_simple(ICON_SIZE, ICON_SIZE, InterpType.BILINEAR);
}

export function TabLabel({ instance, settings, page, hasNotification }) {
  const { id } = instance;

  const box = new Box({});
  const image = new Image({ margin_end: 6 });

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

  const notificationsLabel = new Label();
  notificationsLabel.set_label(hasNotification ? "Notification!" : "");
  box.add(notificationsLabel);

  box.add(image);

  const label = new Label();
  instance.bind("name", label, "label", SettingsBindFlags.GET);
  box.add(label);

  box.add_events(EventMask.BUTTON_PRESS_MASK);

  const eventBox = new EventBox({
    // margin_top: 6,
    // margin_bottom: 6,
  });
  eventBox.add(box);

  const menu = new Menu();
  menu.append("Edit", `app.editInstance("${id}")`);
  menu.append("Remove", `app.removeInstance("${id}")`);

  const popover = new Popover();
  popover.bind_model(menu, null);
  popover.set_relative_to(box);
  settings.bind("tabs-position", popover, "position", SettingsBindFlags.GET);

  eventBox.connect("button-press-event", (self, eventButton) => {
    const [, button] = eventButton.get_button();
    if (button !== 3) return;

    popover.popup();
  });

  eventBox.show_all();
  return eventBox;
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
