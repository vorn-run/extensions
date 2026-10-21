/**
 * The extensions this repository holds: each top-level folder whose
 * package.json says what it is under "vorn".
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export function extensionDirs(root = process.cwd()) {
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => e.name)
    .filter((name) => {
      const pkg = join(root, name, 'package.json')
      return existsSync(pkg) && JSON.parse(readFileSync(pkg, 'utf8')).vorn !== undefined
    })
    .sort()
}

/** A folder whose subfolders are extensions of their own, as `tools/pack` reads them. */
const GROUPS = ['adapters']

/**
 * The extensions written in Rust: each folder with a vorn-extension.toml and
 * no package.json, top level or under a group. `tools/pack` builds and packs
 * them; npm never sees them.
 */
export function rustExtensionDirs(root = process.cwd()) {
  const isRust = (dir) =>
    existsSync(join(root, dir, 'vorn-extension.toml')) && !existsSync(join(root, dir, 'package.json'))
  const found = []
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules') continue
    if (GROUPS.includes(e.name)) {
      for (const sub of readdirSync(join(root, e.name), { withFileTypes: true })) {
        if (sub.isDirectory() && isRust(`${e.name}/${sub.name}`)) found.push(`${e.name}/${sub.name}`)
      }
    } else if (isRust(e.name)) {
      found.push(e.name)
    }
  }
  return found.sort()
}
