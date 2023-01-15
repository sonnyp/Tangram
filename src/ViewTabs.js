export function ViewTabs({
  onReload,
  onStopLoading,
  onGoBack,
  onGoForward,
  onGoHome,
  state,
  onNewTab,
  builder,
  window,
}) {
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

  const leaflet = builder.get_object("leaflet");

  // Workaround for a libadwaita issue
  // https://matrix.to/#/!tTlHhqEAGkmuagmvAr:gnome.org/$nX8zpvV1V-WNY8klp8rQuE0lLXPMkcWceDVFS2ben0o
  leaflet.mode_transition_duration = 0;
  setTimeout(() => {
    leaflet.mode_transition_duration = 250; // default
  }, 500);

  const navigation_buttons = builder.get_object("navigation_buttons");
  const button_open_main_sidebar = builder.get_object(
    "button_open_main_sidebar",
  );
  button_open_main_sidebar.connect("clicked", () => {
    leaflet.visible_child_name = "sidebar";
  });

  let is_mobile;
  const header_bar_bottom = builder.get_object("header_bar_content_bottom");
  const header_bar_top = builder.get_object("header_bar_content_top");
  function setupHeaderbar() {
    is_mobile = leaflet.folded && window.maximized;

    navigation_buttons.parent?.remove(navigation_buttons);
    button_open_main_sidebar.parent?.remove(button_open_main_sidebar);

    header_bar_bottom.visible = is_mobile;
    header_bar_top.visible = !is_mobile;

    const header_bar = is_mobile ? header_bar_bottom : header_bar_top;
    header_bar.pack_start(navigation_buttons);
    header_bar.pack_end(button_open_main_sidebar);
  }
  leaflet.connect("notify::folded", setupHeaderbar);
  setupHeaderbar();

  const button_home = builder.get_object("button_home");
  button_home.connect("clicked", onGoHome);

  const button_new_tab = builder.get_object("button_new_tab");
  button_new_tab.connect("clicked", onNewTab);

  function updateButtons(webview) {
    button_back.sensitive = webview && webview.can_go_back();
    button_forward.sensitive = webview && webview.can_go_forward();
    button_reload.icon_name =
      webview && webview.is_loading
        ? "process-stop-symbolic"
        : "view-refresh-symbolic";
  }

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

    updateButtons(webview);

    if (!webview) return;

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.backforwardlist#signal-changed
    backForwardListChangedHandlerId = webview
      .get_back_forward_list()
      .connect("changed", () => {
        updateButtons(webview);
      });

    loadChangedHandlerId = webview.connect("load-changed", () => {
      updateButtons(webview);
    });
  });
}
