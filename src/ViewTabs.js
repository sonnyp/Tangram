import { Tabs } from "./tabs.js";
import * as instances from "./instances.js";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";

import { instanceDialog } from "./instanceDialog.js";

export function ViewTabs({
  application,
  onReload,
  onStopLoading,
  onGoBack,
  onGoForward,
  onGoHome,
  state,
  onNewTab,
  builder,
  window,
  onNotification,
  deleteInstance,
}) {
  const tab_overview = builder.get_object("tab_overview");

  const button_back = builder.get_object("button_back");
  button_back.connect("clicked", onGoBack);

  const button_forward = builder.get_object("button_forward");
  button_forward.connect("clicked", onGoForward);

  const button_reload = builder.get_object("button_reload");
  const event_controller_click = new Gtk.GestureClick({ button: 0 });
  button_reload.add_controller(event_controller_click);
  event_controller_click.connect("pressed", () => {
    const event = event_controller_click.get_current_event();
    const button = event.get_button();
    if (button !== Gdk.BUTTON_PRIMARY) {
      event_controller_click.set_state(Gtk.EventSequenceState.DENIED);
      return;
    }

    const webview = state.get("webview");
    if (webview.is_loading) {
      onStopLoading();
    } else {
      const modifier_state = event.get_modifier_state();
      onReload(modifier_state & Gdk.ModifierType.CONTROL_MASK);
    }
  });

  function editTab(instance, change_view) {
    tabs.selectTab(instance, change_view);
    instanceDialog({
      window,
      instance,
      onDeleteInstance: deleteInstance,
    }).catch(logError);
  }

  const tabs = Tabs({
    state,
    application,
    builder,
    window,
    onNotification,
    deleteInstance,
    tab_overview,
  });

  const button_tab_settings = builder.get_object("button_tab_settings");
  button_tab_settings.connect("clicked", () => {
    const instance_id = state.get("webview")?.instance_id;
    if (!instance_id) return;
    const instance = instances.get(instance_id);
    if (!instance) return;
    editTab(instance);
  });

  const navigation_buttons = builder.get_object("navigation_buttons");
  const button_main_menu = builder.get_object("button_main_menu");

  let is_handheld_state = null;
  const header_bar_bottom = builder.get_object("header_bar_content_bottom");
  const header_bar_top = builder.get_object("header_bar_content_top");

  function setupHeaderbar() {
    const width = window.get_width() || window.default_width;
    const height = window.get_height() || window.default_height;
    const is_handheld =
      height > width && (window.maximized || window.fullscreened);

    if (is_handheld === is_handheld_state) return;
    is_handheld_state = is_handheld;

    for (const item of [
      navigation_buttons,
      button_main_menu,
      button_tab_settings,
    ]) {
      item.parent?.remove(item);
    }

    header_bar_bottom.visible = is_handheld;
    header_bar_top.visible = !is_handheld;

    const header_bar = is_handheld ? header_bar_bottom : header_bar_top;
    header_bar.pack_start(navigation_buttons);
    header_bar.pack_end(button_tab_settings);
    header_bar.pack_end(button_main_menu);
  }

  // Ugly but does the work until we get Libadwaita 1.4 and breakpoints
  window.connect("notify::default-width", setupHeaderbar);
  window.connect("notify::default-heigh", setupHeaderbar);
  window.connect("notify::maximized", () => {
    setTimeout(setupHeaderbar);
  });
  window.connect("notify::fullscreened", () => {
    setTimeout(setupHeaderbar);
  });
  window.connect("show", setupHeaderbar);

  const button_home = builder.get_object("button_home");
  button_home.connect("clicked", onGoHome);

  tab_overview.connect("create-tab", onNewTab);

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

  return { tabs };
}
