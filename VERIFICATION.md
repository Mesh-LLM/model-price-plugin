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
