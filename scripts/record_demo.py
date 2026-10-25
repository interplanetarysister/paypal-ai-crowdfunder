#!/usr/bin/env python3
"""Record a truthful no-credentials browser demonstration of the real local app.

Optional local tools: Python Playwright + browser. No PayPal payments, paid AI credits,
or hosting. This is a functional AI/campaign clip, NOT proof of sandbox checkout.
"""
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'demo-artifacts'

def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]

def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit('Install the optional recorder: python3 -m pip install playwright && python3 -m playwright install chromium')
    OUT.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='crowdfunder-rec-') as work:
        port=free_port()
        env=os.environ.copy()
        for name in ('PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID'):
            env.pop(name,None)
        env.update(PORT=str(port),HOST='127.0.0.1',DEMO_DATA_DIR=work)
        server=subprocess.Popen(['node','server.mjs'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
        try:
            url=f'http://127.0.0.1:{port}'
            for _ in range(80):
                if server.poll() is not None:
                    raise RuntimeError('Local server exited during startup.')
                try:
                    with urlopen(url+'/api/health',timeout=1) as resp:
                        if resp.status==200:
                            break
                except Exception:
                    time.sleep(.15)
            else:
                raise RuntimeError('Local server did not become ready.')
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True, executable_path=shutil.which('chromium') or shutil.which('google-chrome') or None)
                ctx=browser.new_context(viewport={'width':1280,'height':720},record_video_dir=str(OUT),record_video_size={'width':1280,'height':720},device_scale_factor=1)
                page=ctx.new_page()
                try:
                    page.goto(url,wait_until='networkidle')
                except Exception as navigation_error:
                    if 'ERR_BLOCKED_BY_ADMINISTRATOR' not in str(navigation_error):
                        raise
                    # Some managed browsers block loopback navigation. Render
                    # original frontend files and relay to the real local server.
                    def relay(args):
                        route=args['route']
                        if not isinstance(route,str) or not route.startswith('/api/') or '://' in route:
                            raise ValueError('Only local application API routes are allowed')
                        request=Request(url+route,data=(args.get('body') or '').encode('utf-8') if args.get('method')=='POST' else None,method=args.get('method','GET'),headers={'Content-Type':'application/json'})
                        try:
                            with urlopen(request,timeout=10) as response:
                                return {'status':response.status,'body':response.read().decode('utf-8')}
                        except HTTPError as error:
                            return {'status':error.code,'body':error.read().decode('utf-8')}
                    page.expose_function('__crowdfunderApi',relay)
                    markup=(ROOT/'public/index.html').read_text(encoding='utf-8').replace('<link rel="stylesheet" href="/style.css">','').replace('<script type="module" src="/app.js"></script>','')
                    page.set_content(markup,wait_until='domcontentloaded')
                    page.add_style_tag(content=(ROOT/'public/style.css').read_text(encoding='utf-8'))
                    page.evaluate('''() => {window.fetch = async (route, options={}) => {
                      const message=await window.__crowdfunderApi({route, method:options.method||'GET',body:options.body||''});
                      return new Response(message.body,{status:message.status,headers:{'content-type':'application/json'}});
                    };}''')
                    page.add_script_tag(content=(ROOT/'public/app.js').read_text(encoding='utf-8'))
                    page.locator('#paypal-state').get_by_text('PayPal sandbox credentials needed for checkout').wait_for(timeout=10000)
                page.wait_for_timeout(4000)
                page.locator('#load-demo').click()
                page.wait_for_timeout(4000)
                page.locator('#draft-form button[type=submit]').click()
                page.locator('#result').wait_for(state='visible',timeout=10000)
                page.wait_for_timeout(5500)
                page.locator('#draft-title-options').select_option(index=1)
                page.wait_for_timeout(3000)
                page.locator('#draft-title').fill('Help Clean Our Coast')
                page.wait_for_timeout(4000)
                page.locator('#draft-story').click()
                page.wait_for_timeout(5000)
                page.locator('#save-campaign').click()
                page.locator('#campaign-grid h3',has_text='Help Clean Our Coast').wait_for(timeout=10000)
                page.wait_for_timeout(6000)
                assert page.locator('#campaign-grid button',has_text='PayPal setup required').first.is_disabled()
                page.wait_for_timeout(6500)
                video=page.video
                ctx.close()
                source=Path(video.path())
                target=OUT/'crowdfunder-ai-walkthrough.webm'
                shutil.copyfile(source,target)
                browser.close()
            ffmpeg=shutil.which('ffmpeg')
            if ffmpeg:
                subprocess.run([ffmpeg,'-y','-loglevel','error','-i',str(target),
                                '-c:v','libx264','-pix_fmt','yuv420p',
                                str(OUT/'crowdfunder-ai-walkthrough.mp4')],check=True)
            print('AI/demo recording saved to',OUT)
            print('This clip contains NO PayPal order or verified payment. For a final')
            print('end-to-end hackathon video, first record a real sandbox buyer checkout.')
        finally:
            server.terminate()
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:server.kill()

if __name__=='__main__':
    main()
