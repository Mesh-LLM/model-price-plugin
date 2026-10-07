# Candidate verification — 2026-10-07

Source baseline: Lexe UI commit 8d0ad07bbb226ee7914c9ced19c6617614ff169a.
SDK: 51fd00a99806afa1bc1db0abbedc5d0702c9900b. Feature branch feat/standalone-prices.

- `just check`: format, all-target check, all-target Clippy -D warnings passed.
- `just test`: 3 Rust cache/parser tests; installed native archive IPC lifecycle
  test (install, handshake, kill/restart, clean shutdown); 5 JS fixture tests passed.
- `just ui-browser`: Chromium with mocked Mesh host and mocked HTTP; mixed/unknown,
  opt-in references, exact ID, external outage preserving Mesh rows, models error,
  empty state, safe text and repeated unmount passed. Screenshot dist/prices-preview.png.
- `just package`: release macOS ARM64 binary/archive/checksum and manifest generated.
- No real Mesh-console navigation/mount/toggle claim yet. The protocol lifecycle
  test uses real installer/runtime but a minimal IPC host, not Mesh console.
- No external live fetch, wallet access, active profile mutation or release.

Open verification: independent review and genuine isolated console workflow.
The plugin has no credential dependencies. Host startup still requires inspection
of its exact binary provenance and credential path before unattended execution.

## Follow-up verification

Independent source/package/JS review by Thinker at 5d5bbe1 found reference
freshness did not advance on an idle page. Fixed: derive effective state from
retrieval time and backend failure state, re-render locally every second without
network polling, remove timer on unmount. Six JS tests and Chromium fake-clock
checks prove five-minute staleness and one-hour removal without a click.

Genuine isolated Mesh **0.78.1** console validation passed using release host SHA256
`48f7af521cc96fcdebe172d98c5fb03bda94d8872fe362d9b078106cfbd3178c`:
- Actual CLI archive install and private client start with fresh unencrypted test
  owner identity (source-inspected no-Keychain path), dedicated store/ports/runtime.
- Real auxiliary navigation, page mount, empty-model handling.
- Both `/api/plugins/model-prices/http/fx` and `/http/openrouter` returned fresh
  public live data; actual page invoked both through host.network.json.
- Projection off returned 200 disabled; bundle asset returned 404; navigation
  disappeared; reference HTTP remained 200. Re-enable returned 200 and remounted.
- No model served/joined: populated offers are fixture evidence, not live pricing
  or settlement verification. Missing-bundle and stopped-host browser states were
  not exercised. No active profile, wallet, payment or existing instance touched.
- Task-owned host was stopped after validation; preview archive/screenshots retained.

Live reference calls above are explicit manual integration checks, not unit tests.

## Automatic USD display — 2026-10-08

Removed peer-age column. FX loads independently on mount and on Refresh prices;
OpenRouter remains opt-in. Existing six-significant-digit formatting preserves
positive tiny rates. Page-level FX source/time and local stale/expiry remain.

`just check`, full `just test` (Rust + installed process + six JS fixtures),
`just package` and mocked Chromium passed for this update. Browser checks include
automatic FX without OpenRouter requests, no age column, tiny USD values, FX
failure preserving native rows, idle stale/expiry and repeated unmount.

Installed archive on the existing isolated public client (main 2b365527). Actual
browser Flash-Next row: Paid, 500/1500 msat per million, minimum 1000 msat;
automatic Coinbase conversion displayed $0.000417049 / $0.00125115 per million
at retrieval 2026-10-07T20:34:48Z. Values fluctuate with FX. No references button
click, paid inference, wallet operation or seller change. Screenshot/page evidence
retained in the existing model-prices lab archive (public-prices.png/public-page.txt).

## Single price column and automatic OpenRouter — 2026-10-08

USD-default currency selector controls one Input / output cell, with both values
labelled. Minimum invoices stay msat and OpenRouter stays USD/M explicitly.
Both independent cached reference feeds now load on mount and Refresh prices.
Full check/Clippy, package tests and Chromium fixtures passed on this diff;
fixtures cover both currencies, six columns, automatic reference calls, expiry,
external failure with native prices retained and repeated unmount.
Real console verified both currencies and fresh automatic OpenRouter loading.
Flash-Next USD input/output: $0.000416693 / $0.00125008 at 20:45:41 UTC;
msat toggle: 500 / 1500 per million, minimum 1000. Exact OpenRouter match absent
for the quantized ID, correctly shown as no comparable listing. Screenshots:
model-prices lab archive toggle-usd.png and toggle-msat.png.
GitHub destination Mesh-LLM/model-price-plugin contents API reported repository
empty (404); no remote instructions/history available. No remote branch or main
push performed for this follow-up; existing local history and NOTICE preserved.
