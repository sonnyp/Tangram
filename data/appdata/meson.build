appstream_file = i18n.merge_file(
  input: 're.sonny.Tangram.metainfo.xml',
  output: 're.sonny.Tangram.metainfo.xml',
  po_dir: '../../po',
  install: true,
  install_dir: join_paths(get_option('datadir'), 'metainfo')
)

# Validate Appdata
appstreamcli = find_program('appstreamcli', required: false)
if (appstreamcli.found())
  test('validate-appdata',
    appstreamcli,
    args: ['validate', '--no-net', '--explain', appstream_file],
    workdir: meson.current_build_dir()
  )
endif
