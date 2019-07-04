#!/usr/bin/sh
glib-compile-resources --sourcedir=src/ src/re.sonny.gigagram.data.gresource.xml
gjs ./src/dev.js