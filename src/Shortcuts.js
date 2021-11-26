import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";

// FIXME: some of these don't work when the webview has focus
export default function Shortcuts({
  application,
  window,
  notebook,
  onReload,
  onStopLoading,
  onGoBack,
  onGoForward,
  onGoHome,
  onToggleWebInspector,
  addressBar,
}) {
  function getTabIndexForKeyval(keyval) {
    const keyname = Gdk.keyval_name(keyval);
    // Is not 0...9
    if (!/^\d$/.test(keyname)) return -1;
    return +keyname - 1;
  }
  const eventController = new Gtk.EventControllerKey();
  eventController.connect("key-released", (self, keyval) => {
    const idx = getTabIndexForKeyval(keyval);
    if (idx < 0) return false;
    notebook.page = idx;
    return true;
  });
  window.add_controller(eventController);

  function nextPage() {
    if (notebook.page === notebook.get_n_pages() - 1) {
      notebook.page = 0;
    } else {
      notebook.next_page();
    }
  }
  function prevPage() {
    if (notebook.page === 0) {
      notebook.page = notebook.get_n_pages() - 1;
    } else {
      notebook.prev_page();
    }
  }

  function movePrevious() {
    const { page } = notebook;
    if (page === 0) return true;
    notebook.reorder_child(notebook.get_nth_page(page), page - 1);
    return true;
  }

  function moveNext() {
    const { page } = notebook;
    if (page === notebook.get_n_pages() - 1) return true;
    notebook.reorder_child(notebook.get_nth_page(page), page + 1);
    return true;
  }

  const shortcuts = [
    [["<Alt>Home"], onGoHome],
    [["Escape"], onStopLoading],
    [["<Primary>R", "F5"], () => onReload(false)],
    [["<Primary><Shift>R", "<Shift>F5"], () => onReload(true)],
    [["<Alt>Left"], onGoBack],
    [["<Alt>Right"], onGoForward],
    [["<Primary><Shift>I"], onToggleWebInspector],
    [["<Primary>L"], () => addressBar.grab_focus()],
    [
      [
        "<Primary>Page_Up",
        "<Primary><Shift>Tab",
        "<Primary><Shift>ISO_Left_Tab",
        "<Primary><Shift>KP_Tab",
      ],
      prevPage,
    ],
    [
      [
        "<Primary>Page_Down",
        "<Primary>Tab",
        "<Primary>ISO_Left_Tab",
        "<Primary>KP_Tab",
      ],
      nextPage,
    ],
    [["<Primary><Shift>Page_Up"], movePrevious],
    [["<Primary><Shift>Page_Down"], moveNext],
  ];

  const shortcutController = new Gtk.ShortcutController();
  shortcuts.forEach(([accels, fn]) => {
    const shortcut = new Gtk.Shortcut({
      trigger: Gtk.ShortcutTrigger.parse_string(accels.join("|")),
      action: Gtk.CallbackAction.new(() => {
        fn();
        return true;
      }),
    });
    shortcutController.add_shortcut(shortcut);
  });

  application.set_accels_for_action("app.quit", ["<Primary>Q"]);
  application.set_accels_for_action("app.inspector", ["<Primary><Shift>D"]);
  application.set_accels_for_action("app.shortcuts", [
    "<Primary>F1",
    "<Primary>question",
  ]);

  window.add_controller(shortcutController);
}
