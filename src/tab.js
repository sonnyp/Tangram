const { Label, Image, Box, EventBox, Popover } = imports.gi.Gtk;
const { EventMask } = imports.gi.Gdk;
const { Menu, SettingsBindFlags } = imports.gi.Gio;
const { Pixbuf, InterpType } = imports.gi.GdkPixbuf;

const flags = imports.flags;
const { getFaviconAsPixbuf } = imports.webapp.webapp;
const { buildWebView } = imports.WebView;

const ICON_SIZE = 16;

function getFaviconScaled(webview) {
  const pixbuf = getFaviconAsPixbuf(webview);
  if (!pixbuf) return null;
  return pixbuf.scale_simple(ICON_SIZE, ICON_SIZE, InterpType.BILINEAR);
}

this.TabLabel = TabLabel;
function TabLabel({ instance, settings, page }) {
  const { id } = instance;

  const box = new Box({});
  const image = new Image({ margin_end: 6 });

  let connectFaviconId;
  function connectFavicon() {
    connectFaviconId = page.connect("notify::favicon", () => {
      const new_favicon = getFaviconScaled(page);
      if (!new_favicon) {
        return;
      }
      image.set_from_pixbuf(new_favicon);
    });
  }

  if (flags.custom_icons) {
    if (instance.icon) {
      image.set_from_pixbuf(
        Pixbuf.new_from_file_at_scale(instance.icon, ICON_SIZE, ICON_SIZE, true)
      );
    } else {
      const favicon = getFaviconScaled(page);
      if (favicon) {
        image.set_from_pixbuf(favicon);
      }
      connectFavicon();
    }
    instance.observe("icon", () => {
      const icon = instance.icon;
      if (!icon) {
        connectFavicon();
        return;
      }
      page.disconnect(connectFaviconId);
      image.set_from_pixbuf(
        Pixbuf.new_from_file_at_scale(instance.icon, ICON_SIZE, ICON_SIZE, true)
      );
    });
  } else {
    const favicon = getFaviconScaled(page);
    if (favicon) {
      image.set_from_pixbuf(favicon);
    }
    connectFavicon();
  }

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
  if (flags.custom_applications) {
    menu.append("New application", `app.detachTab("${id}")`);
  }

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

this.TabPage = TabPage;
function TabPage({ instance, window, onNotification }) {
  const webView = buildWebView({ instance, window, onNotification });
  instance.page = webView;
  return webView;
}
