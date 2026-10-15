import { defineConnector, type ConnectorItem, type FetchContext } from '@vornrun/connector-sdk'
import { Client } from '@notionhq/client'
import {
  MAX_BLOCKS_PER_CREATE,
  MAX_PAGE_SIZE,
  NOTION_VERSION,
  assertKnownProperties,
  findStatusProperty,
  markdownToBlocks,
  normalizeId,
  pageProperties,
  pageTitle,
  pageUrl,
  parseJsonArg,
  queryDataSource,
  resolveDataSource,
  richText,
  statusGroups,
  withExplanation,
  type DataSourceRef,
  type NotionApi,
  type NotionPage
} from './client'

const DEFAULT_LIMIT = MAX_PAGE_SIZE

/** Builds the API surface for a token. Replaced in tests. */
export type CreateApi = (token: string) => NotionApi

export interface NotionConnectorOptions {
  version?: string
  /** Injected in tests, so nothing reaches the network. */
  createApi?: CreateApi
}

/**
 * The real client, exported so a test can assert the version pin actually
 * reaches it without any test having to make a network call.
 */
export const defaultCreateApi: CreateApi = (token) =>
  new Client({ auth: token, notionVersion: NOTION_VERSION }) as unknown as NotionApi

function required(config: Record<string, unknown>, key: string, env: string): string {
  const value = String(config[key] ?? '').trim()
  if (!value) throw new Error(`${env} is required`)
  return value
}

/** Trim an argument, treating blank as absent. */
function text(value: unknown): string | undefined {
  const trimmed = String(value ?? '').trim()
  return trimmed === '' ? undefined : trimmed
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE)
}

/**
 * Whatever the data source calls its title property.
 *
 * Falls back to `title` so a partial schema still produces a request Notion can
 * reject on its own terms rather than one we refused to build.
 */
function titlePropertyName(schema: Record<string, unknown>): string {
  return (
    Object.entries(schema).find(([, p]) => (p as { type?: string })?.type === 'title')?.[0] ??
    'title'
  )
}

export function createNotionConnector(options: NotionConnectorOptions = {}) {
  const createApi = options.createApi ?? defaultCreateApi

  /**
   * Resolved data sources, keyed by the configured ids.
   *
   * Resolution is one or two network round trips that cannot change between
   * polls for a given database, so it is cached the way `ado` caches
   * its connection. Keyed by token as well, because one process can serve more
   * than one connection.
   */
  const sourceCache = new Map<string, Promise<DataSourceRef>>()

  async function source(config: Record<string, unknown>): Promise<{
    api: NotionApi
    ref: DataSourceRef
  }> {
    const token = required(config, 'token', 'NOTION_TOKEN')
    const databaseId = required(config, 'databaseId', 'NOTION_DATABASE_ID')
    const dataSourceId = text(config.dataSourceId)
    const api = createApi(token)
    const key = `${token}\u0000${databaseId}\u0000${dataSourceId ?? ''}`

    let pending = sourceCache.get(key)
    if (!pending) {
      pending = resolveDataSource(api, {
        databaseId,
        ...(dataSourceId && { dataSourceId })
      })
      // A failed resolution must not be remembered: the usual cause is that
      // nobody has shared the database yet, and that is fixed in Notion's UI
      // without restarting the connector.
      pending.catch(() => sourceCache.delete(key))
      sourceCache.set(key, pending)
    }
    return { api, ref: await pending }
  }

  function pageToItem(
    page: NotionPage,
    statusProperty: string | undefined,
    groups: Record<string, string>
  ): ConnectorItem {
    const properties = pageProperties(page)
    const rawStatus = statusProperty ? properties[statusProperty] : undefined
    const status = typeof rawStatus === 'string' ? rawStatus : ''
    const title = pageTitle(page)

    return {
      // The page id, not the title or URL slug: it is stable across renames
      // and moves, and both of the others are not.
      externalId: page.id,
      url: pageUrl(page),
      title: title || '(untitled)',
      status,
      ...(page.last_edited_time && { updatedAt: page.last_edited_time }),
      data: {
        createdAt: page.created_time ?? '',
        // The group behind the status option, so a workflow can branch on it
        // when a team's option names are not in statusMapping.
        statusGroup: groups[status] ?? '',
        properties
      }
    }
  }

  async function fetchPages(context: FetchContext): Promise<ConnectorItem[]> {
    const config = context.config as Record<string, unknown>
    const { api, ref } = await source(config)
    const limit = positiveInt(config.limit, DEFAULT_LIMIT)
    const rawFilter = text(config.filter)

    const result = await queryDataSource(api, {
      dataSourceId: ref.id,
      ...(context.since && { since: context.since }),
      ...(rawFilter && { filter: parseJsonArg(rawFilter, 'NOTION_FILTER') }),
      limit: Math.min(limit, context.limit ?? limit)
    })

    if (result.truncated) {
      // Visible, because a silently short trigger reads as data loss later.
      console.warn(
        'Notion stopped at its 10,000-result ceiling for this query, so older pages ' +
          'were not returned. Narrow NOTION_FILTER, or wait for the watermark to ' +
          'shrink the result set.'
      )
    }

    const statusProperty = findStatusProperty(ref.properties, text(config.statusProperty))
    const groups = statusGroups(ref.properties, statusProperty)
    return result.pages.map((page) => pageToItem(page, statusProperty, groups))
  }

  return defineConnector({
    id: 'notion',
    name: 'Notion',
    ...(options.version && { version: options.version }),
    description: 'Trigger workflows from Notion database pages, and create or update them.',
    // Notion's own mark.
    icon: {
      viewBox: '0 0 24 24',
      paths: [
        'M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466z',
        'M5.25 8.058v13.904c0 .747.373 1.027 1.214.98L20.99 22.1c.841-.046.935-.56.935-1.167V7.122c0-.606-.233-.933-.748-.887l-14.7.855c-.56.047-.746.327-.746.933zm14.28.7c.093.42 0 .84-.42.888l-.68.135v9.966c-.59.317-1.132.498-1.588.498-.727 0-.909-.227-1.453-.907l-4.451-6.992v6.765l1.408.317s0 .816-1.136.816l-3.132.181c-.09-.181 0-.635.317-.726l.818-.226V9.801L8.06 9.71c-.09-.42.137-1.021.784-1.067l3.359-.227 4.678 7.148V9.393l-1.181-.136c-.091-.5.273-.863.727-.908z'
      ]
    },
    auth: { rung: 'key', keys: ['token'] },
    config: [
      {
        key: 'token',
        env: 'NOTION_TOKEN',
        label: 'Notion integration token',
        // Stored encrypted by Vorn and never printed by the CLI.
        secret: true,
        required: true,
        description:
          'An internal integration token or personal API key from notion.so/profile/integrations. ' +
          'There is no Notion CLI to sign in with.'
      },
      {
        key: 'databaseId',
        env: 'NOTION_DATABASE_ID',
        label: 'Database',
        required: true,
        description: 'Paste the database URL, or the 32-character id from it.'
      },
      {
        key: 'dataSourceId',
        env: 'NOTION_DATA_SOURCE_ID',
        label: 'Data source',
        description:
          'Only needed when the database has more than one data source. Blank resolves it.'
      },
      {
        key: 'filter',
        env: 'NOTION_FILTER',
        label: 'Filter',
        description: "A JSON filter in Notion's own syntax, ANDed with the poll watermark."
      },
      {
        key: 'statusProperty',
        env: 'NOTION_STATUS_PROPERTY',
        label: 'Status property',
        description:
          'Name of the property carrying status. Blank uses the first status, then select, property.'
      },
      {
        key: 'limit',
        env: 'NOTION_LIMIT',
        label: 'Maximum per poll',
        default: String(DEFAULT_LIMIT)
      }
    ],
    triggers: [
      {
        type: 'pageChanged',
        label: 'A page is created or changed',
        description:
          'Fires once per page in the database that Vorn has not seen at this time. ' +
          'Deleted and moved pages produce no event — polling only sees what still matches.',
        // Every Notion page carries last_edited_time, and the query endpoint can
        // both filter and sort on it, so the watermark advances on that rather
        // than re-reading the database.
        dedupe: 'timestamp',
        // Notion has no fixed workflow states: a status property's options are
        // user-defined. These are the names teams actually use; anything else
        // falls back to data.statusGroup. Without them every page imports as
        // todo, including work closed a year ago.
        statusMapping: [
          { upstream: 'Not started', suggestedLocal: 'todo' },
          { upstream: 'To-do', suggestedLocal: 'todo' },
          { upstream: 'Backlog', suggestedLocal: 'todo' },
          { upstream: 'In progress', suggestedLocal: 'in_progress' },
          { upstream: 'In review', suggestedLocal: 'in_review' },
          { upstream: 'Doing', suggestedLocal: 'in_progress' },
          { upstream: 'Done', suggestedLocal: 'done' },
          { upstream: 'Complete', suggestedLocal: 'done' },
          { upstream: 'Shipped', suggestedLocal: 'done' },
          { upstream: 'Cancelled', suggestedLocal: 'cancelled' },
          { upstream: 'Archived', suggestedLocal: 'cancelled' }
        ],
        defaultWorkflow: { name: 'Notion: database pages', defaultCronFromMinutes: 5 },
        fetch: fetchPages
      }
    ],
    actions: [
      {
        type: 'createPage',
        label: 'Create a page',
        description: 'Add a page to the configured data source.',
        // Notion offers no client-supplied idempotency key, so two calls make
        // two pages and a retrying agent has no way to know otherwise.
        idempotent: false,
        inputs: [
          { key: 'title', label: 'Title', required: true },
          { key: 'markdown', label: 'Body', description: 'Paragraphs and # headings.' },
          {
            key: 'properties',
            label: 'Properties',
            description: 'JSON object of Notion property values, in the API’s own shape.'
          }
        ],
        outputs: [
          { key: 'id', description: 'The new page id' },
          { key: 'url', description: 'Where to open it' }
        ],
        async run(args, { config }) {
          const cfg = config as Record<string, unknown>
          const { api, ref } = await source(cfg)
          const title = text(args.title)
          if (!title) throw new Error('title is required')

          const properties: Record<string, unknown> = {}
          const raw = text(args.properties)
          if (raw) Object.assign(properties, parseJsonArg(raw, 'properties'))
          assertKnownProperties(ref.properties, properties)

          const titleProperty = titlePropertyName(ref.properties)
          properties[titleProperty] = { title: richText(title) }

          const markdown = text(args.markdown)
          const children = markdown ? markdownToBlocks(markdown) : []
          if (children.length > MAX_BLOCKS_PER_CREATE) {
            // Refused rather than truncated: silently dropping the back half of
            // somebody's document is the worse failure.
            throw new Error(
              `markdown is ${children.length} blocks and Notion accepts at most ` +
                `${MAX_BLOCKS_PER_CREATE} in one create. Shorten it, or append the rest ` +
                'in a later step.'
            )
          }

          const page = (await withExplanation('page create', () =>
            api.pages.create({
              // A data source parent, not a database one: the post-2025-09-03
              // model rejects database_id here.
              parent: { data_source_id: ref.id },
              properties,
              ...(children.length > 0 && { children })
            })
          )) as { id: string; url?: string }

          // Notion may answer with {object, id} alone, so the URL is derived
          // rather than read off a field that may not be there.
          return { id: page.id, url: pageUrl(page) }
        }
      },
      {
        type: 'updatePage',
        label: 'Update a page',
        description: 'Set properties on an existing page.',
        // Setting the same properties to the same values lands the page in the
        // same state, so a retry is safe.
        idempotent: true,
        inputs: [
          { key: 'pageId', label: 'Page', required: true, description: 'Page URL or id.' },
          { key: 'title', label: 'Title' },
          {
            key: 'properties',
            label: 'Properties',
            description: 'JSON object of Notion property values.'
          }
        ],
        outputs: [{ key: 'url', description: 'Where to open it' }],
        async run(args, { config }) {
          const cfg = config as Record<string, unknown>
          const { api, ref } = await source(cfg)
          const pageId = normalizeId(text(args.pageId) ?? '', 'pageId')

          const properties: Record<string, unknown> = {}
          const raw = text(args.properties)
          if (raw) Object.assign(properties, parseJsonArg(raw, 'properties'))
          assertKnownProperties(ref.properties, properties)

          const title = text(args.title)
          if (title) {
            const titleProperty = titlePropertyName(ref.properties)
            properties[titleProperty] = { title: richText(title) }
          }
          // An empty patch would report success having changed nothing, which
          // reads as a working step in a workflow that is silently a no-op.
          if (Object.keys(properties).length === 0) {
            throw new Error('Nothing to update: pass title, properties, or both.')
          }

          const page = (await withExplanation(`page ${pageId}`, () =>
            api.pages.update({ page_id: pageId, properties })
          )) as { id: string; url?: string }
          return { url: pageUrl({ id: pageId, ...(page.url && { url: page.url }) }) }
        }
      },
      {
        type: 'findPages',
        label: 'Find pages',
        description: 'Query the configured data source and return the pages it matches.',
        // A read. Repeating it changes nothing.
        idempotent: true,
        inputs: [
          {
            key: 'filter',
            label: 'Filter',
            description: "A JSON filter in Notion's own syntax."
          },
          { key: 'limit', label: 'Maximum results', type: 'number' }
        ],
        outputs: [
          { key: 'count', type: 'number', description: 'How many pages came back' },
          { key: 'pages', description: 'id, url, title and status for each' },
          {
            key: 'truncated',
            type: 'boolean',
            description: 'True when Notion hit its 10,000-result ceiling'
          }
        ],
        async run(args, { config }) {
          const cfg = config as Record<string, unknown>
          const { api, ref } = await source(cfg)
          const raw = text(args.filter)
          const result = await queryDataSource(api, {
            dataSourceId: ref.id,
            ...(raw && { filter: parseJsonArg(raw, 'filter') }),
            limit: positiveInt(args.limit, positiveInt(cfg.limit, DEFAULT_LIMIT))
          })

          const statusProperty = findStatusProperty(ref.properties, text(cfg.statusProperty))
          const pages = result.pages.map((page) => {
            const properties = pageProperties(page)
            const status = statusProperty ? properties[statusProperty] : null
            return {
              id: page.id,
              url: pageUrl(page),
              title: pageTitle(page),
              status: typeof status === 'string' ? status : null
            }
          })
          // Reported rather than swallowed, so a step that got a short list can
          // tell it apart from a step that matched nothing.
          return { count: pages.length, pages, truncated: result.truncated }
        }
      }
    ]
  })
}
