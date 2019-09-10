subdir('icons')
subdir('appdata')

pkgdatadir = join_paths(get_option('datadir'), meson.project_name())
gnome = import('gnome')

configure_file(
  input: 're.sonny.Tangram.service.in',
  output: 're.sonny.Tangram.service',
  configuration: conf,
  install_dir: join_paths(get_option('datadir'), 'dbus-1/services')
)

desktop_file = i18n.merge_file(
  input: 're.sonny.Tangram.desktop.in',
  output: 're.sonny.Tangram.desktop',
  type: 'desktop',
  po_dir: '../po',
  install: true,
  install_dir: join_paths(get_option('datadir'), 'applications')
)

desktop_utils = find_program('desktop-file-validate', required: false)
if desktop_utils.found()
  test('Validate desktop file', desktop_utils,
    args: [desktop_file]
  )
endif

data_res = gnome.compile_resources('re.sonny.Tangram.data',
  're.sonny.Tangram.data.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
)

install_data('re.sonny.Tangram.gschema.xml',
  install_dir: join_paths(get_option('datadir'), 'glib-2.0/schemas')
)

compile_schemas = find_program('glib-compile-schemas', required: false)
if compile_schemas.found()
  test('Validate schema file', compile_schemas,
    args: ['--strict', '--dry-run', meson.current_source_dir()]
  )
endif
