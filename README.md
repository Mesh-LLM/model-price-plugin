# Model Prices (preview)

Standalone, read-only Mesh console plugin. No wallet, payment capability, MCP tools,
credentials or model-card modifications. Works without a wallet. Derived from the
Lexe preview at `8d0ad07bbb226ee7914c9ced19c6617614ff169a`; see NOTICE.

## Build and local install

Use Rust 2024 and `just`: `just check`, `just test`, `just package`.
The package is `dist/model-prices-v0.1.0-<target>.tar.gz` (zip on Windows),
with checksum and generated `plugin-manifest.json`. Only macOS ARM64 is verified.
SDK pinned to Mesh `51fd00a99806afa1bc1db0abbedc5d0702c9900b`.

On a disposable, non-credential-bearing Mesh profile:

```sh
mesh-llm plugins install --archive /absolute/path/to/archive.tar.gz --name model-prices --version 0.1.0
```

Do not run that against your active profile merely to preview. Use a pre-authorized
host test setup; changing HOME alone does not isolate macOS Keychain.
Enable `model-prices` in the plugin config, start a private client without auto/join,
and navigate to **Model Prices** (`/plugins/model-prices/prices`). The host must
support v1 web UI projection and `/v1/models` on its management origin. No separate
inference port is guessed. Older hosts may ignore the additive web UI manifest.

## Data and external contacts

Mesh rows come from same-origin `GET /v1/models`. Each provider offer preserves
native msat per million input/output tokens, and minimum invoice.
Absent economics is unknown, never free. Advertised prices are not settlement quotes.

USD estimates load automatically on mount through `http/fx`. **Refresh prices**
refreshes Mesh offers and independently checks both reference caches. OpenRouter loads automatically through `http/openrouter` on mount and refresh. Both use `host.network.json`.
The backend contacts only these fixed unauthenticated HTTPS URLs:

- Coinbase: https://api.coinbase.com/v2/prices/BTC-USD/spot
- OpenRouter: https://openrouter.ai/api/v1/models

No model ID, prompt, wallet data, credential or caller-selected URL is transmitted.
The providers see ordinary connection metadata including IP. No proxy, redirects,
cookies or authorization headers. Responses limited to 8 MiB, 8 seconds total and
3 seconds connect. Each feed has its own single-flight memory cache: 5-minute TTL,
60-second failure backoff, stale last-success data retained up to 1 hour. Failures
never block Mesh rendering. Cache resets on process restart. Display freshness ages locally every second without network polling. No background polling;
refresh checks the cache, not a guaranteed external refresh. Retrieval timestamps
are local retrieval times, not assertions about upstream price publication time.

The single Input / output column defaults to USD; the currency selector switches
it to native msat. Minimum invoices remain explicitly msat, OpenRouter references
remain explicitly USD/M regardless of the selector.

USD/M = native msat/M × BTC/USD ÷ 100,000,000,000. No fallback FX rate.
OpenRouter USD/token × 1,000,000; input and output remain separate.
Exact OpenRouter IDs take precedence. Otherwise packaging-only normalization removes
repository owner, revision, GGUF and recognized quantization suffixes, requiring a
unique base-model ID. Generation, size and semantic variants are preserved;
ambiguous candidates are not selected. Curated nearby references for Flash-Next
and MiMo Flash-RL explicitly say different variant—not equivalent. Model IDs are
shown with all references. Gemma E2B is not mapped to larger Gemma models.
Other request, cache, image/audio and tool charges are excluded.
Known-zero price sides and minimum invoices are blank; Free status stays visible.
Unknown prices remain distinct, including when FX is unavailable.
No universal cheaper claim.

## Lifecycle and rollback

UI projection and process enablement are independent. Host state is `ready`,
`disabled`, `invalid`, `plugin_not_running` (or `none` without the manifest).
Disable only projection via PATCH `/api/plugins/model-prices/web-ui/enabled` with
`{"enabled":false}`; references should remain callable while assets/nav disappear.
Re-enable with true. Stopping the plugin removes navigation; missing bundle produces
invalid rather than fabricating a UI. Reinstall an intact archive to repair it.
`plugins disable model-prices` stops loadability; `plugins delete model-prices`
removes the package. No other plugin is affected. Unmount aborts browser requests.

## Verification boundaries

`just test`: full Rust suite, actual archive installer + installed child IPC handshake,
restart and shutdown, plus conversion/matching/unknown/cache failure fixtures.
`just ui-browser`: Playwright mocked host contract and HTTP fixtures (set
PLAYWRIGHT_MODULE to its installed ESM path); **not a real Mesh-console mount**.
Review `VERIFICATION.md` for the isolated 0.78.1 console proof and remaining limits.
No live wallets or external services are contacted by tests.

After verification, `just clean` removes disposable Rust outputs. Preserve dist
preview artifacts and the unmerged feature worktree. No release or main push.
