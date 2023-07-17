const b = require('benny');

(async () => {
  const { exclude: wasmExclude } = await import('./build/release.js');
  const { exclude } = await import('cidr-tools');

  b.suite(
    'cidr-tools vs cidr-tools-wasm',

    b.add('cidr-tools', () => {
      exclude(['0.0.0.0/0'], [
        '0.0.0.0/8',
        '224.0.0.0/4',
        '240.0.0.0/4',
        '10.0.0.0/8',
        '127.0.0.0/8',
        '100.64.0.0/10',
        '172.16.0.0/12',
        '198.18.0.0/15',
        '192.168.0.0/16',
        '169.254.0.0/16',
        '192.0.0.0/24',
        '192.0.2.0/24'
      ]);
    }),

    b.add('cidr-tools-wasm', async () => {
      wasmExclude(['0.0.0.0/0'], [
        '0.0.0.0/8',
        '224.0.0.0/4',
        '240.0.0.0/4',
        '10.0.0.0/8',
        '127.0.0.0/8',
        '100.64.0.0/10',
        '172.16.0.0/12',
        '198.18.0.0/15',
        '192.168.0.0/16',
        '169.254.0.0/16',
        '192.0.0.0/24',
        '192.0.2.0/24'
      ]);
    }),

    b.cycle(),
    b.complete()
  )
})();
