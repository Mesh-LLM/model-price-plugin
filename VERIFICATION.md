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
