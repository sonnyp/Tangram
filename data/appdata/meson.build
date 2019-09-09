appdata = app_id + '.appdata.xml'

i18n.merge_file(appdata,
  input: appdata + '.in',
  output: appdata,
  po_dir: '../../po',
  install: true,
  install_dir: join_paths(get_option('datadir'), 'metainfo')
)

appstream_util = find_program('appstream-util', required: false)

if appstream_util.found()
  test('Validate appstream file', appstream_util,
    args: ['validate', '--nonet', appdata]
  )
endif
