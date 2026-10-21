//! The adapters as Vorn reads them, for the tests that replay
//! recorded cases against them.

#![allow(dead_code)]

use std::path::PathBuf;

use vorn_agents::{Agent, Agents};

/// The adapter named `name`, read from its manifest.
pub fn agent(name: &str) -> Agent {
    let manifest = std::fs::read_to_string(package(name).join("vorn-extension.toml"))
        .unwrap_or_else(|e| panic!("{name}: {e}"));
    let agent = vorn_agents::from_manifest_text(&manifest)
        .unwrap_or_else(|e| panic!("{name}: {e}"))
        .unwrap_or_else(|| panic!("{name} has no [agent] section"));
    if let Some(env) = &agent.spec().env {
        vorn_agents::launch::env::add_markers(&env.strip, &env.strip_prefixes);
    }
    agent
}

/// Every adapter, those Vorn does not install on first launch too.
pub fn all() -> Agents {
    Agents::new(vorn_adapters::ADAPTERS.iter().map(|(name, _)| agent(name)))
}

/// The adapters Vorn installs on first launch.
pub fn on_by_default() -> Agents {
    Agents::new(
        vorn_adapters::ADAPTERS
            .iter()
            .filter(|(_, on)| *on)
            .map(|(name, _)| agent(name)),
    )
}

/// Every adapter's markers, registered as vornd registers them.
pub fn markers() {
    all();
}

/// A file under `tests/fixtures`, recorded from Vorn's own corpus.
pub fn repo_fixture(path: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(path)
}

/// The package folder of the adapter named `name`.
pub fn package(name: &str) -> PathBuf {
    vorn_adapters::folder(name)
}
