#!/bin/sh

# data
glib-compile-resources --target=data/re.sonny.Tangram.data.gresource --sourcedir=data/ data/re.sonny.Tangram.data.gresource.xml

# services
glib-compile-resources --target=data/re.sonny.Tangram.services.gresource --sourcedir=src/ src/re.sonny.Tangram.services.gresource.xml

# settings
glib-compile-schemas --strict data/
export GSETTINGS_SCHEMA_DIR=./data

# desktop file (required for notifications)
cp data/re.sonny.Tangram.desktop.in re.sonny.Tangram.desktop
sed -i "/^Exec=/s/=.*/=${PWD//\//\\/}\/src\/re\.sonny\.Tangram/" re.sonny.Tangram.desktop
mv re.sonny.Tangram.desktop ~/.local/share/applications

# icons
mkdir -p ~/.local/share/icons/hicolor/scalable/apps/
cp -rp data/icons/hicolor/scalable/apps/re.sonny.Tangram.svg ~/.local/share/icons/hicolor/scalable/apps/re.sonny.Tangram.svg
mkdir -p ~/.local/share/icons/hicolor/symbolic/apps/
cp -rp data/icons/hicolor/symbolic/apps/re.sonny.Tangram-symbolic.svg ~/.local/share/icons/hicolor/symbolic/apps/re.sonny.Tangram-symbolic.svg

$PWD/src/re.sonny.Tangram "$@"
