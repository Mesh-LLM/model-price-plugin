build:
    cargo build --release --locked
fmt:
    cargo fmt --all
check:
    cargo fmt --all --check
    cargo check --locked --all-targets
    cargo clippy --locked --all-targets -- -D warnings
test:
    cargo test --locked
    node --test tests/*.test.mjs
package: build
    python3 scripts/package.py
clean:
    cargo clean
ui-browser:
    node tests/browser.mjs

verify-package target:
    python3 scripts/release.py --verify {{target}}
