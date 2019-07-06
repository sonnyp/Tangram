(() => {
  "use strict";

  const { WindowTypeHint } = imports.gi.Gdk;
  // const { getEnum, connect } = imports.util;
  const { once } = imports.util;
  const {
    Box,
    Dialog,
    Align,
    Grid,
    Label,
    Entry,
    ResponseType,
    EntryIconPosition,
    Orientation,
  } = imports.gi.Gtk;

  this.promptServiceDialog = async function promptServiceDialog({
    window,
    service,
    db,
  }) {
    // FIXME Gtk.Dialog.new_with_buttons
    // is undefined in gjs, open issue.
    // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
    // "Action Dialogs"
    // and
    // https://developer.gnome.org/hig/stable/visual-layout.html.en
    const dialog = new Dialog({
      title: `Add ${service.name}`,
      modal: true,
      type_hint: WindowTypeHint.DIALOG,
      use_header_bar: true,
      transient_for: window,
      resizable: false,
    });

    dialog.add_button("Cancel", ResponseType.CANCEL);
    const addButton = dialog.add_button("Add", ResponseType.APPLY);
    addButton.get_style_context().add_class("suggested-action");
    addButton.grab_focus();

    const contentArea = dialog.get_content_area();
    contentArea.margin = 18;

    const grid = new Grid({
      column_spacing: 12,
      row_spacing: 6,
    });
    contentArea.add(grid);

    const nameLabel = new Label({
      label: "Name",
      halign: Align.END,
    });
    grid.attach(nameLabel, 1, 1, 1, 1);
    const nameEntry = new Entry({ text: service.name, hexpand: true });
    grid.attach(nameEntry, 2, 1, 1, 1);

    const URLLabel = new Label({
      label: "URL",
      halign: Align.END,
    });
    grid.attach(URLLabel, 1, 2, 1, 1);

    let getURL = () => {
      return service.url;
    };

    if (service.url === "___" || !service.url.includes("___")) {
      const URLEntry = new Entry({ text: service.url, hexpand: true });
      grid.attach(URLEntry, 2, 2, 1, 1);
    } else {
      const urlBox = new Box({
        orientation: Orientation.HORIZONTAL,
      });
      const [prefix, suffix] = service.url.split("___");
      const prefixLabel = new Label({ label: prefix });
      urlBox.add(prefixLabel);
      const interfixEntry = new Entry({ text: "", hexpand: true });
      urlBox.add(interfixEntry);
      const suffixLabel = new Label({ label: suffix });
      urlBox.add(suffixLabel);
      grid.attach(urlBox, 2, 2, 1, 1);
      getURL = () => {
        return service.url.replace("___", interfixEntry.text);
      };
    }

    nameEntry.set_icon_activatable(EntryIconPosition.SECONDARY, false);

    let isNameValid = true;
    nameEntry.connect("changed", () => {
      const { text } = nameEntry;
      isNameValid = text && !db.find(({ title }) => title === text);
      if (!isNameValid) {
        showNameError();
      } else {
        hideNameError();
      }
    });

    function showNameError() {
      nameEntry.set_icon_activatable(EntryIconPosition.SECONDARY, false);
      nameEntry.set_icon_from_icon_name(
        EntryIconPosition.SECONDARY,
        "face-sick-symbolic"
      );
      nameEntry.set_icon_tooltip_text(EntryIconPosition.SECONDARY, "foobar");
    }
    function hideNameError() {
      nameEntry.set_icon_from_icon_name(EntryIconPosition.SECONDARY, null);
      nameEntry.set_icon_tooltip_text(EntryIconPosition.SECONDARY, null);
    }

    dialog.show_all();

    const [response_id] = await once(dialog, "response");
    if (response_id === ResponseType.DELETE_EVENT) {
      return;
    }
    if (response_id !== ResponseType.APPLY) {
      dialog.destroy();
      return;
    }

    const name = nameEntry.text;
    if (!name || db.find(({ title }) => title === name)) {
      showNameError();
      return;
    }

    const url = getURL();

    dialog.destroy();

    return { name, url };
  };
})();
