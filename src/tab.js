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
