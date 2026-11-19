import sys, os
from playwright.sync_api import sync_playwright
w,W=int(sys.argv[1]),int(sys.argv[2]); FPS=30; DUR=41; N=DUR*FPS
os.makedirs('frames',exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--force-color-profile=srgb','--hide-scrollbars']); pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.goto('file:///home/claude/vid/explainer.html'); pg.evaluate('document.fonts.ready'); pg.evaluate('init()'); pg.wait_for_timeout(600)
    for i in range(w,N,W):
        pg.evaluate(f'seek({i/FPS})'); pg.screenshot(path=f'frames/{i:05d}.jpg',type='jpeg',quality=92)
    b.close()
