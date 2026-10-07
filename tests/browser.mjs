// Run with PLAYWRIGHT_MODULE pointing to an installed playwright module.
// Entire HTTP surface is mocked; no host, wallet or external service is used.
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  let mode = 'ok'; let refsFail = false; let requests = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url()); requests.push(url.pathname);
    if (url.pathname === '/') return route.fulfill({contentType:'text/html',body:'<body style="margin:40px;background:#10151e;font:16px system-ui"><main></main></body>'});
    if (url.pathname.startsWith('/bundle/')) return route.fulfill({contentType:'text/javascript',body:await readFile(new URL(`../bundle/${url.pathname.split('/').pop()}`, import.meta.url),'utf8')});
    if (url.pathname.startsWith('/http/')) {
      if(refsFail) return route.fulfill({status:503,body:'offline'});
      return route.fulfill({json:{state:'fresh',retrieved_at:Date.now()/1000,source:'fixture',data:url.pathname==='/http/fx'?{btc_usd:50000}:{'qwen/model':{input_usd_million:1,output_usd_million:2}}}});
    }
    assert.equal(url.pathname, '/v1/models');
    if(mode==='error') return route.fulfill({status:503,body:'unavailable'});
    const data = mode === 'empty' ? [] : [{id:'qwen/model',payment:{offers:[{provider_id:'provider-free',paid:false,peer_last_seen_seconds_ago:2},{provider_id:'provider-paid',paid:true,rate_unit:'msat_per_million_tokens',pricing:{input_msat_per_million:1000,output_msat_per_million:4000,minimum_invoice_msat:10000},peer_last_seen_seconds_ago:14}]}},{id:'Legacy model — no economics'},{id:'<script>alert(1)</script>'}];
    return route.fulfill({json:{data}});
  });
  await page.goto('http://preview.invalid/');
  await page.evaluate(async () => {
    const {registerMeshPluginUi}=await import('/bundle/register-mesh-plugin-ui.js');
    window.mount = registerMeshPluginUi().pages.prices({element:document.querySelector('main'),host:{network:{json:async(path,init)=>{const r=await fetch('/'+path,init);if(!r.ok)throw Error('offline');return r.json();}},webUi:{asset_base_url:'/bundle/'},appearance:{tokens:{foreground:'#e8edf5',panel:'#17202e',border:'#354459',radius:'8px',radiusLarge:'16px',accent:'#84e0c0',accentInk:'#10251f'}}}});
  });
  await page.getByText(/4 offer rows/).waitFor();
  assert.equal(await page.locator('tbody tr').count(),4);
  assert.equal(await page.locator('script').count(),0);
  await page.getByText(/Coinbase BTC\/USD: fresh/).waitFor();
  assert(requests.includes('/http/fx'));
  await page.getByText(/OpenRouter: fresh/).waitFor();
  assert(requests.includes('/http/openrouter'));
  assert.equal(await page.locator('th').count(),6);
  assert.equal(await page.locator('tbody tr').first().locator('td').nth(3).innerText(),'');
  assert.equal(await page.locator('tbody tr').first().locator('td').nth(4).innerText(),'');
  assert.match(await page.locator('tbody').innerText(), /Input: \$0.0005 · Output: \$0.002/);
  await page.getByLabel('Display currency').selectOption('msat');
  assert.match(await page.locator('tbody').innerText(), /Input: 1,000 msat.*Output: 4,000 msat/);
  assert.match(await page.locator('thead').innerText(), /OpenRouter reference USD/);
  await page.getByLabel('Display currency').selectOption('USD');
  assert.match(await page.locator('tbody').innerText(), /exact ID/);
  await page.screenshot({path:process.env.SCREENSHOT || 'dist/prices-preview.png',fullPage:true});
  await page.clock.install();
  await page.clock.fastForward(301000);
  await page.getByText(/Coinbase BTC\/USD: stale/).waitFor();
  assert.match(await page.locator('tbody').innerText(), /stale/);
  await page.clock.fastForward(3301000);
  await page.getByText(/Coinbase BTC\/USD: unavailable/).waitFor();
  assert.doesNotMatch(await page.locator('tbody').innerText(), /exact ID/);
  refsFail=true; await page.getByRole('button',{name:'Refresh prices',exact:true}).click();
  await page.getByText(/Coinbase BTC\/USD: unavailable/).waitFor();
  assert.equal(await page.locator('tbody tr').count(),4);
  await page.getByRole('button',{name:'Refresh prices',exact:true}).click();
  await page.getByText(/4 offer rows/).waitFor();
  await page.getByText(/Coinbase BTC\/USD: unavailable/).waitFor();
  await page.getByLabel('Display currency').selectOption('msat');
  assert.match(await page.locator('tbody').innerText(), /1,000 msat/);
  mode='error'; await page.getByRole('button',{name:'Refresh prices',exact:true}).click(); await page.getByText(/HTTP 503/).waitFor(); assert.equal(await page.locator('tbody tr').count(),0);
  mode='empty'; await page.getByRole('button',{name:'Refresh prices',exact:true}).click(); await page.getByText(/No models advertised/).waitFor();
  await page.evaluate(() => { window.mount.unmount(); window.mount.unmount(); });
  assert.equal(await page.locator('main').innerHTML(),'');
  assert(requests.every(p => p==='/' || p==='/v1/models' || p.startsWith('/bundle/') || p.startsWith('/http/')));
  console.log('PASS: mixed/unknown rendering, safe text, refresh/error/empty, idempotent unmount; mocked models/references, local-clock stale/expiry');
} finally { await browser.close(); }
