#!/bin/sh

meson --reconfigure --prefix $PWD/install build
ninja -C build install
./install/bin/re.sonny.gigagram