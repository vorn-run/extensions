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
