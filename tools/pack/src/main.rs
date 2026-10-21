//! `vorn-pack`: builds each Rust extension here and packs it as
//! `<id>-<version>.vorn.tgz`, with a `.sha256` beside it.
//!
//! The pack is the same bytes on every machine (sorted entries, no times,
//! owners or modes of the checkout, and a Wasm build with the checkout's
//! paths remapped), so the checksum CI publishes is the one Vorn pins.
//!
//! ```text
//! vorn-pack [--out DIR] [FOLDER...]   every Rust extension when no folder is named
//! vorn-pack --tag TAG [--out DIR]     the folder a release tag names, checked against its version
//! ```

use std::path::{Path, PathBuf};
use std::process::ExitCode;

mod pack;

fn main() -> ExitCode {
    match run(std::env::args().skip(1).collect()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("vorn-pack: {e}");
            ExitCode::FAILURE
        }
    }
}

fn run(args: Vec<String>) -> Result<(), String> {
    let root = pack::repo_root();
    let mut out = root.join("dist");
    let mut tag = None;
    let mut folders = Vec::new();
    let mut args = args.into_iter();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--out" => out = PathBuf::from(args.next().ok_or("--out needs a folder")?),
            "--tag" => tag = Some(args.next().ok_or("--tag needs a tag")?),
            _ if arg.starts_with('-') => return Err(format!("unknown option {arg}")),
            _ => folders.push(arg),
        }
    }
    let targets = match tag {
        Some(tag) => {
            let (folder, version) = pack::folder_of_tag(&root, &tag)?;
            let manifest = pack::Manifest::read(&root.join(&folder))?;
            if manifest.version != version {
                return Err(format!(
                    "tag {tag} says {version} but {folder}/vorn-extension.toml says {}",
                    manifest.version
                ));
            }
            vec![folder]
        }
        None if folders.is_empty() => pack::rust_extensions(&root)?,
        None => folders,
    };
    std::fs::create_dir_all(&out).map_err(|e| format!("{}: {e}", out.display()))?;
    for folder in targets {
        let packed = pack::build_and_pack(&root, Path::new(&folder), &out)?;
        println!("{}  {}", packed.sha256, packed.file.display());
    }
    Ok(())
}
