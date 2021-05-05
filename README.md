<img style="vertical-align: middle;" src="data/icons/hicolor/scalable/apps/re.sonny.Tangram.svg" align="left" width="120" height="120">

# Tangram

Run web apps on your desktop

![screenshot](data/appdata/screenshot.png)

<a href='https://flathub.org/apps/details/re.sonny.Tangram'><img width='200' alt='Download on Flathub' width='180' height='60' src='https://flathub.org/assets/badges/flathub-badge-en.svg'/></a>

## About

Tangram is a new kind of browser. It is designed to organize and run your Web applications.
Each tab is persistent and independent. You can set multiple tabs with different accounts for the same application.

Common use cases:

- Stay up to date with your favorite communities; Mastodon, Twitter, ...
- Merge all these chat applications into one; WhatsApp, Messenger, Telegram, ...
- Group your organization tools under one application; EMail, Calendar, ...
- One-stop for multiple sources of documentation or information

## Installation

|      Distro      |                        Package Name/Link                         |                   Maintainer                    |
| :--------------: | :--------------------------------------------------------------: | :---------------------------------------------: |
| Arch Linux (aur) | [`tangram-web`](https://aur.archlinux.org/packages/tangram-web/) | [Mark Wagie](https://github.com/yochananmarqos) |

## Reporting an issue

Before submitting a compatibility issue with a Website, please try to reproduce it with [GNOME Web](https://wiki.gnome.org/Apps/Web/). If you can, [report the issue to WebKitGTK](https://bugs.webkit.org/enter_bug.cgi?assigned_to=webkit-unassigned%40lists.webkit.org&attachurl=&blocked=&bug_file_loc=http://&bug_severity=Normal&bug_status=NEW&comment=&component=WebKit%20Gtk&contenttypeentry=&contenttypemethod=autodetect&contenttypeselection=text/plain&data=&dependson=&description=&flag_type-1=X&flag_type-3=X&flag_type-4=X&form_name=enter_bug&keywords=GTK&maketemplate=Remember%20values%20as%20bookmarkable%20template&op_sys=Linux&priority=P3&product=WebKit&rep_platform=PC&short_desc=%5BGTK%5D%20), the Web engine behind Tangram and GNOME Web.

## Features

- Setup and manage web applications
  <!-- - Custom icon -->
- Persistent and independent tabs
- Custom title
- Re-order tabs
- Change tabs position
- Navigation
- Shortcuts
- Smart notifications
- Downloads
- [Touchpad/touchscreen gestures](https://blogs.gnome.org/alexm/2019/09/13/gnome-and-gestures-part-1-webkitgtk/)

## Security

Both Flatpak and non-Flatpak versions of Tangram provide sandboxing for Web applications.

- Flatpak via [our restricted permissions](https://github.com/sonnyp/Tangram/blob/master/re.sonny.Tangram.json)
- Non-Flatpak through [WebkitGTK Sandboxing](https://www.youtube.com/watch?v=5TDg83LHZ6o) (requires WebkitGTK >= 2.26)

<!-- ## Roadmap

- Custom icon (WIP)
- Custom applications (WIP)
- Expose WebKitGTK settings (todo)
- SearchProvider (todo)
- Custom CSS/JS for better integration (todo)
- WebExtensions (todo) -->

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

## In the media

[GNU/Linux.ch – Tangram - eine neue Art des Webbrowsers (Review)](https://gnulinux.ch/tangram-eine-neue-art-des-webbrowsers) - 04/2021

Chris Were Digital - Tangram a browser just for web apps [share.tube](https://share.tube/videos/watch/684332bf-cf6a-415d-970b-fb6ca996996b) / [youtube.com](https://www.youtube.com/watch?v=M1NEZ6fVBQQ) - 02/2021

[addictivetips.com - How to run web apps with ease on Linux](https://www.addictivetips.com/ubuntu-linux-tips/run-web-apps-linux/) - 09/2020

[ubunlog.com - Tangram, nueva opción basada en GNOME para agrupar nuestras web-apps](https://ubunlog.com/tangram-nueva-opcion-basada-en-gnome-para-agrupar-nuestras-web-apps/) - 09/2020

[edivaldobrito.com.br - Como instalar o navegador Tangram no Linux via Flatpak](https://www.edivaldobrito.com.br/como-instalar-o-navegador-tangram-no-linux-via-flatpak/) - 08/2020

[linux-magazine.com - Tangram integrates social media services in a single app](https://www.linux-magazine.com/Issues/2020/235/Tangram) - 06/2020

[linux-community.de - Tangram integriert Social-Media-Dienste und Messenger in eine App](https://www.linux-community.de/ausgaben/linuxuser/2020/02/zusammengepuzzelt/) - 02/2020

[diolinux.com.br - Tangram, um app para gerenciar Webapps](https://diolinux.com.br/aplicativos/tangram-um-app-para-gerenciar-webapps.html) - 09/2019

## Development

### Install packages

<details>
 <summary>Ubuntu</summary>
 <code>
 sudo apt install npm libglib2.0-dev-bin flatpak-builder git
 </code>
</details>

<details>
 <summary>Arch Linux</summary>
 <code>
 sudo pacman -S npm glib2 flatpak-builder git
 </code>
</details>

<details>
  <summary>Fedora</summary>
  <code>
  sudo dnf install npm glib2-devel flatpak-builder git
  </code>
</details>

### Install dependencies

```sh
cd Tangram
git submodule init
git submodule update
npm install
```

### Run

```sh
cd Tangram
make dev # in one terminal
./run.sh # in an other
```

`make dev` constantly watch for file changes and will rebuild automatically. `./run.sh` runs the application in `development` mode. Hit `<Ctrl><Shift>Q` to restart the application.

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
flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.Tangram.json
flatpak --user remote-add --no-gpg-verify --if-not-exists Tangram repo
flatpak --user install --reinstall --assumeyes Tangram re.sonny.Tangram
```

### Inspect

```sh
gsettings set org.gtk.Settings.Debug enable-inspector-keybinding true
GTK_DEBUG=interactive ./run.sh
```

### Release

```sh
git add -f src/main.js
git tag $VERSION
git push origin $VERSION
# send PR to https://github.com/flathub/re.sonny.Tangram/blob/master/re.sonny.Tangram.json
```

## Credits

Icon by [Tobias Bernard](https://tobiasbernard.com/)

[Igalia](https://www.igalia.com/) and contributors for the amazing work on [WebKitGTK](https://webkitgtk.org/)

Inspired by [GNOME Web](https://wiki.gnome.org/Apps/Web), [Rambox](https://rambox.pro/#home) and [Franz](https://meetfranz.com/).

See also [Wavebox](https://wavebox.io/) and [Station](https://getstation.com/).
