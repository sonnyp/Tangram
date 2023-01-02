project('re.sonny.Tangram',
  version: '1.5.0',
  meson_version: '>= 0.59.0',
  license: 'GPL-3.0-only'
)

conf = configuration_data()
conf.set('BINDIR', join_paths([ get_option('prefix'), 'bin' ]))

gnome = import('gnome')
i18n = import('i18n')

subdir('data')
subdir('src')
subdir('po')

gnome.post_install(
  glib_compile_schemas: true,
  gtk_update_icon_cache: true,
  update_desktop_database: true
)
