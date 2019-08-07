const {
  Entry,
  //  CssProvider
} = imports.gi.Gtk;
const { URI } = imports.gi.Soup;

function normalizeURL(str) {
  if (!str) return null;

  if (!str.startsWith("http")) {
    str = "http://" + str;
  }

  const uri = new URI(str);
  if (!uri) return null;

  // FIXME
  // no is_valid or valid_for_http in soup gjs?
  if (!["http", "https"].includes(uri.scheme)) {
    return null;
  }

  return uri.to_string(false);
}

this.AddressBar = function AddressBar({
  state,
  // onNavigate,
  onAddService,
}) {
  const URLBar = new Entry({
    hexpand: true,
  });

  state.bind("view", URLBar, "placeholder_text", view => {
    switch (view) {
      case "services":
        return "Select a service or enter address";
      case "add-tab":
        return "Enter address";
      default:
        return "";
    }
  });

  // This is a workaround https://gitlab.gnome.org/GNOME/gtk/issues/378
  // described in https://gitlab.gnome.org/GNOME/gtk/commit/7aad0896a73e6957c8d5ef65d59b2d0891df1b9c
  // but that commit did not made it to stable yet so it's not working
  // there is unfortunally no workaround until then so we don't grab focus
  /*
  const css = new CssProvider();
  css.load_from_data(`
    entry:focus > placeholder {
      opacity: 1;
    }
  `);
  URLBar.get_style_context().add_provider(css, 0);
  state.notify("view", view => {
    if (view === "services") {
      URLBar.grab_focus_without_selecting();
    }
  });
  */

  URLBar.connect("activate", () => {
    const url = normalizeURL(URLBar.text);
    if (!url) return;

    if (state.get("view") === "services") {
      onAddService({
        name: "",
        id: "custom",
        url,
      });
      const webview = state.get("webview");
      if (webview) webview.grab_focus();
    } else {
      const webview = state.get("webview");
      if (!webview) return;
      webview.load_uri(url);
      webview.grab_focus();
    }
  });
  return URLBar;
};
