#!/usr/bin/env node
/**
 * Build each extension's folder into what Vorn installs from git: beside
 * its sources, <id>/vorn-extension.toml and one bundled <id>/index.js, with
 * the receipt of its checks (verified.json) already there. Vorn installs a
 * folder of this repository as the catalog names it: git and path = <id>.
 *
 * The manifest comes from the connector's code, and the hosts it reaches
 * from its package.json, under "vorn": "hosts" and "hostsFrom".
 *
 *   node scripts/build-extensions.mjs           build every folder
 *   node scripts/build-extensions.mjs rss ado   build these
 *   node scripts/build-extensions.mjs --check   fail when a committed build is stale
 *
 * Every package must be built first (`yarn build`).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { formatFindings, packConnector } from '@vornrun/connector-sdk'
import { extensionDirs } from './extensions.mjs'

const root = resolve(import.meta.dirname, '..')
const checking = process.argv.includes('--check')
const named = process.argv.slice(2).filter((a) => !a.startsWith('--'))
/** What the build writes into a folder; the rest of it is the extension's sources. */
const BUILT = ['index.js', 'vorn-extension.toml']

const dirs = extensionDirs(root).filter((d) => named.length === 0 || named.includes(d))

let failed = false
for (const dir of dirs) {
  const pkg = join(root, dir)
  const built = join(pkg, 'dist', 'index.js')
  if (!existsSync(built)) {
    console.error(`${dir} is not built — run \`yarn build\` first`)
    failed = true
    continue
  }
  const module = await import(pathToFileURL(built).href)
  const connector = Object.values(module).find((v) => v && typeof v === 'object' && 'triggers' in v)
  if (connector.id !== dir) {
    console.error(`${dir} holds the connector ${connector.id}; a folder is named by its id`)
    failed = true
    continue
  }
  const outDir = checking ? mkdtempSync(join(tmpdir(), 'vorn-extensions-')) : root
  const result = await packConnector(connector, { entry: './dist/index.js', resolveDir: pkg, outDir })
  const errors = result.findings.filter((f) => f.level === 'error')
  if (!result.dir) {
    console.error(`${dir}: ${formatFindings(errors)}`)
    failed = true
    continue
  }
  if (checking) {
    for (const name of BUILT) {
      const fresh = readFileSync(join(result.dir, name))
      const committed = existsSync(join(pkg, name)) ? readFileSync(join(pkg, name)) : Buffer.alloc(0)
      if (!fresh.equals(committed)) {
        console.error(`${dir}/${name} is stale — run \`node scripts/build-extensions.mjs ${dir}\` and commit it.`)
        failed = true
      }
    }
    rmSync(outDir, { recursive: true, force: true })
  } else {
    console.log(`${dir}: ${connector.version}, ${Math.round(result.bytes / 1024)} KB`)
  }
}
process.exit(failed ? 1 : 0)
