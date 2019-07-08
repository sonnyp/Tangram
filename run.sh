#!/usr/bin/sh
glib-compile-resources --sourcedir=src/ src/re.sonny.gigagram.services.gresource.xml
gjs ./src/dev.js
