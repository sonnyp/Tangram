#!/bin/sh

# data
glib-compile-resources --target=data/re.sonny.Tangram.data.gresource --sourcedir=data/ data/re.sonny.Tangram.data.gresource.xml

# services
glib-compile-resources --target=data/re.sonny.Tangram.services.gresource --sourcedir=src/ src/re.sonny.Tangram.services.gresource.xml

# settings
glib-compile-schemas --strict data/
export GSETTINGS_SCHEMA_DIR=./data

# notifications
# FIXME add Exec=gjs /home/sonny/Projects/Tangram/src/dev.js
# cp data/re.sonny.Tangram.desktop.in ~/.local/share/applications/re.sonny.Tangram.desktop

$PWD/src/re.sonny.Tangram "$@"
