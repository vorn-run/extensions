//! Building a component and writing the pack, apart from the command line.

use std::collections::BTreeMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Deserialize;
use sha2::{Digest, Sha256};

/// The target every component is built for, as Vorn builds its own.
const TARGET: &str = "wasm32-wasip2";
/// What a folder holds that is for building or testing it, never for running it.
const NOT_PACKED: [&str; 9] = [
    "Cargo.toml",
    "Cargo.lock",
    "CHANGELOG.md",
    "README.md",
    "fixtures",
    "src",
    "tests",
    "target",
    "node_modules",
];
/// A folder whose subfolders are extensions of their own.
const GROUPS: [&str; 1] = ["adapters"];
/// The largest logo the catalog carries inline, as Vorn caps it.
const MAX_LOGO_BYTES: usize = 64 * 1024;

/// What the packer reads of a manifest.
#[derive(Debug, Deserialize)]
pub struct Manifest {
    pub id: String,
    pub version: String,
    name: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    publisher: Option<String>,
    #[serde(default)]
    homepage: Option<String>,
    #[serde(default)]
    whats_new: Option<String>,
    #[serde(default)]
    screenshots: Vec<String>,
    #[serde(default)]
    icon: Option<Icon>,
    #[serde(default)]
    service: Option<Service>,
    #[serde(default)]
    agent: Option<toml::Table>,
    #[serde(default)]
    theme: Option<toml::Table>,
    #[serde(default)]
    connector: Option<toml::Table>,
    #[serde(default)]
    contributes: Option<toml::Table>,
    #[serde(default)]
    mcp: toml::Table,
}

#[derive(Debug, Deserialize)]
struct Icon {
    #[serde(default)]
    view_box: Option<String>,
    #[serde(default)]
    paths: Vec<String>,
    #[serde(default)]
    file: Option<String>,
    #[serde(default)]
    dark: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Service {
    #[serde(default)]
    component: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CargoToml {
    package: CargoPackage,
}

#[derive(Debug, Deserialize)]
struct CargoPackage {
    name: String,
}

impl Manifest {
    /// Reads `vorn-extension.toml` in `folder`.
    pub fn read(folder: &Path) -> Result<Self, String> {
        let path = folder.join("vorn-extension.toml");
        let text = fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
        toml::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
    }

    fn component(&self) -> Option<&str> {
        self.service.as_ref()?.component.as_deref()
    }

    /// What it adds, as Vorn derives it from a manifest: never declared, so
    /// a listing cannot claim what its package does not do.
    fn tags(&self) -> Vec<&'static str> {
        let listed = |key: &str| {
            self.contributes
                .as_ref()
                .and_then(|c| c.get(key))
                .and_then(toml::Value::as_array)
                .is_some_and(|a| !a.is_empty())
        };
        [
            ("agent", self.agent.is_some()),
            ("connection", self.connector.is_some()),
            ("pane", listed("panes")),
            ("steps", listed("nodes")),
            ("theme", self.theme.is_some()),
            ("tools", !self.mcp.is_empty()),
        ]
        .into_iter()
        .filter_map(|(tag, on)| on.then_some(tag))
        .collect()
    }

    /// The logo file, light and dark: `[icon] file`, else the agent's `[agent] icon`.
    fn logo_files(&self) -> (Option<&str>, Option<&str>) {
        let icon = self.icon.as_ref();
        let agent = self
            .agent
            .as_ref()
            .and_then(|a| a.get("icon"))
            .and_then(toml::Value::as_str);
        let light = icon.and_then(|i| i.file.as_deref()).or(agent);
        (light, icon.and_then(|i| i.dark.as_deref()))
    }

    /// What the catalog lists of this pack, as JSON; `build-catalog.mjs` reads it.
    fn listing(&self, dir: &Path, sha256: &str) -> Result<String, String> {
        let mut listing = serde_json::json!({
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "sha256": sha256,
            "tags": self.tags(),
        });
        if let Some(icon) = self.icon.as_ref().filter(|i| !i.paths.is_empty()) {
            listing["icon"] = serde_json::json!({ "viewBox": icon.view_box, "paths": icon.paths });
        }
        let (light, dark) = self.logo_files();
        for (key, file) in [("logo", light), ("logoDark", dark)] {
            if let Some(file) = file {
                listing[key] = serde_json::json!(read_logo(&dir.join(file))?);
            }
        }
        let text = |v: &Option<String>| v.as_deref().filter(|s| !s.is_empty()).map(str::to_owned);
        for (key, value) in [
            ("publisher", text(&self.publisher)),
            ("homepage", text(&self.homepage)),
            ("whatsNew", text(&self.whats_new)),
        ] {
            if let Some(value) = value {
                listing[key] = serde_json::json!(value);
            }
        }
        if !self.screenshots.is_empty() {
            listing["screenshots"] = serde_json::json!(self.screenshots);
        }
        Ok(format!("{listing:#}\n"))
    }
}

/// A logo SVG, small enough for the catalog to carry inline.
fn read_logo(path: &Path) -> Result<String, String> {
    let svg = fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    if svg.len() > MAX_LOGO_BYTES || !svg.contains("<svg") {
        return Err(format!(
            "{} is not an SVG of at most {MAX_LOGO_BYTES} bytes",
            path.display()
        ));
    }
    Ok(svg)
}

/// A pack written, and its checksum.
pub struct Packed {
    pub file: PathBuf,
    pub sha256: String,
}

/// This repository's root: the packer lives in `tools/pack`.
pub fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

/// Every folder of a Rust extension, relative to `root`: one with a manifest
/// and no `package.json` (the connectors are npm packages, released by npm).
pub fn rust_extensions(root: &Path) -> Result<Vec<String>, String> {
    let read = |dir: &Path| fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()));
    let mut found = Vec::new();
    for entry in read(root)?.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if GROUPS.contains(&name.as_str()) {
            for sub in read(&entry.path())?.flatten() {
                if is_rust_extension(&sub.path()) {
                    found.push(format!("{name}/{}", sub.file_name().to_string_lossy()));
                }
            }
        } else if is_rust_extension(&entry.path()) {
            found.push(name);
        }
    }
    found.sort();
    Ok(found)
}

fn is_rust_extension(folder: &Path) -> bool {
    folder.join("vorn-extension.toml").is_file() && !folder.join("package.json").exists()
}

/// The folder and version a release tag names: `worktrees-v1.0.0` is
/// `worktrees`, and `adapters-claude-v1.0.0` is `adapters/claude`.
pub fn folder_of_tag(root: &Path, tag: &str) -> Result<(String, String), String> {
    let (name, version) = tag
        .rsplit_once("-v")
        .ok_or_else(|| format!("{tag} is not <folder>-v<version>"))?;
    let folder = match name.split_once('-') {
        Some((group, rest)) if GROUPS.contains(&group) => format!("{group}/{rest}"),
        _ => name.to_owned(),
    };
    if !is_rust_extension(&root.join(&folder)) {
        return Err(format!(
            "{tag} names {folder}, which is not a Rust extension here"
        ));
    }
    Ok((folder, version.to_owned()))
}

/// Builds `folder`'s component (when it has one) and writes its pack into `out`.
pub fn build_and_pack(root: &Path, folder: &Path, out: &Path) -> Result<Packed, String> {
    let dir = root.join(folder);
    let manifest = Manifest::read(&dir)?;
    let mut files = files_of(&dir)?;
    if let Some(component) = manifest.component() {
        let wasm = build_component(root, &dir)?;
        let bytes = fs::read(&wasm).map_err(|e| format!("{}: {e}", wasm.display()))?;
        files.insert(component.to_owned(), bytes);
    }
    let top = format!("{}-{}", manifest.id, manifest.version);
    let bytes = archive(&top, &files).map_err(|e| format!("{}: {e}", folder.display()))?;
    let sha256 = hex(&Sha256::digest(&bytes));
    let name = format!("{top}.vorn.tgz");
    let file = out.join(&name);
    fs::write(&file, &bytes).map_err(|e| format!("{}: {e}", file.display()))?;
    let sum = out.join(format!("{name}.sha256"));
    fs::write(&sum, format!("{sha256}  {name}\n"))
        .map_err(|e| format!("{}: {e}", sum.display()))?;
    let listing = out.join(format!("{top}.vorn.json"));
    fs::write(&listing, manifest.listing(&dir, &sha256)?)
        .map_err(|e| format!("{}: {e}", listing.display()))?;
    Ok(Packed { file, sha256 })
}

/// Every file of `dir` that is packed, by its path inside the pack.
fn files_of(dir: &Path) -> Result<BTreeMap<String, Vec<u8>>, String> {
    fn walk(dir: &Path, prefix: &str, out: &mut BTreeMap<String, Vec<u8>>) -> std::io::Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') || (prefix.is_empty() && NOT_PACKED.contains(&name.as_str())) {
                continue;
            }
            let rel = if prefix.is_empty() {
                name
            } else {
                format!("{prefix}/{name}")
            };
            let kind = entry.file_type()?;
            if kind.is_dir() {
                walk(&entry.path(), &rel, out)?;
            } else if kind.is_file() {
                out.insert(rel, fs::read(entry.path())?);
            }
        }
        Ok(())
    }
    let mut files = BTreeMap::new();
    walk(dir, "", &mut files).map_err(|e| format!("{}: {e}", dir.display()))?;
    Ok(files)
}

/// A tar.gz of `files` under `top/`, the same bytes for the same files anywhere.
pub fn archive(top: &str, files: &BTreeMap<String, Vec<u8>>) -> std::io::Result<Vec<u8>> {
    let gz = flate2::GzBuilder::new()
        .mtime(0)
        .operating_system(255)
        .write(Vec::new(), flate2::Compression::best());
    let mut tar = tar::Builder::new(gz);
    for (path, bytes) in files {
        let mut header = tar::Header::new_ustar();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o644);
        header.set_mtime(0);
        header.set_uid(0);
        header.set_gid(0);
        header.set_entry_type(tar::EntryType::Regular);
        tar.append_data(&mut header, format!("{top}/{path}"), bytes.as_slice())?;
    }
    let mut gz = tar.into_inner()?;
    gz.flush()?;
    gz.finish()
}

/// Builds the crate in `dir` for wasm32-wasip2 and answers its `.wasm`.
fn build_component(root: &Path, dir: &Path) -> Result<PathBuf, String> {
    let cargo_toml = dir.join("Cargo.toml");
    let text = fs::read_to_string(&cargo_toml)
        .map_err(|e| format!("{} has a component but no crate: {e}", dir.display()))?;
    let package = toml::from_str::<CargoToml>(&text)
        .map_err(|e| format!("{}: {e}", cargo_toml.display()))?
        .package
        .name;
    let root = fs::canonicalize(root).map_err(|e| format!("{}: {e}", root.display()))?;
    let target_dir = root.join("target");
    // The checkout's and cargo's paths end up in panic messages; remapped, they are the same everywhere.
    let mut remap = vec![format!(
        "--remap-path-prefix={}=/extensions",
        root.display()
    )];
    if let Some(home) = cargo_home() {
        remap.push(format!("--remap-path-prefix={}=/cargo", home.display()));
    }
    let cargo = std::env::var_os("CARGO").unwrap_or_else(|| "cargo".into());
    // spawn-visible: cargo, run by a build tool, never by Vorn as it runs.
    let status = Command::new(cargo)
        .current_dir(&root)
        .env("CARGO_TARGET_WASM32_WASIP2_RUSTFLAGS", remap.join(" "))
        .args(["build", "--locked", "--release", "--target", TARGET, "-p"])
        .arg(&package)
        .arg("--target-dir")
        .arg(&target_dir)
        .status()
        .map_err(|e| format!("cargo could not run to build {package}: {e}"))?;
    if !status.success() {
        return Err(format!("{package} did not build for {TARGET}"));
    }
    Ok(target_dir
        .join(TARGET)
        .join("release")
        .join(format!("{}.wasm", package.replace('-', "_"))))
}

fn cargo_home() -> Option<PathBuf> {
    std::env::var_os("CARGO_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".cargo")))
        .and_then(|p| fs::canonicalize(p).ok())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn files() -> BTreeMap<String, Vec<u8>> {
        BTreeMap::from([
            ("vorn-extension.toml".to_owned(), b"id = \"a.b\"\n".to_vec()),
            ("icon.svg".to_owned(), b"<svg/>".to_vec()),
        ])
    }

    #[test]
    fn the_same_files_pack_to_the_same_bytes() {
        assert_eq!(
            archive("a.b-1.0.0", &files()).unwrap(),
            archive("a.b-1.0.0", &files()).unwrap()
        );
    }

    #[test]
    fn a_pack_holds_its_files_under_one_folder_with_no_times_or_owners() {
        let bytes = archive("a.b-1.0.0", &files()).unwrap();
        let mut tar = tar::Archive::new(flate2::read::GzDecoder::new(bytes.as_slice()));
        let mut seen = Vec::new();
        for entry in tar.entries().unwrap() {
            let entry = entry.unwrap();
            let header = entry.header();
            assert_eq!(header.mtime().unwrap(), 0);
            assert_eq!(header.uid().unwrap(), 0);
            assert_eq!(header.mode().unwrap(), 0o644);
            seen.push(entry.path().unwrap().display().to_string());
        }
        assert_eq!(
            seen,
            ["a.b-1.0.0/icon.svg", "a.b-1.0.0/vorn-extension.toml"]
        );
    }

    #[test]
    fn a_tag_names_its_folder_and_version() {
        let root = repo_root();
        assert_eq!(
            folder_of_tag(&root, "adapters-claude-v1.2.0").unwrap(),
            ("adapters/claude".to_owned(), "1.2.0".to_owned())
        );
        assert_eq!(
            folder_of_tag(&root, "worktrees-v1.0.0").unwrap(),
            ("worktrees".to_owned(), "1.0.0".to_owned())
        );
        // A connector is an npm package and is released by npm, not here.
        assert!(folder_of_tag(&root, "github-v0.3.0").is_err());
    }

    #[test]
    fn only_what_runs_is_packed() {
        let files = files_of(&repo_root().join("adapters/claude")).unwrap();
        let names: Vec<&str> = files.keys().map(String::as_str).collect();
        assert_eq!(names, ["icon.svg", "vorn-extension.toml"]);
    }

    #[test]
    fn a_listing_carries_derived_tags_its_logo_and_showcase() {
        let dir = repo_root().join("adapters/claude");
        let listing = Manifest::read(&dir).unwrap().listing(&dir, "00").unwrap();
        let listing: serde_json::Value = serde_json::from_str(&listing).unwrap();
        assert_eq!(listing["tags"], serde_json::json!(["agent"]));
        assert_eq!(listing["publisher"], "Vorn");
        assert!(listing["logo"].as_str().unwrap().contains("<svg"));
        assert!(listing.get("logoDark").is_none());
    }

    #[test]
    fn tags_come_from_what_a_manifest_adds() {
        let manifest: Manifest = toml::from_str(
            "id = \"a.b\"\nversion = \"1.0.0\"\nname = \"A\"\n\
             [theme]\nname = \"Dusk\"\n[mcp.x]\ncommand = [\"x\"]\n\
             [contributes]\nnodes = []\n[[contributes.panes]]\nid = \"p\"\n",
        )
        .unwrap();
        assert_eq!(manifest.tags(), ["pane", "theme", "tools"]);
    }

    #[test]
    fn every_rust_extension_is_found_and_no_connector() {
        let found = rust_extensions(&repo_root()).unwrap();
        assert!(found.contains(&"worktrees".to_owned()), "{found:?}");
        assert!(found.contains(&"adapters/hermes".to_owned()), "{found:?}");
        assert!(!found.contains(&"github".to_owned()), "{found:?}");
    }
}
