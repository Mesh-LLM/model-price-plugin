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
  const refsButton = node('button', 'Load USD and OpenRouter references');
  refsButton.type = 'button';
  const refsStatus = node('p', 'External references off. Loading contacts Coinbase and OpenRouter from the plugin backend; no model IDs, prompts or wallet information are sent.');
  refsStatus.setAttribute('role', 'status');
  root.append(title, description, scope, refresh, refsButton, refsStatus, status, container);
  element.replaceChildren(root);
  let disposed = false;
  let controller;
  let referenceController;
  let fx, catalog;
  let rows = [];
  function render() {
    const table = node('table', '');
    Object.assign(table.style, { color: tokens.foreground, width: '100%', borderCollapse: 'collapse', textAlign: 'left' });
    const headings = node('tr', '');
    for (const label of ['Model', 'Provider', 'Status', 'Input rate', 'Output rate', 'Minimum invoice', 'Peer age at refresh', 'Approx USD / M input · output', 'OpenRouter reference USD / M input · output']) {
      const cell = node('th', label); cell.scope = 'col'; cell.style.padding = '12px'; headings.append(cell);
    }
    const head = node('thead', ''); head.append(headings);
    const body = node('tbody', '');
    for (const row of rows) {
      const tr = node('tr', '');
      const values = ['model', 'provider', 'status', 'input', 'output', 'minimum', 'age'].map(k => row[k]);
      values.push(`${usd(row.inputMsat, fx)} · ${usd(row.outputMsat, fx)}`, reference(row.model, catalog));
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
    refsButton.disabled = true;
    refsStatus.textContent = 'Loading optional references; Mesh prices remain independent…';
    // Separate requests ensure a failed feed does not discard the other.
    const results = await Promise.allSettled(['fx', 'openrouter'].map(path => host.network.json(`http/${path}`, {signal: current.signal})));
    clearTimeout(timer);
    if (disposed || referenceController !== current) return;
    fx = results[0].status === 'fulfilled' ? results[0].value : undefined;
    catalog = results[1].status === 'fulfilled' ? results[1].value : undefined;
    refsStatus.textContent = `${feedLabel('Coinbase BTC/USD', fx)}. ${feedLabel('OpenRouter', catalog)}. Exact ID only; quantization/provider/context may differ. Cache, request, image, audio and tool charges are not included. Cache refresh 5 min, failures back off 1 min, data expires after 1 hour; Refresh references checks backend cache.`;
    refsButton.textContent = 'Refresh references'; refsButton.disabled = false;
    render();
  }
  refsButton.addEventListener('click', loadReferences);
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
      status.textContent = rows.length ? `Updated ${new Date().toLocaleTimeString()} · ${rows.length} offer rows. Refresh for current peer ages.` : 'No models advertised. Pricing availability is unknown.';
    } catch (error) {
      if (!disposed && controller === current) status.textContent = `Prices unavailable: ${error.name === 'AbortError' ? 'request timed out' : error.message}. No prices inferred; try Refresh.`;
    } finally {
      clearTimeout(timer);
      if (!disposed && controller === current) refresh.disabled = false;
    }
  }
  refresh.addEventListener('click', load);
  void load();
  return { unmount() { disposed = true; controller?.abort(); referenceController?.abort(); refsButton.removeEventListener('click', loadReferences); refresh.removeEventListener('click', load); root.remove(); } };
}
