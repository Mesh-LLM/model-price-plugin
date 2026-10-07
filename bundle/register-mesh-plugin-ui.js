import { modelOffers } from './model-offers.js';
import { usd, reference, feedLabel } from './references.js';

export function registerMeshPluginUi() {
  return { pages: { prices: mountPrices } };
}

function mountPrices({ element, host }) {
  const tokens = host.appearance.tokens;
  const root = document.createElement('section');
  Object.assign(root.style, { color: tokens.foreground, background: tokens.panel, border: `1px solid ${tokens.border}`, borderRadius: tokens.radiusLarge, padding: '24px', display: 'grid', gap: '16px' });
  const node = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const title = node('h2', 'Model prices');
  title.style.fontSize = '24px';
  const description = node('p', 'Advertised, non-binding provider offers. Not a quote or payment authorization. Missing economics means unknown, not free.');
  const scope = node('p', 'Read-only · Native prices settle in msat. USD estimates and OpenRouter references are not binding quotes or equivalent products.');
  scope.style.color = tokens.accent;
  const refresh = node('button', 'Refresh prices');
  refresh.type = 'button';
  Object.assign(refresh.style, { background: tokens.accent, color: tokens.accentInk, padding: '10px 16px', borderRadius: tokens.radius, width: 'fit-content', cursor: 'pointer' });
  const status = node('p', 'Loading advertised prices…');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const container = node('div', '');
  container.style.overflowX = 'auto';
  const currency = node('select', '');
  currency.setAttribute('aria-label', 'Display currency');
  for (const value of ['USD', 'msat']) { const option = node('option', value); option.value = value; currency.append(option); }
  const fxStatus = node('p', 'Loading Coinbase BTC/USD estimate…');
  const refsStatus = node('p', 'Loading OpenRouter reference prices…');
  refsStatus.setAttribute('role', 'status');
  root.append(title, description, scope, refresh, currency, fxStatus, refsStatus, status, container);
  element.replaceChildren(root);
  let disposed = false;
  let controller;
  let referenceController;
  let fxController;
  let fx, catalog;
  let rows = [];
  function render() {
    const table = node('table', '');
    Object.assign(table.style, { color: tokens.foreground, width: '100%', borderCollapse: 'collapse', textAlign: 'left' });
    const headings = node('tr', '');
    for (const label of ['Model', 'Provider', 'Status', `Input / output (${currency.value} / million tokens)`, 'Minimum invoice (msat)', 'OpenRouter reference USD / M input · output']) {
      const cell = node('th', label); cell.scope = 'col'; cell.style.padding = '12px'; headings.append(cell);
    }
    const head = node('thead', ''); head.append(headings);
    const body = node('tbody', '');
    for (const row of rows) {
      const tr = node('tr', '');
      const input = currency.value === 'USD' ? usd(row.inputMsat, fx) : row.input;
      const output = currency.value === 'USD' ? usd(row.outputMsat, fx) : row.output;
      const values = [row.model, row.provider, row.status, `Input: ${input} · Output: ${output}`, row.minimum, reference(row.model, catalog)];
      for (const value of values) {
        const cell = node('td', value);
        Object.assign(cell.style, { padding: '12px', borderTop: `1px solid ${tokens.border}`, overflowWrap: 'anywhere', maxWidth: '280px' }); tr.append(cell);
      }
      body.append(tr);
    }
    table.append(head, body); container.replaceChildren(table);
  }
  async function loadReferences() {
    referenceController?.abort(); referenceController = new AbortController();
    const current = referenceController;
    const timer = setTimeout(() => current.abort(), 12000);
    refsStatus.textContent = 'Loading OpenRouter references; Mesh prices remain independent…';
    let result;
    try { result = await host.network.json('http/openrouter', {signal: current.signal}); }
    catch { result = undefined; }
    finally { clearTimeout(timer); }
    if (disposed || referenceController !== current) return;
    catalog = result;
    renderReferenceStatus();
    render();
  }
  async function loadFx() {
    fxController?.abort(); fxController = new AbortController();
    const current = fxController;
    const timer = setTimeout(() => current.abort(), 12000);
    try {
      const result = await host.network.json('http/fx', {signal: current.signal});
      if (disposed || fxController !== current) return;
      fx = result;
    } catch {
      if (disposed || fxController !== current) return;
      fx = undefined;
    } finally { clearTimeout(timer); }
    renderReferenceStatus(); render();
  }
  function renderReferenceStatus() {
    fxStatus.textContent = `${feedLabel('Coinbase BTC/USD', fx)}. Approximate USD/M; cached 5 min, expires after 1 hour. Refresh prices checks FX cache. Coinbase is contacted automatically; no model IDs, prompts or wallet data sent.`;
    if (catalog) refsStatus.textContent = `${feedLabel('OpenRouter', catalog)}. Exact ID reference only; quantization/provider/context may differ. Other charges excluded. Always USD/M; OpenRouter contacted automatically, no model IDs sent.`;
    else refsStatus.textContent = 'OpenRouter: unavailable. Native prices and USD estimates remain independent.';
  }
  // Local clock only: never polls the external services.
  const expiryTimer = setInterval(() => {
    if (disposed || (!fx && !catalog)) return;
    renderReferenceStatus(); render();
  }, 1000);
  currency.addEventListener('change', render);
  async function load() {
    controller?.abort();
    controller = new AbortController();
    const current = controller;
    const timer = setTimeout(() => current.abort(), 15000);
    refresh.disabled = true;
    status.textContent = 'Loading advertised prices…';
    rows = []; container.replaceChildren();
    try {
      // Explicit embedded-console coupling: plugin-scoped host.network cannot
      // access the host models API. Resolve against validated asset origin, not
      // a hardcoded inference port or a separate development UI origin.
      const base = new URL(host.webUi.asset_base_url, window.location.href);
      if (base.origin !== window.location.origin) throw new Error('Unsupported console origin');
      const response = await fetch(new URL('/v1/models', base), { signal: current.signal, cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
      if (!response.ok) throw new Error(`/v1/models returned HTTP ${response.status}`);
      rows = modelOffers(await response.json());
      if (disposed || controller !== current) return;
      render();
      status.textContent = rows.length ? `Updated ${new Date().toLocaleTimeString()} · ${rows.length} offer rows.` : 'No models advertised. Pricing availability is unknown.';
    } catch (error) {
      if (!disposed && controller === current) status.textContent = `Prices unavailable: ${error.name === 'AbortError' ? 'request timed out' : error.message}. No prices inferred; try Refresh.`;
    } finally {
      clearTimeout(timer);
      if (!disposed && controller === current) refresh.disabled = false;
    }
  }
  const refreshAll = () => { void load(); void loadFx(); void loadReferences(); };
  refresh.addEventListener('click', refreshAll);
  refreshAll();
  return { unmount() { disposed = true; clearInterval(expiryTimer); controller?.abort(); referenceController?.abort(); fxController?.abort(); currency.removeEventListener('change', render); refresh.removeEventListener('click', refreshAll); root.remove(); } };
}
