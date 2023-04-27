import WebKit2 from "gi://WebKit";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import { gettext as _ } from "gettext";

import { normalizeURL } from "./utils.js";
import { create as createInstance } from "./instances.js";
import { buildWebView } from "./WebView.js";
import { MODES } from "./constants.js";

export function ViewNew({
  onAddTab,
  onCancelNewTab,
  state,
  builder,
  application,
  onNotification,
  window,
}) {
  const stack_new = builder.get_object("stack_new");
  let webview = null;
  let loadChangedHandlerId = null;
  let isLoadingHandlerId = null;

  const button_go = builder.get_object("button_go");
  const entry_go = builder.get_object("entry_go");
  button_go.connect("clicked", () => {
    entry_go.emit("activate");
  });

  entry_go.connect("activate", () => {
    const url = normalizeURL(entry_go.text);
    if (!url) return;

    // const previous = stack_tabs.get_child_by_name("new-tab");
    // console.log({ previous });
    // if (previous) stack_tabs.remove(previous);

    entry_url.visible = true;
    button_done.visible = true;

    const id = GLib.uuid_string_random().replace(/-/g, "");
    const instance = createInstance({
      id,
      name: "",
    });
    webview = buildWebView({
      application,
      onNotification,
      window,
      instance,
    });
    onWebview(webview);
    webview.mode = MODES.TEMPORARY;

    stack_new.add_named(webview, "new-tab");
    stack_new.visible_child = webview;

    webview.load_uri(url);
    webview.grab_focus();
  });
  entry_go.bind_property_full(
    "text",
    button_go,
    "sensitive",
    GObject.BindingFlags.DEFAULT,
    (binding, value) => [true, !!value],
    null,
  );

  const button_cancel = builder.get_object("button_cancel");
  button_cancel.connect("clicked", onCancelNewTab);

  const entry_url = builder.get_object("entry_url");
  entry_url.connect("activate", () => {
    const url = normalizeURL(entry_url.text);
    if (!url) return;
    if (!webview) return;

    webview.load_uri(url);
    webview.grab_focus();
  });
  function focusAddressBar() {
    entry_url.grab_focus();
  }

  const button_done = builder.get_object("button_done");
  button_done.connect("clicked", () => {
    offWebview(webview);
    onAddTab().catch(logError);
  });

  function updateButtons(webview) {
    button_done.sensitive = !webview.is_loading;
  }

  function setAddress(webview) {
    const url = webview.get_uri();
    entry_url.text = url ? WebKit2.uri_for_display(url) : "";
  }

  function setSecurity(webview) {
    if (!entry_url.text) {
      entry_url.primary_icon_name = null;
      return;
    }

    const [ok, , errors] = webview.get_tls_info();
    if (!ok || errors !== 0) {
      entry_url.primary_icon_name = "channel-insecure-symbolic";
      return;
    }

    entry_url.primary_icon_name = "channel-secure-symbolic";
  }

  const header_bar = builder.get_object("header_bar");

  state.notify("view", () => {
    button_done.sensitive = false;
    entry_url.visible = false;
    button_done.visible = false;

    const first_tab = state.get("instances").length === 0;

    button_cancel.visible = !first_tab;
    if (first_tab) {
      header_bar.get_style_context().add_class("flat");
    } else {
      header_bar.get_style_context().remove_class("flat");
    }
  });

  function onWebview(webview) {
    updateButtons(webview);
    isLoadingHandlerId = webview.connect("notify::is-loading", updateButtons);
    setAddress(webview);
    if (!webview.is_loading) {
      setSecurity(webview);
    }

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.loadevent
    loadChangedHandlerId = webview.connect(
      "load-changed",
      (self, loadEvent) => {
        if (loadEvent === WebKit2.LoadEvent.COMMITTED) {
          setSecurity(webview);
        }
      },
    );

    webview.connect("notify::uri", () => {
      setAddress(webview);
    });
  }

  function offWebview(webview) {
    if (loadChangedHandlerId) {
      webview?.disconnect(loadChangedHandlerId);
      loadChangedHandlerId = null;
    }
    if (isLoadingHandlerId) {
      webview?.disconnect(isLoadingHandlerId);
      isLoadingHandlerId = null;
    }
  }

  function onNewTab() {
    state.set({ view: "new" });

    stack_new.visible_child_name = "statuspage";

    entry_go.text = "";
    entry_go.grab_focus();

    const status_page = builder.get_object("status_page");
    const first_tab = state.get("instances").length === 0;

    if (first_tab) {
      status_page.icon_name = "re.sonny.Tangram";
      status_page.title = _("Welcome to Tangram");
      status_page.description = _("Let's add your first web application.");
    } else {
      status_page.icon_name = "";
      status_page.title = "";
      status_page.description = "";
    }
  }

  return { focusAddressBar, onNewTab };
}
