const { VariantType } = imports.gi.GLib;
const { AccelGroup, AccelFlags, accelerator_parse } = imports.gi.Gtk;
const { SimpleAction } = imports.gi.Gio;
const { ModifierType, keyval_name } = imports.gi.Gdk;

function nextPage(notebook) {
  if (notebook.page === notebook.get_n_pages() - 1) {
    notebook.page = 0;
  } else {
    notebook.next_page();
  }
}
function prevPage(notebook) {
  if (notebook.page === 0) {
    notebook.page = notebook.get_n_pages() - 1;
  } else {
    notebook.prev_page();
  }
}

this.Shortcuts = function Shortcuts({
  window,
  application,
  notebook,
  addressBar,
  onStopLoading,
  onReload,
  onGoBack,
  onGoForward,
  onShowInspector,
  onGoHome,
}) {
  const nthTab = new SimpleAction({
    name: "nth-tab",
    parameter_type: VariantType.new("i"),
  });
  for (let i = 1; i < 10; i++) {
    application.set_accels_for_action(`app.nth-tab(${i})`, [`<Alt>${i}`]);
  }
  nthTab.connect("activate", (self, parameters) => {
    const idx = parameters.deep_unpack();
    notebook.page = idx - 1;
  });
  application.add_action(nthTab);

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.accelgroup
  const accelGroup = new AccelGroup();
  window.add_accel_group(accelGroup);
  const shortcuts = [
    [["Escape"], onStopLoading],
    [["<Primary>R", "F5"], onReload],
    [["<Alt>Home"], onGoHome],
    [["<Primary><Shift>R", "<Shift>F5"], () => onReload(true)],
    [
      ["<Alt>Left"],
      () => {
        onGoBack();
        // prevents default notebook behavior
        return true;
      },
    ],
    [
      ["<Alt>Right"],
      () => {
        onGoForward();
        // prevents default notebook behavior
        return true;
      },
    ],
    [["<Primary><Shift>I"], onShowInspector],
    [
      ["<Primary>L"],
      () => {
        addressBar.grab_focus();
      },
    ],
  ];
  shortcuts.forEach(([accels, fn]) => {
    accels.forEach(accel => {
      const [accelerator_key, accelerator_mods] = accelerator_parse(accel);
      accelGroup.connect(
        accelerator_key,
        accelerator_mods,
        AccelFlags.VISIBLE,
        fn
      );
    });
  });

  window.connect("key-press-event", (self, event) => {
    const [, modifier] = event.get_state();
    const [, keyval] = event.get_keyval();
    const name = keyval_name(keyval);

    // CTRL + Page_Down
    if (name === "Page_Down" && modifier === ModifierType.CONTROL_MASK) {
      nextPage(notebook);
      return true;
    }
    // CTRL + Tab
    if (
      ["Tab", "ISO_Left_Tab", "KP_Tab"].includes(name) &&
      modifier === ModifierType.CONTROL_MASK
    ) {
      nextPage(notebook);
      return true;
    }

    // CTRL + Page_Up
    if (name === "Page_Up" && modifier === ModifierType.CONTROL_MASK) {
      prevPage(notebook);
      return true;
    }
    // CTRL+SHIFT + Tab
    if (
      ["Tab", "ISO_Left_Tab", "KP_Tab"].includes(name) &&
      modifier === ModifierType.CONTROL_MASK + 1
    ) {
      prevPage(notebook);
      return true;
    }

    // CTRL+SHIFT + PageUp
    if (name === "Page_Up" && modifier === ModifierType.CONTROL_MASK + 1) {
      const { page } = notebook;
      if (page === 0) return true;
      notebook.reorder_child(notebook.get_nth_page(page), page - 1);
      return true;
    }

    // CTRL+SHIFT + PageDown
    if (name === "Page_Down" && modifier === ModifierType.CONTROL_MASK + 1) {
      const { page } = notebook;
      if (page === notebook.get_n_pages() - 1) return true;
      notebook.reorder_child(notebook.get_nth_page(page), page + 1);
      return true;
    }

    return false;
  });
};
