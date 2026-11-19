"""Builds promo-feed.html — the 4:5 Facebook/Instagram feed cut — from promo-tall.html.
The 9:16 stage is scaled to fit the 4:5 frame's height, and a matching background fills
the sides; the stage's edges fade into it so there is no seam. Re-run after make_tall.py."""
s = open('promo-tall.html', encoding='utf-8').read()

def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n == count, f'expected {count} match(es), found {n}: {a[:90]!r}'
    s = s.replace(a, b)

W, H = 540, 675
K = H / 960   # stage scale

rep('html,body{width:540px;height:960px;overflow:hidden;background:#05070f}',
    f'html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#05070f}}')
rep('#stage{position:relative;width:540px;height:960px;overflow:hidden}',
    f"""#stage{{position:absolute;top:0;left:0;width:540px;height:960px;overflow:hidden;transform:scale({K});transform-origin:50% 0;
  -webkit-mask-image:linear-gradient(to right,transparent,#000 9%,#000 91%,transparent)}}
#feedBg{{position:absolute;inset:0;overflow:hidden}}
#feedBg .b{{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0%,#15244d 0%,#0a1128 45%,#05070f 100%)}}
#feedBg .s{{position:absolute;inset:0;background-image:repeating-linear-gradient(-45deg,transparent 0 24px,#ef4444 24px 38px,transparent 38px 62px,#3b82f6 62px 76px,transparent 76px 100px);background-size:141px 141px;opacity:.06}}
#feedBg .v{{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 45%,transparent 58%,rgba(0,0,0,.55) 100%)}}""")
rep('<div id="stage"></div>',
    '<div id="feedBg"><div class="b"></div><div class="s"></div><div class="v"></div></div>\n<div id="stage"></div>')
rep('window.STAGE_W = 540; window.STAGE_H = 960;', f'window.STAGE_W = {W}; window.STAGE_H = {H};')


# ── gallery + social posts: show the 16:9 cut's side-by-side layout instead ──
# promo-wide.html runs on the same timeline, so it's embedded as an iframe that
# render.mjs seeks along with this page; its own background is hidden so it
# floats on #feedBg, and it crossfades with the 9:16 stage around WIDE_A..WIDE_B.
WIDE_A, WIDE_B, XF = 12.4, 23.8, .45
X0, X1 = 160, 930     # the part of the 960px wide stage that has content
WK = W / (X1 - X0)
rep('#feedBg{', f"""#wideBox{{position:absolute;left:0;top:{(H - 540 * WK) / 2:.1f}px;width:{W}px;height:{540 * WK:.1f}px;overflow:hidden;opacity:0}}
#wideBox iframe{{position:absolute;left:{-X0 * WK:.1f}px;top:0;width:960px;height:540px;border:0;transform:scale({WK:.5f});transform-origin:0 0}}
#feedBg{{""")
rep('<div id="stage"></div>', f'<div id="stage"></div>\n<div id="wideBox"><iframe src="promo-wide.html?embed"></iframe></div>')
rep('function seek(t) {', f"""const feedEnv = t => Math.min(1, Math.max(0, Math.min((t - {WIDE_A}) / {XF}, ({WIDE_B} - t) / {XF})));
function seek(t) {{
  const w = feedEnv(t);
  $('wideBox').style.opacity = w; $('stage').style.opacity = 1 - w;""")
open('promo-feed.html', 'w', encoding='utf-8').write(s)
print('wrote promo-feed.html')
