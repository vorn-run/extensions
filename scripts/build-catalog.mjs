#!/usr/bin/env node
/**
 * Build catalog.json from what each connector says about itself.
 *
 * The catalog is the only thing the app has before a connector is installed, so
 * it has to carry enough to decide with: what it fires on, what a workflow can
 * ask it to do, what it will want configured. All of that already exists in the
 * connector's own manifest, and a hand-maintained copy of it drifts — a trigger
 * gets renamed and the list keeps advertising the old one.
 *
 * So the manifest is the source, and the parts of a listing a manifest has no
 * opinion about — where it belongs in a list, what to find it by, how it signs
 * in — live in that package's own package.json under "vorn". Nothing about a
 * connector is described anywhere but its own directory.
 *
 * Run with --check to verify the committed file matches, which is what CI does.
 */
import { extensionDirs } from './extensions.mjs'
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { connectorManifest } from '@vornrun/connector-sdk'
import { catalogEntry, readTemplateFiles } from './templates.mjs'

const CATALOG_VERSION = 1
/** Written by `yarn conformance`, committed, and quoted here as the verified badge. */
const RECEIPT_FILE = 'verified.json'
/** The repository Vorn installs a connector from, and the folder `build-extensions.mjs` writes it to. */
const GIT_URL = 'https://github.com/vorn-run/extensions.git'
const FOLDER = (id) => id

/** Trim an action's inputs down to what someone deciding would want to see. */
function summarize(entries) {
  return entries.map((entry) => ({
    type: entry.type,
    label: entry.label,
    ...(entry.description && { description: entry.description })
  }))
}

/**
 * The environment variables a connection will ask for.
 *
 * Taken from the triggers' setup rather than declared again, and de-duplicated
 * because every trigger of a connector reads the same connector-level config.
 */
function requiredEnv(manifest) {
  const seen = new Map()
  for (const trigger of manifest.triggers) {
    for (const variable of trigger.setup?.env ?? []) {
      if (!seen.has(variable.name)) seen.set(variable.name, variable)
    }
  }
  return [...seen.values()].map((variable) => ({
    name: variable.name,
    required: variable.required,
    ...(variable.description && { description: variable.description })
  }))
}

/** A connector's conformance receipt, if it has been run and committed. */
function receiptFor(dir) {
  const path = `${dir}/${RECEIPT_FILE}`
  if (!existsSync(path)) return undefined
  const receipt = JSON.parse(readFileSync(path, 'utf8'))
  return {
    schema: receipt.schema,
    version: receipt.version,
    checkedAt: receipt.checkedAt,
    checks: receipt.checks
  }
}

async function entryFor(dir) {
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'))
  const built = resolve(`${dir}/dist/index.js`)
  if (!existsSync(built)) {
    throw new Error(`${dir} is not built — run \`yarn build\` first`)
  }

  const module = await import(pathToFileURL(built).href)
  const connector = Object.values(module).find(
    (value) => value && typeof value === 'object' && 'id' in value && 'triggers' in value
  )
  if (!connector) throw new Error(`${dir} exports no connector`)

  const manifest = connectorManifest(connector)
  const listing = pkg.vorn ?? {}
  const capabilities = []
  if (manifest.triggers.length > 0) capabilities.push('triggers')
  if (manifest.actions.length > 0) capabilities.push('actions')

  const receipt = receiptFor(dir)

  return {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description ?? '',
    packageName: pkg.name,
    version: pkg.version,
    capabilities,
    ...(listing.category && { category: listing.category }),
    ...(listing.keywords && { keywords: listing.keywords }),
    ...(listing.auth && { auth: listing.auth }),
    // The rung the connector itself declares; the line above is the prose for it.
    ...(manifest.auth?.rung && { authRung: manifest.auth.rung }),
    ...(receipt && { verified: receipt }),
    // Only where the folder is committed: advertising one that is not there
    // would turn an install into a clone that finds nothing.
    ...(existsSync(`${FOLDER(manifest.id)}/vorn-extension.toml`) && {
      git: GIT_URL,
      path: FOLDER(manifest.id)
    }),
    ...(manifest.icon && { icon: manifest.icon }),
    triggers: summarize(manifest.triggers),
    actions: summarize(manifest.actions),
    env: requiredEnv(manifest),
    // What it reaches, so the catalog can say so before anything is installed.
    ...(listing.hosts && { hosts: listing.hosts }),
    ...(listing.hostsFrom && { hostsFrom: listing.hostsFrom })
  }
}

const dirs = extensionDirs()

const connectors = []
for (const dir of dirs) connectors.push(await entryFor(dir))

// Templates ride the same document because the app fetches one file: a second
// URL would be a second thing to be stale, offline, or half-published.
const templates = readTemplateFiles().map((file) => catalogEntry(file.document))

const catalog = JSON.stringify({ version: CATALOG_VERSION, connectors, templates }, null, 2) + '\n'
const summary = `${connectors.length} connector(s), ${templates.length} template(s)`

if (process.argv.includes('--check')) {
  const current = existsSync('catalog.json') ? readFileSync('catalog.json', 'utf8') : ''
  if (current !== catalog) {
    console.error('catalog.json is stale — run `node scripts/build-catalog.mjs` and commit it.')
    process.exit(1)
  }
  console.log(`catalog ok — ${summary}, matching their manifests`)
} else {
  writeFileSync('catalog.json', catalog)
  console.log(`catalog written — ${summary}`)
}
