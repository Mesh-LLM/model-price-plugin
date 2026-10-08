# Model Prices v0.1.0

Read-only Mesh console page showing advertised model prices, USD estimates and
linked OpenRouter references. No wallet or payment capabilities.

Native archives: macOS ARM64/x86_64, Linux ARM64/x86_64 (GNU), Windows ARM64/x86_64
(MSVC). Each archive includes a SHA-256 sidecar, UI bundle and package manifest.
Unix CI exercises installed package IPC initialization, restart and shutdown;
Windows runs unit/JS tests and archive validation, not the Unix IPC fixture.

See README for installation: repository name differs from plugin name, so use
an explicit archive install, not the repository shorthand.
