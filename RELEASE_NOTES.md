# Model Prices v0.1.1

Removes the obsolete minimum-invoice column, parsing and fixture fields.
Advertised input/output rates, unknown economics and read-only behavior are unchanged.

Full local package tests and warning-denying Clippy pass on macOS ARM64.
Actual Mesh console verification of this patch is still outstanding; no claim of
live catalog or wallet testing is made. No wallet/payment capabilities.

Native archives and checksums are produced by the six-platform release pipeline.
Use an explicit archive install with `--name model-prices --version 0.1.1`;
the GitHub repository name differs from the plugin name.
