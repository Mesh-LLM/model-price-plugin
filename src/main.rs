use anyhow::{Context, Result, bail};
use mesh_llm_plugin::{Plugin, PluginRuntime, package_manifest_json};
#[tokio::main]
async fn main() -> Result<()> {
    let plugin = model_prices::plugin()?;
    match std::env::args().nth(1).as_deref() {
        Some("--print-package-manifest") => {
            println!(
                "{}",
                package_manifest_json(&plugin.manifest().context("manifest")?)?
            );
            Ok(())
        }
        Some(arg) => bail!("unknown option: {arg}"),
        None => PluginRuntime::run(plugin).await,
    }
}
