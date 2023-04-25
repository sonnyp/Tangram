pkgdatadir = join_paths(get_option('datadir'), meson.project_name())
gnome = import('gnome')

blueprint_compiler = find_program(
  # Flatpak
  '/app/bin/blueprint-compiler',
  # host
  '../../blueprint-compiler/blueprint-compiler.py'
)

gjspack = find_program('../troll/gjspack/bin/gjspack')
gresource = custom_target('gjspack',
  input: ['main.js', '../po/POTFILES'],
  output: meson.project_name() + '.src.gresource',
  command: [
    gjspack,
    '--appid=' + meson.project_name(),
    '--resource-root', meson.project_source_root(),
    '--blueprint-compiler', blueprint_compiler,
    '--no-executable',
    '@INPUT0@',
    '--potfiles', '@INPUT1@',
    '@OUTDIR@',
  ],
  install: true,
  install_dir: pkgdatadir,
  build_always_stale: true,
)

bin_conf = configuration_data()
bin_conf.set('GJS', find_program('gjs').full_path())
bin_conf.set('PACKAGE_VERSION', meson.project_version())
bin_conf.set('PACKAGE_NAME', meson.project_name())
bin_conf.set('prefix', get_option('prefix'))
bin_conf.set('libdir', join_paths(get_option('prefix'), get_option('libdir')))
bin_conf.set('datadir', join_paths(get_option('prefix'), get_option('datadir')))

configure_file(
  input: 're.sonny.Tangram',
  output: 're.sonny.Tangram',
  configuration: bin_conf,
  install: true,
  install_dir: get_option('bindir')
)
