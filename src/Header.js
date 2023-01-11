import WebKit2 from "gi://WebKit";

import { normalizeURL } from "./utils.js";

export default function Header({
  onReload,
  onStopLoading,
  onGoBack,
  onGoForward,
  onGoHome,
  onAddTab,
  onCancelNewTab,
  state,
  onPlaceholder,
  builder,
}) {
  const header_bar = builder.get_object("header_bar");
  const stack_start = builder.get_object("stack_start");
  const stack_center = builder.get_object("stack_center");
  const stack_end = builder.get_object("stack_end");

  const button_back = builder.get_object("button_back");
  button_back.connect("clicked", onGoBack);
  const button_forward = builder.get_object("button_forward");
  button_forward.connect("clicked", onGoForward);
  const button_reload = builder.get_object("button_reload");
  button_reload.connect("clicked", () => {
    const webview = state.get("webview");
    if (webview.is_loading) {
      onStopLoading();
    } else {
      onReload();
    }
  });
  const button_home = builder.get_object("button_home");
  button_home.connect("clicked", onGoHome);

  const button_cancel = builder.get_object("button_cancel");
  button_cancel.connect("clicked", onCancelNewTab);

  const entry_url = builder.get_object("entry_url");
  entry_url.connect("activate", () => {
    const url = normalizeURL(entry_url.text);
    if (!url) return;

    const webview = state.get("webview");
    if (!webview) return;

    webview.load_uri(url);
    webview.grab_focus();
  });

  const button_new_tab = builder.get_object("button_new_tab");
  button_new_tab.connect("clicked", onPlaceholder);

  const button_done = builder.get_object("button_done");
  button_done.connect("clicked", () => {
    onAddTab().catch(logError);
  });

  function updateButtons(webview) {
    button_back.sensitive = webview.can_go_back();
    button_forward.sensitive = webview.can_go_forward();
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
    if (!ok) {
      entry_url.primary_icon_name = "channel-insecure-symbolic";
      return;
    }

    if (errors !== 0) {
      entry_url.primary_icon_name = "channel-insecure-symbolic";
      return;
    }

    entry_url.primary_icon_name = null;
  }

  state.notify("view", (view) => {
    button_done.sensitive = false;

    const first_tab = state.get("instances").length === 0;

    button_cancel.visible = !first_tab;
    stack_start.visible = true;
    stack_center.visible = true;
    stack_end.visible = true;
    header_bar.get_style_context().remove_class("flat");

    if (view === "tabs") {
      stack_start.visible_child_name = "navigation";
      stack_center.visible_child_name = "title";
      stack_end.visible_child_name = "menu";
    } else if (view === "placeholder") {
      stack_start.visible_child_name = "cancel";
      stack_center.visible_child_name = "title";
      stack_end.visible_child_name = "empty";

      if (first_tab) {
        header_bar.get_style_context().add_class("flat");
        stack_start.visible = false;
        stack_center.visible = false;
        stack_end.visible = false;
      }
    } else if (view === "new-tab") {
      stack_start.visible_child_name = "cancel";
      stack_center.visible_child_name = "url";
      stack_end.visible_child_name = "new-tab";
      header_bar.get_style_context().remove_class("flat");
    }
  });

  let loadChangedHandlerId = null;
  let backForwardListChangedHandlerId = null;
  state.notify("webview", (webview, previous) => {
    if (previous) {
      if (loadChangedHandlerId) {
        previous.disconnect(loadChangedHandlerId);
        loadChangedHandlerId = null;
      }
      if (backForwardListChangedHandlerId) {
        previous
          .get_back_forward_list()
          .disconnect(backForwardListChangedHandlerId);
        backForwardListChangedHandlerId = null;
      }
    }

    if (!webview) {
      entry_url.primary_icon_name = null;
      entry_url.text = "";
      return;
    }

    updateButtons(webview);
    setAddress(webview);
    if (!webview.is_loading) {
      setSecurity(webview);
    }
    button_reload.icon_name = webview.is_loading
      ? "process-stop-symbolic"
      : "view-refresh-symbolic";

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.backforwardlist#signal-changed
    backForwardListChangedHandlerId = webview
      .get_back_forward_list()
      .connect("changed", () => {
        updateButtons(webview);
      });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.loadevent
    loadChangedHandlerId = webview.connect(
      "load-changed",
      (self, loadEvent) => {
        // updateButtons(webview);

        if (loadEvent === WebKit2.LoadEvent.COMMITTED) {
          button_reload.icon_name = "view-refresh-symbolic";
          button_done.sensitive = true;
        } else if (loadEvent !== WebKit2.LoadEvent.FINISHED) {
          button_done.sensitive = false;
        }

        if (loadEvent === WebKit2.LoadEvent.STARTED) {
          button_reload.icon_name = "process-stop-symbolic";
          setAddress(webview);
          entry_url.primary_icon_name = null;
        } else if (loadEvent === WebKit2.LoadEvent.REDIRECTED) {
          setAddress(webview);
        } else if (loadEvent === WebKit2.LoadEvent.COMMITTED) {
          setSecurity(webview);
        }
      },
    );
  });

  return { entry_url };
}
