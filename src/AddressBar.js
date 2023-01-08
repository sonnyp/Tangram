import Gtk from "gi://Gtk";

import { normalizeURL } from "./utils.js";

export default function AddressBar({ state }) {
  const URLBar = new Gtk.Entry({
    hexpand: true,
    placeholder_text: "Enter address",
    input_purpose: Gtk.InputPurpose.URL,
    activates_default: true,
  });

  URLBar.connect("activate", () => {
    const url = normalizeURL(URLBar.text);
    if (!url) return;

    const webview = state.get("webview");
    if (!webview) return;

    webview.load_uri(url);
    webview.grab_focus();
  });
  return URLBar;
}
