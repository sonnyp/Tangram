(() => {
  "use strict";

  const { WindowTypeHint } = imports.gi.Gdk;
  const { once, Settings } = imports.util;
  const {
    // Box,
    Dialog,
    Align,
    Grid,
    Label,
    Entry,
    ResponseType,
    EntryIconPosition,
    // Orientation,
  } = imports.gi.Gtk;
  const { uuid_string_random } = imports.gi.GLib;

  this.promptServiceDialog = async function promptServiceDialog({
    window,
    service,
    id,
  }) {
    let settings;

    if (id) {
      // https://gjs-docs.gnome.org/gio20~2.0_api/gio.settings
      settings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });
    }
    const showName = settings ? settings.get_string("name") : service.name;
    const showURL = settings ? settings.get_string("url") : service.url;

    // FIXME Dialog.new_with_buttons
    // is undefined in gjs, open issue.
    // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
    // "Action Dialogs"
    // and
    // https://developer.gnome.org/hig/stable/visual-layout.html.en
    const dialog = new Dialog({
      title: `${settings ? "Edit" : "Add"} ${showName}`,
      modal: true,
      type_hint: WindowTypeHint.DIALOG,
      use_header_bar: true,
      transient_for: window,
      resizable: false,
    });

    dialog.add_button("Cancel", ResponseType.CANCEL);
    const primaryButton = dialog.add_button(
      id ? "Edit" : "Add",
      ResponseType.APPLY
    );
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
      text: showName,
    });
    grid.attach(nameEntry, 2, 1, 1, 1);

    const URLLabel = new Label({
      label: "URL",
      halign: Align.END,
    });
    grid.attach(URLLabel, 1, 2, 1, 1);

    const URLEntry = new Entry({
      text: showURL,
      hexpand: true,
    });
    grid.attach(URLEntry, 2, 2, 1, 1);

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

    const name = nameEntry.text;
    const url = URLEntry.text;

    if (!settings) {
      id = `${name}-${uuid_string_random().replace(/-/g, "")}`;
      settings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });
    }

    settings.set_string("name", name);
    settings.set_string("url", url);
    if (service) {
      settings.set_string("service", service.id);
    }
    // binding example
    // settings.bind("name", nameEntry, "text", SettingsBindFlags.DEFAULT);

    dialog.destroy();

    return {
      name,
      url,
      id,
      service_id: service ? service.id : "",
    };
  };
})();
