<img style="vertical-align: middle;" src="data/icons/hicolor/scalable/apps/re.sonny.Tangram.svg" width="120" height="120">

# Tangram

Run web apps on your desktop

<a href='https://flathub.org/apps/details/re.sonny.Tangram'><img width='200' alt='Download on Flathub' src='https://flathub.org/assets/badges/flathub-badge-en.svg'/></a>

![screenshot](data/appdata/screenshot.png)

## Goal

The goal of the project is to improve integration of web applications into the desktop, specifically [GNOME](https://www.gnome.org/).

## About

Each tab is a container so you can setup web apps with different accounts/settings.

Tangram is powered by [WebKitGTK](https://webkitgtk.org/).

## Reporting an issue

Before submitting an issue with a Website, please try to reproduce it with [GNOME Web](https://wiki.gnome.org/Apps/Web/). If you can, [report the issue to WebKitGTK](https://bugs.webkit.org/enter_bug.cgi?assigned_to=webkit-unassigned%40lists.webkit.org&attachurl=&blocked=&bug_file_loc=http://&bug_severity=Normal&bug_status=NEW&comment=&component=WebKit%20Gtk&contenttypeentry=&contenttypemethod=autodetect&contenttypeselection=text/plain&data=&dependson=&description=&flag_type-1=X&flag_type-3=X&flag_type-4=X&form_name=enter_bug&keywords=GTK&maketemplate=Remember%20values%20as%20bookmarkable%20template&op_sys=Linux&priority=P3&product=WebKit&rep_platform=PC&short_desc=%5BGTK%5D%20) which is the Web engine powering Tangran and GNOME Web.

## Features

- Setup and manage web applications
  <!-- - Custom icon -->
- Persistent and independant tabs
- Custom title
- Re-order tabs
- Change tabs position
- Navigation
- Shortcuts
- Smart notifications
- Downloads
- [Touchpad/touchscreen gestures](https://blogs.gnome.org/alexm/2019/09/13/gnome-and-gestures-part-1-webkitgtk/)

## Security

Both Flatpak and non-Flatpak versions of Tangram provide strong sandboxing for Web applications.

- Flatpak via [our restricted permissions](https://github.com/sonnyp/Tangram/blob/master/re.sonny.Tangram.json)
- Non-Flatpak through [WebkitGTK Sandboxing](https://www.youtube.com/watch?v=5TDg83LHZ6o) (requires WebkitGTK >= 2.26)

## Roadmap

- Custom icon (almost done)
- Custom applications (almost done)
- Expose WebKitGTK settings (todo)
- SearchProvider (todo)
- Custom CSS/JS for better integration (todo)

<!-- Disabled for now, enable with TANGRAM_ENABLE_CUSTOM_APPLICATIONS=true -->
<!-- use at your own risk -->
<!--
### Custom applications

You can create custom applications with one or multiple tabs. They work the same as the main instance.

See demo: https://www.youtube.com/watch?v=y9MIXn4Iw70

You can create a custom application by

- dragging the tab out (see demo)
- right click on the tab
- via the application menu -->

## Development

```sh
git clone --recursive git://github.com/sonnyp/Tangram.git
```

### Install dependencies

<details>
 <summary>Ubuntu</summary>
 <code>
 sudo apt install npm libglib2.0-dev-bin flatpak-builder
 </code>
</details>

<details>
 <summary>Arch Linux</summary>
 <code>
 sudo pacman -S npm glib2 flatpak-builder
 </code>
</details>

<details>
  <summary>Fedora</summary>
  <code>
  sudo dnf install npm glib2-devel flatpak-builder
  </code>
</details>

```sh
# Development dependencies
npm install
```

### Run

```sh
./node_modules/.bin/webpack --watch
./run.sh
```

Hit `<Ctrl><Shift>Q` to restart the application.

- data files are stored in `./var/data/` instead of `$XDG_DATA_HOME/Tangram/`
- cache files are stored in `./var/cache/` instead of `XDG_CACHE_HOME/Tangram/`
  <!-- TODO application -->
  <!-- - desktop files are stored in `./var/applications/` instead of `$XDG_DATA_HOME/applications/` -->
  <!-- "--filesystem=xdg-data/applications:create" -->

To test desktop notifications you can add `https://jhmux.codesandbox.io/`.

### Test

```sh
make test
```

### Meson

```sh
meson --reconfigure --prefix $PWD/install build
ninja -C build install
GSETTINGS_SCHEMA_DIR=./install/share/glib-2.0/schemas/ ./install/bin/re.sonny.Tangram
```

### Flatpak

```sh
flatpak-builder --user --force-clean --install-deps-from=flathub flatpak re.sonny.Tangram.json
flatpak-builder --run flatpak re.sonny.Tangram.json re.sonny.Tangram
```

### Flatpak sandboxed

```sh
flatpak-builder --repo=repo --force-clean flatpak re.sonny.Tangram.json
flatpak --user remote-add --no-gpg-verify Tangram repo
flatpak --user install Tangram re.sonny.Tangram
flatpak run re.sonny.Tangram
```

### Inspect

```sh
gsettings set org.gtk.Settings.Debug enable-inspector-keybinding true
GTK_DEBUG=interactive ./run.sh
```

## Credits

Inspired by [GNOME Web](https://wiki.gnome.org/Apps/Web), [Rambox](https://rambox.pro/#home), [Station](https://getstation.com/) and [Franz](https://meetfranz.com/).
