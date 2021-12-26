import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

const { Entry } = Gtk;

function normalizeURL(str) {
  if (!str) return null;

  if (!str.startsWith("http")) {
    str = "http://" + str;
  }

  const uri = GLib.Uri.parse(str, GLib.UriFlags.NONE);
  if (!uri) return null;

  if (!["http", "https"].includes(uri.get_scheme())) {
    return null;
  }

  return uri.to_string();
}

export default function AddressBar({ state }) {
  const URLBar = new Entry({
    hexpand: true,
    placeholder_text: "Enter address",
  });

  state.notify("view", (view) => {
    if (view === "new-tab") {
      URLBar.grab_focus_without_selecting();
    }
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
