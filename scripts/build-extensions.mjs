#!/usr/bin/env node
/**
 * Build each connector as the folder Vorn installs from git:
 * extensions/<id>/ holds its vorn-extension.toml, one bundled index.js, the
 * receipt of its checks (verified.json) and its README. A folder is what the
 * connector's own repository holds, so it can move to one as it is.
 *
 * The manifest comes from the connector's code, and the hosts it reaches
 * from its package.json, under "vorn": "hosts" and "hostsFrom".
 *
 *   node scripts/build-extensions.mjs           build every folder
 *   node scripts/build-extensions.mjs rss ado   build these
 *   node scripts/build-extensions.mjs --check   fail when a committed folder is stale
 *
 * Every package must be built first (`yarn build`).
 */
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { formatFindings, packConnector } from '@vornrun/connector-sdk'

const root = resolve(import.meta.dirname, '..')
const OUT = join(root, 'extensions')
const checking = process.argv.includes('--check')
const named = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const dirs = readdirSync(join(root, 'packages'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && (named.length === 0 || named.includes(e.name)))
  .map((e) => e.name)
  .sort()

/** Every file of a folder and its bytes, to compare a fresh build with the committed one. */
function snapshot(dir) {
  if (!existsSync(dir)) return new Map()
  const files = readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile())
  return new Map(files.map((e) => [join(e.parentPath, e.name).slice(dir.length), readFileSync(join(e.parentPath, e.name))]))
}

function same(a, b) {
  if (a.size !== b.size) return false
  for (const [name, bytes] of a) if (!b.get(name)?.equals(bytes)) return false
  return true
}

let failed = false
for (const dir of dirs) {
  const pkg = join(root, 'packages', dir)
  const built = join(pkg, 'dist', 'index.js')
  if (!existsSync(built)) {
    console.error(`packages/${dir} is not built — run \`yarn build\` first`)
    failed = true
    continue
  }
  const module = await import(pathToFileURL(built).href)
  const connector = Object.values(module).find((v) => v && typeof v === 'object' && 'triggers' in v)
  const outDir = checking ? mkdtempSync(join(tmpdir(), 'vorn-extensions-')) : OUT
  const result = await packConnector(connector, { entry: './dist/index.js', resolveDir: pkg, outDir })
  const errors = result.findings.filter((f) => f.level === 'error')
  if (!result.dir) {
    console.error(`${dir}: ${formatFindings(errors)}`)
    failed = true
    continue
  }
  copyFileSync(join(pkg, 'README.md'), join(result.dir, 'README.md'))
  if (checking) {
    const fresh = snapshot(result.dir)
    const committed = snapshot(join(OUT, connector.id))
    if (!same(fresh, committed)) {
      console.error(`extensions/${connector.id} is stale — run \`node scripts/build-extensions.mjs ${dir}\` and commit it.`)
      failed = true
    }
    rmSync(outDir, { recursive: true, force: true })
  } else {
    console.log(`extensions/${connector.id}: ${connector.version}, ${Math.round(result.bytes / 1024)} KB`)
  }
}
process.exit(failed ? 1 : 0)
