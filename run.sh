#!/usr/bin/sh
glib-compile-resources --target=data/re.sonny.gigagram.services.gresource --sourcedir=src/ src/re.sonny.gigagram.services.gresource.xml
gjs ./src/dev.js
