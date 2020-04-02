pkgdatadir = join_paths(get_option('datadir'), meson.project_name())
gnome = import('gnome')

message('Webpack')
r = run_command('../node_modules/.bin/webpack', '--mode=production', 'index.js', '--output=main.js')
if r.returncode() != 0
message(r.stdout().strip())
error(r.stderr().strip())
endif

src_res = gnome.compile_resources('re.sonny.Tangram.src',
  're.sonny.Tangram.src.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
)

bin_conf = configuration_data()
bin_conf.set('GJS', find_program('gjs').path())
bin_conf.set('PACKAGE_VERSION', meson.project_version())
bin_conf.set('PACKAGE_NAME', meson.project_name())
bin_conf.set('prefix', get_option('prefix'))
bin_conf.set('libdir', join_paths(get_option('prefix'), get_option('libdir')))
bin_conf.set('datadir', join_paths(get_option('prefix'), get_option('datadir')))

configure_file(
  input: 're.sonny.Tangram.in',
  output: 're.sonny.Tangram',
  configuration: bin_conf,
  install: true,
  install_dir: get_option('bindir')
)
