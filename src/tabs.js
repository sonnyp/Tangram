import Gio from "gi://Gio";
import Gdk from "gi://Gdk";

import { TabLabel, TabPage } from "./tab.js";

import * as instances from "./instances.js";

export function Tabs({
  state,
  builder,
  application,
  window,
  onNotification,
  editTab,
}) {
  // const leaflet = builder.get_object("leaflet");
  // const list_box = builder.get_object("list_box");
  const tab_view = builder.get_object("tab_view");

  // list_box.bind_model(tab_view.pages, (tab_page) => {
  //   const instance = instances.get(tab_page.child.instance_id);
  //   const list_box_row = TabLabel({
  //     instance,
  //     leaflet,
  //     editTab,
  //   });
  //   instance.list_box_row = list_box_row;
  //   return list_box_row;
  // });

  // list_box.connect("row-activated", (self, list_box_row) => {
  //   const instance = instances.get(list_box_row.instance_id);
  //   if (!instance) return;
  //   selectTab(instance);
  // });

  function onSelectedTab() {
    const tab_page = tab_view.selected_page;
    if (!tab_page) {
      state.set({ webview: null });
      return;
    }
    const instance = instances.get(tab_page.child.instance_id);
    if (!instance) {
      state.set({ webview: null });
      return;
    }
    state.set({ webview: instance.webview });
    // list_box.select_row(instance.list_box_row);
  }
  tab_view.connect("notify::selected-page", onSelectedTab);

  // Tabs should not be selected if folded
  // leaflet.connect("notify::folded", () => {
  //   if (leaflet.folded) {
  //     list_box.select_row(null);
  //   } else {
  //     onSelectedTab();
  //   }
  // });
  // leaflet.connect("notify::visible-child", () => {
  //   list_box.select_row(null);
  // });

  // tab_view.connect("page-reordered", (self, tab_page) => {
  //   const instance = instances.get(tab_page.child.instance_id);
  //   if (!instance) return;
  //   // Not nice but the row is deleted after page-reordered
  //   // Promise.resolve().then(() => {
  //   //   list_box.select_row(instance.list_box_row);
  //   // });
  // });

  function selectTab(instance, change_view = true) {
    tab_view.set_selected_page(tab_view.get_page(instance.webview));
    // if (change_view && leaflet.visible_child_name !== "content") {
    // leaflet.visible_child_name = "content";
    // }
  }

  return {
    addTab(instance) {
      const webview = TabPage({
        application,
        instance,
        window,
        onNotification,
      });
      webview.instance_id = instance.id;
      const tab_page = tab_view.append(webview);
      tab_page.set_live_thumbnail(true);
      instance.bind("name", tab_page, "title", Gio.SettingsBindFlags.GET);
    },
    removeTab(instance) {
      tab_view.close_page(tab_view.get_page(instance.webview));
    },
    selectTab,
  };
}
