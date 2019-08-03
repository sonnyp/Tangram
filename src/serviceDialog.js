(() => {
  "use strict";

  const { WindowTypeHint } = imports.gi.Gdk;
  const { once } = imports.util;
  const {
    Dialog,
    Align,
    Grid,
    Label,
    Entry,
    ResponseType,
    EntryIconPosition,
  } = imports.gi.Gtk;
  const { SettingsBindFlags } = imports.gi.Gio;

  const { iconChooser, saveIcon } = imports.icon;

  this.editInstanceDialog = function editInstanceDialog({ window, instance }) {
    return serviceDialog({ window, instance, action: "Edit" });
  };

  this.addInstanceDialog = function editInstanceDialog({ window, instance }) {
    return serviceDialog({ window, instance, action: "Add " });
  };

  async function serviceDialog({ window, instance, action }) {
    // TODO Dialog.new_with_buttons
    // is undefined in gjs, open issue.
    // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
    // "Action Dialogs"
    // and
    // https://developer.gnome.org/hig/stable/visual-layout.html.en
    const dialog = new Dialog({
      title: `${action} ${instance.name}`,
      modal: true,
      type_hint: WindowTypeHint.DIALOG,
      use_header_bar: true,
      transient_for: window,
      resizable: false,
    });

    dialog.add_button("Cancel", ResponseType.CANCEL);
    const primaryButton = dialog.add_button(action, ResponseType.APPLY);
    primaryButton.get_style_context().add_class("suggested-action");
    primaryButton.grab_focus();

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
    const nameEntry = new Entry({
      hexpand: true,
    });
    instance.bind("name", nameEntry, "text", SettingsBindFlags.DEFAULT);
    grid.attach(nameEntry, 2, 1, 1, 1);

    const URLLabel = new Label({
      label: "URL",
      halign: Align.END,
    });
    grid.attach(URLLabel, 1, 2, 1, 1);

    const URLEntry = new Entry({
      hexpand: true,
    });
    instance.bind("url", URLEntry, "text", SettingsBindFlags.DEFAULT);
    grid.attach(URLEntry, 2, 2, 1, 1);

    const iconLabel = new Label({
      label: "Icon",
      halign: Align.END,
    });
    grid.attach(iconLabel, 1, 3, 1, 1);
    const iconEntry = iconChooser({
      value: instance.icon === "default" ? null : instance.icon,
    });
    grid.attach(iconEntry, 2, 3, 1, 1);

    primaryButton.set_sensitive(!!URLEntry.text);
    URLEntry.set_icon_tooltip_text(
      EntryIconPosition.SECONDARY,
      "Cannot be empty"
    );
    URLEntry.set_icon_activatable(EntryIconPosition.SECONDARY, false);
    URLEntry.connect("changed", () => {
      const isValid = !!URLEntry.text;
      if (isValid) {
        URLEntry.set_icon_from_icon_name(EntryIconPosition.SECONDARY, null);
        primaryButton.set_sensitive(true);
        return;
      }

      primaryButton.set_sensitive(false);
      URLEntry.set_icon_from_icon_name(
        EntryIconPosition.SECONDARY,
        "face-sick-symbolic"
      );
    });

    dialog.show_all();

    const [response_id] = await once(dialog, "response");
    if (response_id === ResponseType.DELETE_EVENT) {
      return;
    }

    if (response_id !== ResponseType.APPLY) {
      dialog.destroy();
      return;
    }

    let icon = "default";
    if (iconEntry.get_filename()) {
      icon = saveIcon(iconEntry.get_filename(), instance.data_dir);
    }

    dialog.destroy();

    // eslint-disable-next-line require-atomic-updates
    instance.icon = icon;
  }
})();
