"""Builds promo-wide.html from its template + the blocks it shares with promo.html."""
src = open('promo.html', encoding='utf-8').read().split('\n')
blk = lambda a, b: '\n'.join(src[a - 1:b])
parts = {
    'HELPERS': blk(251, 273),
    'STORY': blk(278, 299),
    'FACE': blk(361, 452),
    'PHONE_SCREENS': blk(905, 977),
    'SCAN_HELPERS': blk(980, 1006),
}
# sanity: each block must start/end where expected
assert parts['HELPERS'].startswith('const $ =') and parts['HELPERS'].rstrip().endswith('.14) => clamp(1 - Math.abs(t - t0) / w);')
assert parts['STORY'].startswith("const SHOP") and 'SEL_TIME' in parts['STORY'].split('\n')[-1]
assert parts['FACE'].startswith('const bz') and parts['FACE'].rstrip().endswith('}')
assert parts['PHONE_SCREENS'].startswith('const PLACEHOLDER') and parts['PHONE_SCREENS'].rstrip().endswith('}')
assert parts['SCAN_HELPERS'].startswith('function phase') and parts['SCAN_HELPERS'].rstrip().endswith('}')
out = open('promo-wide.tpl.html', encoding='utf-8').read()
for k, v in parts.items():
    tag = f'/*@@{k}@@*/'
    assert out.count(tag) == 1, k
    out = out.replace(tag, v)
open('promo-wide.html', 'w', encoding='utf-8').write(out)
print('assembled', len(out.split(chr(10))), 'lines')
