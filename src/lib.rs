pub mod reference;
use mesh_llm_plugin::{
    PluginMetadata, SimplePlugin, http, plugin, plugin_server_info, web_ui, web_ui_bundle,
    web_ui_page,
};
use std::sync::Arc;
pub fn plugin() -> anyhow::Result<SimplePlugin> {
    let fx = Arc::new(reference::Feed::new(reference::Kind::Fx)?);
    let models = Arc::new(reference::Feed::new(reference::Kind::Models)?);
    Ok(plugin! {
        metadata: PluginMetadata::new("model-prices", env!("CARGO_PKG_VERSION"), plugin_server_info("model-prices", env!("CARGO_PKG_VERSION"), "Model Prices", "Read-only advertised offers and optional reference prices", None::<String>)),
        web_ui: [web_ui().bundle(web_ui_bundle("prices", "bundle")).page(web_ui_page("prices", "Model Prices", "prices", "register-mesh-plugin-ui.js").bundle_id("prices"))],
        http: [
            http::get("/fx").handle(move |_args, _context| { let feed = fx.clone(); Box::pin(async move { Ok(feed.get().await) }) }),
            http::get("/openrouter").handle(move |_args, _context| { let feed = models.clone(); Box::pin(async move { Ok(feed.get().await) }) }),
        ],
    })
}
