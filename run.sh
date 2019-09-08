#!/bin/sh

# data
glib-compile-resources --target=data/re.sonny.Tangram.data.gresource --sourcedir=data/ data/re.sonny.Tangram.data.gresource.xml

# settings
glib-compile-schemas --strict data/
# imports.package already do this when running from source
# export GSETTINGS_SCHEMA_DIR=./data

# desktop file (required for notifications)
cp data/re.sonny.Tangram.desktop.in re.sonny.Tangram.desktop
sed -i "/^Exec=/s/=.*/=${PWD//\//\\/}\/src\/re\.sonny\.Tangram/" re.sonny.Tangram.desktop
# disable DBusActivatable on dev because imports.package does not work without PWD
sed -i "/^DBusActivatable=/s/=.*/=false/" re.sonny.Tangram.desktop
mv re.sonny.Tangram.desktop ~/.local/share/applications

# dbus services
# cp data/re.sonny.Tangram.service.in re.sonny.Tangram.service
# sed -i "/^Exec=/s/=.*/=${PWD//\//\\/}\/src\/re\.sonny\.Tangram --gapplication-service/" re.sonny.Tangram.service
# mv re.sonny.Tangram.service ~/.local/share/dbus-1/services/

# icons
mkdir -p ~/.local/share/icons/hicolor/scalable/apps/
cp -rp data/icons/hicolor/scalable/apps/re.sonny.Tangram.svg ~/.local/share/icons/hicolor/scalable/apps/re.sonny.Tangram.svg
mkdir -p ~/.local/share/icons/hicolor/symbolic/apps/
cp -rp data/icons/hicolor/symbolic/apps/re.sonny.Tangram-symbolic.svg ~/.local/share/icons/hicolor/symbolic/apps/re.sonny.Tangram-symbolic.svg

# $PWD/src/re.sonny.Tangram "$@"
gtk-launch re.sonny.Tangram
