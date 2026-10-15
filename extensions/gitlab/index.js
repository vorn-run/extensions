import { createRequire as __vornCreateRequire } from 'node:module'
import { fileURLToPath as __vornFileURLToPath } from 'node:url'
import { dirname as __vornDirname } from 'node:path'
const require = __vornCreateRequire(import.meta.url)
const __vorn_filename = __vornFileURLToPath(import.meta.url)
const __vorn_dirname = __vornDirname(__vorn_filename)

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../e4-connectors/packages/connector-sdk/dist/chunk-FC6T7CX2.js
import { builtinModules } from "module";
var LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "[::1]"];
function loopbackEndpoint(env, names, fail = (message) => new Error(message)) {
  const url = env[names.urlVar]?.trim();
  const token = env[names.tokenVar]?.trim();
  if (!url || !token) throw fail(names.missing);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw fail(`${names.urlVar} is ${JSON.stringify(url)}, which is not a URL`);
  }
  if (parsed.protocol !== "http:" || !LOOPBACK_HOSTS.includes(parsed.hostname)) {
    throw fail(
      `${names.urlVar} is ${JSON.stringify(url)}; ${names.served}, over http on ${LOOPBACK_HOSTS.join(", ")}`
    );
  }
  return { url: url.replace(/\/$/, ""), token };
}
var BROWSER_HOST_ENV = "VORN_BROWSER_HOST";
var BROWSER_TOKEN_ENV = "VORN_BROWSER_TOKEN";
var SESSION_CALL_HEADER = "x-vorn-session-call";
var SessionUnavailableError = class extends Error {
  /** Asking again cannot bring the window back, so the SDK's retries let this through at once. */
  retryable = false;
  constructor(message) {
    super(message);
    this.name = "SessionUnavailableError";
  }
};
var SessionRefusedError = class extends Error {
  retryable = false;
  constructor(message) {
    super(message);
    this.name = "SessionRefusedError";
  }
};
var SESSION_TIMEOUT_MS = 45e3;
var NULL_BODY_STATUSES = /* @__PURE__ */ new Set([204, 205, 304]);
function readReply(text22) {
  let parsed;
  try {
    parsed = JSON.parse(text22);
  } catch {
    throw new Error("The signed-in window answered with a body that is not JSON");
  }
  const reply2 = parsed;
  if (!parsed || typeof parsed !== "object" || typeof reply2.status !== "number") {
    throw new Error("The signed-in window answered without a status");
  }
  return reply2;
}
var refusal = (text22) => text22.trim() || void 0;
function createSessionFetch(options = {}) {
  const env = options.env ?? process.env;
  const call = options.fetchImpl ?? fetch;
  return (async (input, init) => {
    const { url, token } = loopbackEndpoint(
      env,
      {
        urlVar: BROWSER_HOST_ENV,
        tokenVar: BROWSER_TOKEN_ENV,
        missing: `This connector acts through a signed-in Vorn window; run it from Vorn, which sets ${BROWSER_HOST_ENV}`,
        served: "the endpoint is served on this machine"
      },
      (message) => new SessionUnavailableError(message)
    );
    const request = new Request(input, init);
    const body = request.body ? await request.text() : void 0;
    const answer = await call(`${url}/fetch`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...options.call && { [SESSION_CALL_HEADER]: options.call }
      },
      body: JSON.stringify({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers),
        ...body !== void 0 && { body },
        binaryBody: true
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(SESSION_TIMEOUT_MS)])
    });
    const text22 = await answer.text();
    if (answer.status === 503) {
      throw new SessionUnavailableError(
        refusal(text22) ?? "Vorn could not reach the signed-in window"
      );
    }
    if (!answer.ok) {
      throw new SessionRefusedError(
        refusal(text22) ?? `The signed-in window refused the call with HTTP ${answer.status}`
      );
    }
    const reply2 = readReply(text22);
    const content = reply2.bodyBase64 !== void 0 ? Buffer.from(reply2.bodyBase64, "base64") : reply2.body ?? "";
    return new Response(NULL_BODY_STATUSES.has(reply2.status) ? null : content, {
      status: reply2.status,
      ...reply2.headers && { headers: reply2.headers }
    });
  });
}
var PROTOCOL_VERSION = 1;
var MAX_FRAME_BYTES = 16 * 1024 * 1024;
var PROTOCOL_METHODS = {
  hello: "vorn/hello",
  manifest: "connector/manifest",
  preflight: "connector/preflight",
  options: "connector/options",
  poll: "trigger/poll",
  action: "action/run",
  footer: "extension/footer",
  handler: "extension/handler"
};
var PROTOCOL_ERROR_CODES = {
  methodNotFound: -32601,
  invalidParams: -32602,
  connectorError: -32e3,
  unsupportedProtocol: -32001,
  beforeHello: -32002
};
var RETRYABLE_STATUS = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504]);
var DEFAULT_ATTEMPTS = 3;
var DEFAULT_BASE_DELAY_MS = 250;
var DEFAULT_MAX_DELAY_MS = 3e4;
var MAX_ATTEMPTS = 10;
var MAX_TOTAL_WAIT_MS = 12e4;
var wait = (ms) => new Promise((resolve4) => {
  setTimeout(resolve4, ms);
});
function retryAfterMs(header, now) {
  if (!header) return void 0;
  const trimmed = header.trim();
  if (trimmed === "") return void 0;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return void 0;
  return Math.max(0, at - now);
}
function backoffMs(attempt, policy = {}) {
  const base = policy.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const max = policy.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  return Math.min(max, base * 2 ** attempt);
}
function isFinal(error) {
  return error?.retryable === false;
}
function resilientFetch(options) {
  const attempts = Math.min(MAX_ATTEMPTS, Math.max(1, options.retry?.attempts ?? DEFAULT_ATTEMPTS));
  const sleep = options.sleep ?? wait;
  const ceiling = options.retry?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const send = async (input, init) => {
    let waited = 0;
    const pause = async (ms) => {
      if (waited + ms > MAX_TOTAL_WAIT_MS) return false;
      waited += ms;
      await sleep(ms);
      return true;
    };
    for (let attempt = 0; attempt < attempts; attempt++) {
      const last = attempt === attempts - 1;
      try {
        const response = await options.fetchImpl(input, init);
        if (!RETRYABLE_STATUS.has(response.status)) return response;
        if (!options.retryable || last) return response;
        const asked = retryAfterMs(response.headers.get("retry-after"), Date.now());
        const delay = asked === void 0 ? backoffMs(attempt, options.retry) : Math.min(asked, ceiling);
        if (!await pause(delay)) return response;
      } catch (error) {
        if (!options.retryable || last || isFinal(error)) throw error;
        if (!await pause(backoffMs(attempt, options.retry))) throw error;
      }
    }
    throw new Error("Request was never attempted");
  };
  return send;
}
var ActionArgumentError = class extends Error {
  field;
  constructor(field, message) {
    super(message);
    this.name = "ActionArgumentError";
    this.field = field;
  }
};
var UpstreamStatusError = class extends Error {
  status;
  viaSession;
  constructor(status, message, viaSession = false) {
    super(message);
    this.name = "UpstreamStatusError";
    this.status = status;
    this.viaSession = viaSession;
  }
};
var UnknownNameError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "UnknownNameError";
  }
};
var messageOf = (error) => error instanceof Error ? error.message : String(error);
function* causes(error) {
  let at = error;
  for (let depth = 0; at !== void 0 && depth < 8; depth++) {
    yield at;
    at = at instanceof Error ? at.cause : void 0;
  }
}
function protocolError(error) {
  const failed = (data) => ({
    code: PROTOCOL_ERROR_CODES.connectorError,
    message: messageOf(error),
    data
  });
  for (const at of causes(error)) {
    if (at instanceof ActionArgumentError) return failed({ kind: "validation", field: at.field });
    if (at instanceof SessionUnavailableError) {
      return failed({ kind: "app-offline", retryable: false });
    }
    if (at instanceof UpstreamStatusError) {
      if (at.viaSession && (at.status === 401 || at.status === 403)) {
        return failed({ kind: "signed-out", retryable: false });
      }
      return failed({ kind: "upstream", retryable: RETRYABLE_STATUS.has(at.status) });
    }
  }
  return failed({ kind: "internal" });
}
var ORIGIN_PATTERN = /^https:\/\/(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
function withinOrigins(origins, url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.port !== "") return false;
  const target = parsed.hostname.toLowerCase();
  return origins.some((origin) => {
    if (!ORIGIN_PATTERN.test(origin)) return false;
    const wildcard = origin.startsWith("https://*.");
    const host = origin.slice(wildcard ? "https://*.".length : "https://".length).toLowerCase();
    return wildcard ? target.endsWith(`.${host}`) : target === host;
  });
}
var FORBIDDEN_SESSION_HEADERS = /* @__PURE__ */ new Set([
  "cookie",
  "cookie2",
  "authorization",
  "host",
  "origin",
  "referer",
  "content-length"
]);
var HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;
function allowedSessionHeader(name) {
  const lower = name.toLowerCase();
  return HEADER_NAME.test(name) && !FORBIDDEN_SESSION_HEADERS.has(lower) && !lower.startsWith("sec-") && !lower.startsWith("proxy-");
}
var UNSAFE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function isRecord(value2) {
  return typeof value2 === "object" && value2 !== null && !Array.isArray(value2);
}
function segments(path) {
  return path.split(".").map((part) => part.trim()).filter((part) => part !== "");
}
function valueAt(value2, path) {
  let current = value2;
  for (const key2 of segments(path)) {
    if (UNSAFE_KEYS.has(key2)) return void 0;
    if (Array.isArray(current)) {
      const index = Number(key2);
      if (!Number.isInteger(index)) return void 0;
      current = current[index];
      continue;
    }
    if (!isRecord(current)) return void 0;
    current = Object.prototype.hasOwnProperty.call(current, key2) ? current[key2] : void 0;
  }
  return current;
}
function withValueAt(value2, path, next) {
  const keys = segments(path);
  if (keys.length === 0) return next;
  const [head, ...rest] = keys;
  if (UNSAFE_KEYS.has(head)) return value2;
  if (Array.isArray(value2)) {
    const index = Number(head);
    if (!Number.isInteger(index)) return value2;
    const copy = [...value2];
    copy[index] = rest.length === 0 ? next : withValueAt(copy[index], rest.join("."), next);
    return copy;
  }
  const base = isRecord(value2) ? value2 : {};
  return {
    ...base,
    [head]: rest.length === 0 ? next : withValueAt(base[head], rest.join("."), next)
  };
}
function pick(value2, keys) {
  if (Array.isArray(value2)) return value2.map((entry) => pick(entry, keys));
  if (!isRecord(value2)) return value2;
  const out = {};
  for (const key2 of keys) {
    if (UNSAFE_KEYS.has(key2)) continue;
    if (Object.prototype.hasOwnProperty.call(value2, key2)) out[key2] = value2[key2];
  }
  return out;
}
function rename(value2, from, to) {
  if (Array.isArray(value2)) return value2.map((entry) => rename(entry, from, to));
  if (!isRecord(value2)) return value2;
  if (UNSAFE_KEYS.has(from) || UNSAFE_KEYS.has(to)) return value2;
  if (!Object.prototype.hasOwnProperty.call(value2, from)) return value2;
  const out = {};
  for (const [key2, entry] of Object.entries(value2)) {
    if (key2 === from) out[to] = entry;
    else if (key2 !== to) out[key2] = entry;
  }
  return out;
}
function applyOp(value2, op) {
  if (op.op === "flatten") return valueAt(value2, op.path);
  const target = op.path === void 0 ? value2 : valueAt(value2, op.path);
  if (op.path !== void 0 && target === void 0) return value2;
  let next;
  if (op.op === "pick") next = pick(target, op.keys);
  else if (op.op === "rename") next = rename(target, op.from, op.to);
  else if (op.op === "filter") {
    next = Array.isArray(target) ? target.filter((entry) => isRecord(entry) && valueAt(entry, op.key) === op.equals) : target;
  } else {
    next = Array.isArray(target) ? target.map((entry) => applyPostReceive(entry, op.ops)) : target;
  }
  return op.path === void 0 ? next : withValueAt(value2, op.path, next);
}
function applyPostReceive(value2, ops) {
  return (ops ?? []).reduce(applyOp, value2);
}
var KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
var PATH_DATA_PATTERN = /^[MmZzLlHhVvCcSsQqTtAa0-9\s,.\-+eE]+$/;
var VIEW_BOX_PATTERN = /^-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+$/;
var DEDUPE_STRATEGIES = ["timestamp", "lastItem"];
var AUTH_RUNGS = ["none", "cli", "key", "browser", "oauth"];
var EXTENSION_AGENTS = [
  "claude",
  "copilot",
  "codex",
  "opencode",
  "gemini",
  "shell"
];
var ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
var CONFIG_ROOTED_URL_PATTERN = /^\{\{\s*config\./;
function assertUnique(kind, keys) {
  const seen = /* @__PURE__ */ new Set();
  for (const key2 of keys) {
    if (seen.has(key2)) throw new Error(`Duplicate ${kind} "${key2}"`);
    seen.add(key2);
  }
}
function assertAuth(definition) {
  const auth = definition.auth;
  if (!auth) return;
  const id = definition.id;
  if (!AUTH_RUNGS.includes(auth.rung)) {
    throw new Error(
      `Connector ${id} declares unknown auth rung ${JSON.stringify(auth.rung)}; expected ${AUTH_RUNGS.join(", ")}`
    );
  }
  if (auth.rung === "cli" && !auth.probe?.command?.trim()) {
    throw new Error(`Connector ${id} borrows a CLI login but declares no probe command to ask it`);
  }
  if (auth.rung === "key") {
    const keys = auth.keys ?? [];
    if (keys.length === 0) {
      throw new Error(`Connector ${id} signs in with a key but names no config field holding it`);
    }
    const declared = new Set((definition.config ?? []).map((field) => field.key));
    for (const key2 of keys) {
      if (!declared.has(key2)) {
        throw new Error(`Connector ${id} names auth key "${key2}", which is not a config field`);
      }
    }
  }
  if (auth.rung === "browser") assertBrowserSignIn(id, auth.browser);
  if (auth.rung === "none" || auth.rung === "browser") {
    const secret = (definition.config ?? []).find((field) => field.secret === true);
    if (secret) {
      const claim = auth.rung === "none" ? "needs no sign-in" : "signs in through a Vorn window";
      throw new Error(
        `Connector ${id} claims it ${claim} but declares secret field "${secret.key}"`
      );
    }
  }
}
function assertBrowserSignIn(id, browser) {
  if (!browser) {
    throw new Error(
      `Connector ${id} signs in through a Vorn window but declares no browser sign-in`
    );
  }
  const origins = Array.isArray(browser.origins) ? browser.origins : [];
  const bad = origins.find((origin) => typeof origin !== "string" || !ORIGIN_PATTERN.test(origin));
  if (origins.length === 0 || bad !== void 0) {
    throw new Error(
      `Connector ${id} must name its origins as https://host or https://*.host` + (bad !== void 0 ? `; ${JSON.stringify(bad)} is neither` : "")
    );
  }
  const places = [
    ["sign-in page", browser.signInUrl],
    ["signed-in check", browser.check?.url]
  ];
  for (const [what, url] of places) {
    if (typeof url !== "string" || !withinOrigins(origins, url)) {
      throw new Error(
        `Connector ${id} puts its ${what} ${JSON.stringify(url ?? "")} outside its origins`
      );
    }
  }
  const identity = browser.check?.identity;
  if (!Array.isArray(identity) || identity.some((path) => typeof path !== "string" || !path.trim())) {
    throw new Error(`Connector ${id} must name its identity fields as non-empty strings`);
  }
  const headers = browser.check?.headers;
  if (headers === void 0) return;
  const badHeader = isRecord(headers) ? Object.entries(headers).find(
    ([name, value2]) => typeof value2 !== "string" || !allowedSessionHeader(name)
  ) : void 0;
  if (!isRecord(headers) || badHeader) {
    throw new Error(
      `Connector ${id} may add only plain string headers to its signed-in check` + (badHeader ? `; ${JSON.stringify(badHeader[0])} is not one` : "")
    );
  }
}
function assertIdentity(kind, definition) {
  if (!KEY_PATTERN.test(definition.id ?? "")) {
    throw new Error(`${kind} id "${definition.id}" must start with a letter and be url-safe`);
  }
  if (!definition.name?.trim()) {
    throw new Error(`${kind} ${definition.id} is missing a name`);
  }
  assertIcon(`${kind} ${definition.id}`, definition.icon);
}
function assertIcon(subject, icon2) {
  if (!icon2) return;
  const { viewBox, paths } = icon2;
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error(`${subject} has an icon with no paths`);
  }
  for (const path of paths) {
    if (typeof path !== "string" || !PATH_DATA_PATTERN.test(path)) {
      throw new Error(
        `${subject} has an icon path that is not SVG path data. Only path data is accepted, not markup.`
      );
    }
  }
  if (viewBox !== void 0 && !VIEW_BOX_PATTERN.test(viewBox)) {
    throw new Error(`${subject} has an icon viewBox that is not four numbers`);
  }
}
function envNameFor(key2, explicit) {
  if (explicit) return explicit;
  return key2.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toUpperCase();
}
function defineConnector(definition) {
  assertIdentity("Connector", definition);
  const triggers = definition.triggers ?? [];
  const actions = definition.actions ?? [];
  if (triggers.length === 0 && actions.length === 0) {
    throw new Error(`Connector ${definition.id} declares no triggers and no actions`);
  }
  for (const trigger of triggers) {
    if (!KEY_PATTERN.test(trigger.type ?? "")) {
      throw new Error(`Trigger type "${trigger.type}" must start with a letter and be url-safe`);
    }
    const loose = trigger;
    const declarative = typeof loose.fetch === "function";
    const imperative = typeof loose.poll === "function";
    if (declarative && imperative) {
      throw new Error(`Trigger ${trigger.type} declares both fetch() and poll(); pick one`);
    }
    if (declarative !== (loose.dedupe !== void 0)) {
      throw new Error(
        `Trigger ${trigger.type} needs fetch() and a dedupe strategy together, not one alone`
      );
    }
    if (loose.dedupe !== void 0 && !DEDUPE_STRATEGIES.includes(loose.dedupe)) {
      throw new Error(
        `Trigger ${trigger.type} has unknown dedupe strategy ${JSON.stringify(loose.dedupe)}; expected ${DEDUPE_STRATEGIES.join(" or ")}`
      );
    }
    if (loose.poll !== void 0 && !imperative) {
      throw new Error(`Trigger ${trigger.type} declares poll but it is not a function`);
    }
    if (!declarative && !imperative) {
      throw new Error(`Trigger ${trigger.type} is missing a fetch() or poll() implementation`);
    }
  }
  for (const action of actions) {
    if (!KEY_PATTERN.test(action.type ?? "")) {
      throw new Error(`Action type "${action.type}" must start with a letter and be url-safe`);
    }
    const loose = action;
    const written = typeof loose.run === "function";
    const declared = loose.request !== void 0;
    if (written && declared) {
      throw new Error(`Action ${action.type} declares both run() and a request; pick one`);
    }
    if (!written && !declared) {
      throw new Error(`Action ${action.type} is missing a run() implementation or a request`);
    }
    if (declared) {
      const request = loose.request;
      if (typeof request?.url !== "string" || request.url.trim() === "") {
        throw new Error(`Action ${action.type} declares a request with no URL`);
      }
      const url = request.url.trim();
      if (!ABSOLUTE_URL_PATTERN.test(url) && !CONFIG_ROOTED_URL_PATTERN.test(url)) {
        throw new Error(
          `Action ${action.type} declares the request URL "${url}", which is neither absolute nor rooted in a {{config.\u2026}} value`
        );
      }
    }
    if (!declared && loose.postReceive !== void 0) {
      throw new Error(`Action ${action.type} has postReceive but no request for it to reshape`);
    }
    for (const input of action.inputs ?? []) {
      if (input.loadOptions !== void 0 && definition.options?.[input.loadOptions] === void 0) {
        throw new Error(
          `Action ${action.type} argument "${input.key}" loads options from "${input.loadOptions}", which the connector does not serve`
        );
      }
    }
  }
  assertUnique(
    "trigger",
    triggers.map((trigger) => trigger.type)
  );
  assertUnique(
    "action",
    actions.map((action) => action.type)
  );
  assertUnique(
    "config field",
    (definition.config ?? []).map((field) => field.key)
  );
  assertAuth(definition);
  return {
    ...definition,
    kind: "connector",
    version: definition.version ?? "0.0.0",
    config: definition.config ?? [],
    triggers,
    actions
  };
}
function resolveConfig(connector, env = process.env) {
  const config = {};
  const missing = [];
  for (const field of connector.config) {
    const name = envNameFor(field.key, field.env);
    const value2 = env[name] ?? field.default;
    if (value2 === void 0 || value2 === "") {
      if (field.required) missing.push(`${field.key} (${name})`);
      continue;
    }
    config[field.key] = value2;
  }
  if (missing.length > 0) {
    throw new Error(
      `Connector ${connector.id} is missing required configuration: ${missing.join(", ")}`
    );
  }
  return config;
}
function connectionSetup(connector, triggerType) {
  const trigger = connector.triggers.find((entry) => entry.type === triggerType);
  if (!trigger) {
    throw new Error(`Connector ${connector.id} has no trigger "${triggerType}"`);
  }
  return {
    connectorId: connector.id,
    triggerType,
    env: connector.config.map((field) => ({
      name: envNameFor(field.key, field.env),
      required: field.required === true,
      secret: field.secret === true,
      ...field.description !== void 0 && { description: field.description },
      ...field.builderHint !== void 0 && { builderHint: field.builderHint }
    }))
  };
}
function manifestContributions(connector) {
  const contributes = connector.contributes;
  if (!contributes) return void 0;
  const shared = (contribution) => ({
    id: contribution.id,
    title: contribution.title,
    ...contribution.description !== void 0 && { description: contribution.description },
    ...contribution.when !== void 0 && { when: contribution.when }
  });
  return {
    ...contributes.panes !== void 0 && {
      panes: contributes.panes.map((pane) => ({
        ...shared(pane),
        ...pane.icon !== void 0 && { icon: pane.icon },
        ...pane.web !== void 0 && { web: pane.web },
        ...pane.command !== void 0 && { command: pane.command }
      }))
    },
    ...contributes.footers !== void 0 && {
      footers: contributes.footers.map((footer) => ({ ...shared(footer), every: footer.every }))
    },
    ...contributes.linkHandlers !== void 0 && {
      linkHandlers: contributes.linkHandlers.map((handler) => ({
        ...shared(handler),
        pattern: handler.pattern,
        example: handler.example
      }))
    }
  };
}
function connectorManifest(connector) {
  const contributes = manifestContributions(connector);
  return {
    protocol: PROTOCOL_VERSION,
    id: connector.id,
    name: connector.name,
    version: connector.version,
    kind: connector.kind,
    ...connector.description !== void 0 && { description: connector.description },
    ...connector.icon !== void 0 && { icon: connector.icon },
    ...connector.auth !== void 0 && { auth: connector.auth },
    ...contributes !== void 0 && { contributes },
    ...connector.permissions !== void 0 && { permissions: connector.permissions },
    ...connector.activates !== void 0 && { activates: connector.activates },
    triggers: connector.triggers.map((trigger) => ({
      type: trigger.type,
      label: trigger.label,
      ...trigger.description !== void 0 && { description: trigger.description },
      // Carried through so the app can seed a connection's status mapping and
      // its polling workflow. Absent when the connector said nothing, which is
      // different from saying there is nothing.
      ...trigger.statusMapping !== void 0 && { statusMapping: trigger.statusMapping },
      ...trigger.defaultWorkflow !== void 0 && { defaultWorkflow: trigger.defaultWorkflow },
      setup: connectionSetup(connector, trigger.type)
    })),
    actions: connector.actions.map((action) => ({
      type: action.type,
      label: action.label,
      ...action.description !== void 0 && { description: action.description },
      ...action.idempotent !== void 0 && { idempotent: action.idempotent },
      inputs: (action.inputs ?? []).map((input) => ({
        key: input.key,
        label: input.label,
        type: input.type ?? "string",
        required: input.required === true,
        ...input.description !== void 0 && { description: input.description },
        ...input.options !== void 0 && { options: input.options },
        ...input.loadOptions !== void 0 && { loadOptions: input.loadOptions },
        ...input.builderHint !== void 0 && { builderHint: input.builderHint }
      })),
      ...action.outputs !== void 0 && { outputs: action.outputs },
      ...action.sample !== void 0 && { sample: action.sample }
    }))
  };
}
var RECORDED_CHECKS = [
  "manifest",
  "auth",
  "secrets",
  "actions",
  "dedupe",
  "no-lifecycle-scripts",
  "keywords",
  "no-runtime-deps",
  "mock",
  "live",
  "launch",
  "contributes",
  "footers",
  "handlers",
  "permissions"
];
function selfCheck(manifest, receipt, known) {
  const problems = [];
  const r = receipt;
  if (!r || typeof r !== "object") return ["verified.json is missing or is not an object"];
  if (r.version !== manifest.version) {
    problems.push(
      `verified.json records ${String(r.version)}, and the bundle is ${manifest.version}`
    );
  }
  if (!Array.isArray(r.checks) || r.checks.length === 0) {
    problems.push("verified.json records no checks");
  } else {
    for (const check of r.checks) {
      if (!known.includes(String(check)))
        problems.push(`verified.json records an unknown check ${String(check)}`);
    }
  }
  return problems;
}
function lineReader(onLine, overflow) {
  let pending = [];
  let size = 0;
  return (chunk) => {
    let start = 0;
    for (let end = chunk.indexOf(10); end !== -1; end = chunk.indexOf(10, start)) {
      const part = chunk.subarray(start, end);
      if (size + part.length > MAX_FRAME_BYTES) return overflow();
      const whole = pending.length === 0 ? part : Buffer.concat([...pending, part], size + part.length);
      const line = whole.toString("utf8");
      pending = [];
      size = 0;
      start = end + 1;
      onLine(line.endsWith("\r") ? line.slice(0, -1) : line);
    }
    const rest = chunk.subarray(start);
    size += rest.length;
    if (size > MAX_FRAME_BYTES) return overflow();
    if (rest.length > 0) pending.push(rest);
  };
}
var MAX_PACK_BYTES = 8 * 1024 * 1024;
var MAX_UNPACKED_BYTES = 32 * 1024 * 1024;
var BUILTINS = new Set(builtinModules);
var BEFORE_REGEX = /* @__PURE__ */ new Set(["", ..."(,=:[!&|?{};+-*%~^<>"]);
var HOST_URL_ENV = "VORN_EXTENSION_HOST";
var HOST_TOKEN_ENV = "VORN_EXTENSION_TOKEN";
var PermissionDeniedError = class extends Error {
  constructor(method, detail) {
    super(`The host refused ${method}: ${detail}`);
    this.name = "PermissionDeniedError";
  }
};
var HostReplyError = class extends Error {
  constructor(method, detail) {
    super(`The host answered ${method} with ${detail}`);
    this.name = "HostReplyError";
  }
};
var HOST_TIMEOUT_MS = 15e3;
function endpoint(env) {
  return loopbackEndpoint(env, {
    urlVar: HOST_URL_ENV,
    tokenVar: HOST_TOKEN_ENV,
    missing: `This extension was started without a host bridge; ${HOST_URL_ENV} and ${HOST_TOKEN_ENV} are set by Vorn`,
    served: "the bridge is served on this machine"
  });
}
function createExtensionHost(options) {
  const env = options.env ?? process.env;
  const call = options.fetchImpl ?? fetch;
  async function ask(method, params) {
    const { url, token } = endpoint(env);
    const response = await call(`${url}/${method}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ sessionId: options.sessionId, ...params }),
      signal: AbortSignal.timeout(HOST_TIMEOUT_MS)
    });
    const text22 = await response.text();
    if (response.status === 403) throw new PermissionDeniedError(method, text22 || "not granted");
    if (!response.ok) throw new Error(`The host answered ${method} with HTTP ${response.status}`);
    if (text22 === "") return void 0;
    let parsed;
    try {
      parsed = JSON.parse(text22);
    } catch {
      throw new HostReplyError(method, "a body that is not JSON");
    }
    if (!parsed || typeof parsed !== "object" || !("result" in parsed)) {
      throw new HostReplyError(method, "a body carrying no result");
    }
    return parsed.result;
  }
  return {
    diff: () => ask("diff", {}),
    status: () => ask("status", {}),
    output: (opts) => ask("output", { ...opts?.lines !== void 0 && { lines: opts.lines } }),
    selection: () => ask("selection", {}),
    send: (text22) => ask("send", { text: text22 }),
    rename: (name) => ask("rename", { name }),
    usage: () => ask("usage", {})
  };
}
var RESERVED_KEYS = [
  "externalId",
  "title",
  "url",
  "description",
  "status",
  "labels",
  "assignee",
  "updatedAt"
];
var UNSAFE_KEYS2 = ["__proto__", "constructor", "prototype"];
function itemExternalId(item) {
  return String(item.externalId ?? "").trim();
}
function itemTimestamp(item, fallback) {
  return isoTimestamp(item.updatedAt, fallback);
}
function isoTimestamp(value2, fallback) {
  if (value2 === void 0) return fallback;
  const date = value2 instanceof Date ? value2 : new Date(value2);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid updatedAt: ${String(value2)}`);
  }
  return date.toISOString();
}
function normalizeItem(item, polledAt) {
  const externalId = itemExternalId(item);
  if (!externalId) {
    throw new Error("Connector item is missing externalId");
  }
  if (!item.title || !item.title.trim()) {
    throw new Error(`Connector item ${externalId} is missing title`);
  }
  const extra = {};
  for (const [key2, value2] of Object.entries(item.data ?? {})) {
    if (RESERVED_KEYS.includes(key2)) continue;
    if (UNSAFE_KEYS2.includes(key2)) continue;
    extra[key2] = value2;
  }
  return {
    ...extra,
    externalId,
    title: item.title,
    url: item.url ?? "",
    description: item.description ?? "",
    status: item.status ?? "open",
    labels: item.labels ?? [],
    ...item.assignee !== void 0 && { assignee: item.assignee },
    updatedAt: isoTimestamp(item.updatedAt, polledAt)
  };
}
function normalizeItems(items, polledAt) {
  const seen = /* @__PURE__ */ new Set();
  return items.map((item) => {
    const normalized = normalizeItem(item, polledAt);
    if (seen.has(normalized.externalId)) {
      throw new Error(`Duplicate externalId "${normalized.externalId}" in one poll page`);
    }
    seen.add(normalized.externalId);
    return normalized;
  });
}
var MAX_BOUNDARY_IDS = 500;
function decodeCursor(cursor, strategy) {
  if (!cursor) return void 0;
  let parsed;
  try {
    parsed = JSON.parse(cursor);
  } catch (error) {
    throw new Error(`Cursor is not valid SDK cursor JSON: ${cursor}`, { cause: error });
  }
  const state = parsed;
  if (!state || typeof state !== "object" || state.v !== 1 || state.s !== strategy) {
    throw new Error(`Cursor does not belong to the "${strategy}" strategy: ${cursor}`);
  }
  const wellFormed = state.s === "timestamp" ? typeof state.t === "string" && Array.isArray(state.ids) && state.ids.every((id) => typeof id === "string") : typeof state.id === "string";
  if (!wellFormed) {
    throw new Error(`Cursor is missing the fields the "${strategy}" strategy needs: ${cursor}`);
  }
  return state;
}
function compare(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
function page(chronological, context, hadCursor, nextCursor) {
  const delivered = context.limit === void 0 ? chronological : chronological.slice(0, context.limit);
  if (delivered.length === 0) {
    return { items: [], ...context.cursor !== void 0 && { nextCursor: context.cursor } };
  }
  return {
    items: delivered.map((entry) => entry.item),
    nextCursor: JSON.stringify(nextCursor(delivered)),
    // Only drain a backlog we know we truncated, and only once a cursor
    // exists — a first poll should not pull the source's entire history.
    hasMore: chronological.length > delivered.length && hadCursor
  };
}
function timestampPoll(fetched, state, context, polledAt) {
  const boundary = state?.t ?? context.since;
  const seen = new Set(state?.ids ?? []);
  const fresh = [];
  const pinnedAlreadySeen = [];
  for (const item of fetched) {
    const id = itemExternalId(item);
    const pinned = item.updatedAt === void 0 && boundary !== void 0;
    const at = pinned ? boundary : itemTimestamp(item, polledAt);
    const isNew = boundary === void 0 || at > boundary || at === boundary && !seen.has(id);
    if (isNew) fresh.push({ item, at, id, ...pinned && { pinned: true } });
    else if (pinned) pinnedAlreadySeen.push(id);
  }
  fresh.sort((left, right) => compare(left.at, right.at) || compare(left.id, right.id));
  return page(fresh, context, state !== void 0, (delivered) => {
    const newest = delivered[delivered.length - 1].at;
    const atNewest = [];
    for (let i = delivered.length - 1; i >= 0 && delivered[i].at === newest; i -= 1) {
      atNewest.push(delivered[i].id);
    }
    const carried = newest === boundary ? [...seen, ...atNewest] : [
      ...pinnedAlreadySeen,
      ...delivered.filter((entry) => entry.pinned).map((entry) => entry.id),
      ...atNewest
    ];
    return { v: 1, s: "timestamp", t: newest, ids: carried.slice(-MAX_BOUNDARY_IDS) };
  });
}
function lastItemPoll(fetched, state, context, polledAt) {
  const keyed = fetched.map((item) => ({
    item,
    at: itemTimestamp(item, polledAt),
    id: itemExternalId(item)
  }));
  const stopAt = state ? keyed.findIndex((entry) => entry.id === state.id) : -1;
  const chronological = (stopAt === -1 ? keyed : keyed.slice(0, stopAt)).reverse();
  return page(chronological, context, state !== void 0, (delivered) => ({
    v: 1,
    s: "lastItem",
    id: delivered[delivered.length - 1].id
  }));
}
async function pollWithDedupe(trigger, context) {
  const strategy = trigger.dedupe;
  const fetchItems = trigger.fetch;
  if (!strategy || !fetchItems) {
    throw new Error(`Trigger ${trigger.type} is not a declarative trigger`);
  }
  const polledAt = context.now();
  if (strategy === "lastItem") {
    const state2 = decodeCursor(context.cursor, "lastItem");
    const fetched2 = await runFetch(trigger.type, fetchItems, {
      config: context.config,
      ...state2 && { lastItemId: state2.id },
      ...context.limit !== void 0 && { limit: context.limit },
      now: context.now,
      fetch: context.fetch,
      ...context.session && { session: context.session }
    });
    return lastItemPoll(fetched2, state2, context, polledAt);
  }
  const state = decodeCursor(context.cursor, "timestamp");
  const since = state?.t ?? context.since;
  const fetched = await runFetch(trigger.type, fetchItems, {
    config: context.config,
    ...since !== void 0 && { since },
    ...context.limit !== void 0 && { limit: context.limit },
    now: context.now,
    fetch: context.fetch,
    ...context.session && { session: context.session }
  });
  return timestampPoll(fetched, state, context, polledAt);
}
async function runFetch(type, fetchItems, context) {
  const fetched = await fetchItems(context);
  if (!Array.isArray(fetched)) {
    throw new Error(`Trigger ${type} fetch() did not return an array`);
  }
  return fetched;
}
var MAX_ERROR_BODY = 500;
var PLACEHOLDER = /\{\{\s*(args|config)\.([A-Za-z0-9_.-]+)\s*\}\}/g;
var WHOLE_PLACEHOLDER = /^\{\{\s*(args|config)\.([A-Za-z0-9_.-]+)\s*\}\}$/;
function lookup(source, path, scope) {
  return valueAt(source === "args" ? scope.args : scope.config, path);
}
var intoUrl = (value2, source) => source === "config" ? value2 : encodeURIComponent(value2);
function intoHeader(name) {
  return (value2) => {
    if (/[\r\n]/.test(value2)) {
      throw new Error(`Header "${name}" would carry a line ending, which is not allowed`);
    }
    return value2;
  };
}
function resolveTemplates(value2, scope, substitute) {
  if (typeof value2 === "string") {
    const whole = WHOLE_PLACEHOLDER.exec(value2);
    if (whole) {
      const resolved = lookup(whole[1], whole[2], scope);
      if (substitute === void 0 || resolved === void 0 || resolved === null) return resolved;
      return substitute(String(resolved), whole[1]);
    }
    return value2.replace(PLACEHOLDER, (_match, source, path) => {
      const resolved = lookup(source, path, scope);
      if (resolved === void 0 || resolved === null) return "";
      const text22 = String(resolved);
      return substitute === void 0 ? text22 : substitute(text22, source);
    });
  }
  if (Array.isArray(value2)) return value2.map((entry) => resolveTemplates(entry, scope, substitute));
  if (typeof value2 === "object" && value2 !== null) {
    const out = {};
    for (const [key2, entry] of Object.entries(value2)) {
      out[key2] = resolveTemplates(entry, scope, substitute);
    }
    return out;
  }
  return value2;
}
function resolveHeaders(raw, scope) {
  const out = {};
  for (const [name, value2] of Object.entries(raw ?? {})) {
    const resolved = resolveTemplates(value2, scope, intoHeader(name));
    if (resolved === void 0 || resolved === null || resolved === "") continue;
    out[name] = String(resolved);
  }
  return out;
}
function stringMap(raw) {
  const out = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const [key2, value2] of Object.entries(raw)) {
    if (value2 === void 0 || value2 === null || value2 === "") continue;
    out[key2] = String(value2);
  }
  return out;
}
function resolveRequest(request, scope) {
  const method = (request.method ?? "GET").toUpperCase();
  const rawUrl = resolveTemplates(request.url, scope, intoUrl);
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    throw new Error("Request has no URL once its templates are resolved");
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Request URL is not a URL once its templates are resolved: "${rawUrl}"`);
  }
  for (const [key2, value2] of Object.entries(stringMap(resolveTemplates(request.query, scope)))) {
    url.searchParams.set(key2, value2);
  }
  const headers = resolveHeaders(request.headers, scope);
  const resolved = { url: url.toString(), method, headers };
  if (request.body !== void 0 && method !== "GET" && method !== "HEAD") {
    const body = resolveTemplates(request.body, scope);
    if (body !== void 0) {
      resolved.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!Object.keys(headers).some((key2) => key2.toLowerCase() === "content-type")) {
        resolved.headers["content-type"] = typeof body === "string" ? "text/plain" : "application/json";
      }
    }
  }
  return resolved;
}
async function readBody(response) {
  const text22 = await response.text();
  if (text22 === "") return void 0;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("json")) return text22;
  try {
    return JSON.parse(text22);
  } catch {
    return text22;
  }
}
function describeFailure(response, body) {
  const detail = typeof body === "string" ? body : body === void 0 ? "" : JSON.stringify(body);
  const quoted = detail.length > MAX_ERROR_BODY ? `${detail.slice(0, MAX_ERROR_BODY)}\u2026` : detail;
  return `Request failed with ${response.status} ${response.statusText}${quoted ? `: ${quoted}` : ""}`;
}
async function sendRequest(resolved, options) {
  const response = await options.fetchImpl(resolved.url, {
    method: resolved.method,
    headers: resolved.headers,
    ...resolved.body !== void 0 && { body: resolved.body }
  });
  const body = await readBody(response);
  if (!response.ok) {
    throw new UpstreamStatusError(
      response.status,
      describeFailure(response, body),
      options.viaSession
    );
  }
  return { response, body };
}
function asOutput(value2) {
  if (Array.isArray(value2)) return { items: value2 };
  if (typeof value2 === "object" && value2 !== null) return value2;
  return value2 === void 0 ? {} : { result: value2 };
}
var MAX_REQUEST_PAGES = 100;
var LINK_NEXT = /<([^>]+)>\s*;[^,]*\brel\s*=\s*"?next"?/i;
function nextLink(header) {
  const match = header === null ? null : LINK_NEXT.exec(header);
  return match ? match[1] : void 0;
}
function pageItems(body, itemsPath) {
  const value2 = itemsPath === void 0 ? body : valueAt(body, itemsPath);
  return Array.isArray(value2) ? value2 : void 0;
}
async function collectPages(request, strategy, scope, options) {
  const collected = [];
  const seen = /* @__PURE__ */ new Set();
  let page2 = strategy.kind === "page" ? strategy.startPage ?? 1 : 0;
  let cursor;
  let nextUrl;
  for (let index = 0; index < MAX_REQUEST_PAGES; index++) {
    const resolved = resolveRequest(request, scope);
    if (nextUrl !== void 0) resolved.url = nextUrl;
    if (strategy.kind === "cursor" && cursor !== void 0) {
      const url = new URL(resolved.url);
      url.searchParams.set(strategy.param, cursor);
      resolved.url = url.toString();
    }
    if (strategy.kind === "page") {
      const url = new URL(resolved.url);
      url.searchParams.set(strategy.param, String(page2));
      resolved.url = url.toString();
    }
    if (seen.has(resolved.url)) {
      throw new Error(`Request for ${request.url} asked for the same page twice`);
    }
    seen.add(resolved.url);
    const { response, body } = await sendRequest(resolved, options);
    const items = pageItems(body, strategy.itemsPath);
    if (items === void 0) {
      if (index === 0) {
        const where = strategy.itemsPath === void 0 ? "the response is not a list" : `the response has no list at "${strategy.itemsPath}"`;
        throw new Error(`Cannot page through this request: ${where}`);
      }
      return collected;
    }
    collected.push(...items);
    if (items.length === 0) return collected;
    if (strategy.kind === "cursor") {
      const next = valueAt(body, strategy.cursorPath);
      if (next === void 0 || next === null || next === "") return collected;
      cursor = String(next);
      continue;
    }
    if (strategy.kind === "link") {
      nextUrl = nextLink(response.headers.get("link"));
      if (nextUrl === void 0) return collected;
      continue;
    }
    page2 += 1;
  }
  throw new Error(`Request for ${request.url} exceeded ${MAX_REQUEST_PAGES} pages`);
}
async function executeRequest(request, postReceive, scope, options) {
  if (request.paginate) {
    const items = await collectPages(request, request.paginate, scope, options);
    return asOutput(applyPostReceive(items, postReceive));
  }
  const { body } = await sendRequest(resolveRequest(request, scope), options);
  return asOutput(applyPostReceive(body, postReceive));
}
function wrap(fetchImpl, options, retryable) {
  return resilientFetch({
    fetchImpl,
    retryable,
    ...options.retry !== void 0 && { retry: options.retry },
    ...options.sleep !== void 0 && { sleep: options.sleep }
  });
}
function sessionFor(connector, options, retryable) {
  if (connector.auth?.rung !== "browser") return void 0;
  const fetchImpl = options.sessionFetchImpl ?? createSessionFetch(options.sessionCall ? { call: options.sessionCall } : {});
  return { fetch: wrap(fetchImpl, options, retryable) };
}
async function runPoll(connector, triggerType, options = {}) {
  const trigger = connector.triggers.find((entry) => entry.type === triggerType);
  if (!trigger) {
    throw new UnknownNameError(`${connector.id} has no trigger "${triggerType}"`);
  }
  const now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
  const polledAt = now();
  const session = sessionFor(connector, options, true);
  const context = {
    config: options.config ?? {},
    ...options.since !== void 0 && { since: options.since },
    ...options.cursor !== void 0 && { cursor: options.cursor },
    ...options.limit !== void 0 && { limit: options.limit },
    now,
    // A poll only reads, so every failure it meets is worth trying again.
    fetch: wrap(options.fetchImpl ?? globalThis.fetch, options, true),
    ...session && { session }
  };
  const outcome = typeof trigger.poll === "function" ? await trigger.poll(context) : await pollWithDedupe(trigger, context);
  if (!outcome || !Array.isArray(outcome.items)) {
    throw new Error(`Trigger ${triggerType} did not return an items array`);
  }
  if (outcome.hasMore && !outcome.nextCursor) {
    throw new Error(`Trigger ${triggerType} reported more pages without a nextCursor`);
  }
  return {
    items: normalizeItems(outcome.items, polledAt),
    ...outcome.nextCursor !== void 0 && { nextCursor: outcome.nextCursor },
    hasMore: outcome.hasMore === true
  };
}
var SAFE_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD"]);
async function runOptions(connector, name, options = {}) {
  const loader = connector.options?.[name];
  if (!loader) {
    throw new UnknownNameError(`${connector.id} serves no options set "${name}"`);
  }
  const session = sessionFor(connector, options, true);
  const loaded = await loader({
    config: options.config ?? {},
    now: options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString()),
    fetch: wrap(options.fetchImpl ?? globalThis.fetch, options, true),
    ...session && { session }
  });
  if (!Array.isArray(loaded)) {
    throw new Error(`Options set "${name}" did not return an array`);
  }
  return loaded.map(
    (entry) => typeof entry === "string" ? { value: entry } : { ...entry, value: String(entry.value) }
  );
}
var MAX_QUOTED_VALUE = 80;
function quote(value2) {
  return value2.length > MAX_QUOTED_VALUE ? `${value2.slice(0, MAX_QUOTED_VALUE)}\u2026` : value2;
}
var shown = (value2) => typeof value2 === "string" ? `"${quote(value2)}"` : quote(JSON.stringify(value2) ?? String(value2));
function coerceArg(value2, type) {
  if (type === "number") {
    if (typeof value2 === "number" && Number.isFinite(value2)) return value2;
    const parsed = typeof value2 === "string" ? Number(value2) : Number.NaN;
    if (Number.isNaN(parsed)) throw new Error(`Expected a number, got ${shown(value2)}`);
    return parsed;
  }
  if (type === "boolean") {
    if (typeof value2 === "boolean") return value2;
    if (value2 === "true") return true;
    if (value2 === "false") return false;
    throw new Error(`Expected a boolean, got ${shown(value2)}`);
  }
  if (type === "json") {
    if (typeof value2 !== "string") return value2;
    try {
      return JSON.parse(value2);
    } catch {
      throw new Error(`Expected JSON, got ${shown(value2)}`);
    }
  }
  if (typeof value2 === "string") return value2;
  return typeof value2 === "object" ? JSON.stringify(value2) : String(value2);
}
async function runAction(connector, actionType, args, options = {}) {
  const action = connector.actions.find((entry) => entry.type === actionType);
  if (!action) {
    throw new UnknownNameError(`${connector.id} has no action "${actionType}"`);
  }
  const coerced = { ...args };
  for (const input of action.inputs ?? []) {
    const value2 = coerced[input.key];
    if (value2 === void 0 || value2 === null || value2 === "") {
      if (input.required) {
        throw new ActionArgumentError(input.key, `Action ${actionType} requires "${input.key}"`);
      }
      delete coerced[input.key];
      continue;
    }
    try {
      coerced[input.key] = coerceArg(value2, input.type);
    } catch (error) {
      throw new ActionArgumentError(
        input.key,
        `Action ${actionType} argument "${input.key}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  const config = options.config ?? {};
  const method = (action.request?.method ?? "GET").toUpperCase();
  const retryable = action.idempotent === true || action.request !== void 0 && SAFE_METHODS.has(method);
  const fetchImpl = wrap(options.fetchImpl ?? globalThis.fetch, options, retryable);
  const session = sessionFor(connector, options, retryable);
  if (action.request !== void 0) {
    try {
      return await executeRequest(
        action.request,
        action.postReceive,
        { args: coerced, config },
        { fetchImpl: session?.fetch ?? fetchImpl, viaSession: session !== void 0 }
      );
    } catch (error) {
      throw new Error(
        `Action ${actionType}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }
  if (typeof action.run !== "function") {
    throw new Error(`Action ${actionType} has neither a run() implementation nor a request`);
  }
  const output = await action.run(coerced, {
    config,
    now: options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString()),
    fetch: fetchImpl,
    ...session && { session }
  });
  return output ?? {};
}
var CHECK_SESSION = {
  sessionId: "check",
  worktreePath: process.cwd(),
  agent: "claude"
};
var SDK_VERSION = true ? "0.8.0-beta.12" : "0.0.0-source";
var InvalidParams = class extends Error {
};
function text(params, key2) {
  const value2 = params[key2];
  if (typeof value2 !== "string" || value2 === "") {
    throw new InvalidParams(`"${key2}" must be a non-empty string`);
  }
  return value2;
}
function optionalText(params, key2) {
  const value2 = params[key2];
  if (value2 === void 0 || value2 === null) return void 0;
  if (typeof value2 !== "string") throw new InvalidParams(`"${key2}" must be a string`);
  return value2;
}
function optionalNumber(params, key2) {
  const value2 = params[key2];
  if (value2 === void 0 || value2 === null) return void 0;
  if (typeof value2 !== "number" || !Number.isFinite(value2)) {
    throw new InvalidParams(`"${key2}" must be a number`);
  }
  return value2;
}
function failure(id, error) {
  return { jsonrpc: "2.0", id, error };
}
function refusal2(id, code, message) {
  return failure(id, { code, message });
}
function createConnectorServer(connector, options = {}) {
  let cached = options.config;
  const config = () => cached ??= resolveConfig(connector);
  const now = options.now;
  let greeted = false;
  const runtime = (params) => ({
    config: config(),
    now,
    sessionCall: optionalText(params, "sessionCall")
  });
  const hostFor = (sessionId) => options.host?.(sessionId) ?? createExtensionHost({ sessionId });
  const sessionContext = (params) => {
    const agent = text(params, "agent");
    if (!EXTENSION_AGENTS.includes(agent)) {
      throw new InvalidParams(`"agent" must be one of ${EXTENSION_AGENTS.join(", ")}`);
    }
    const sessionId = text(params, "sessionId");
    return {
      sessionId,
      worktreePath: text(params, "worktreePath"),
      agent,
      host: hostFor(sessionId),
      now: now ?? (() => (/* @__PURE__ */ new Date()).toISOString())
    };
  };
  const methods = {
    [PROTOCOL_METHODS.manifest]: () => connectorManifest(connector),
    // A throw is the connector saying "broken", which must not read as a passing check.
    [PROTOCOL_METHODS.preflight]: async () => {
      if (!connector.preflight) return { ok: null };
      try {
        return { ...await connector.preflight() };
      } catch (error) {
        return { ok: false, message: messageOf(error) };
      }
    },
    [PROTOCOL_METHODS.options]: async (params) => ({
      options: await runOptions(connector, text(params, "name"), runtime(params))
    }),
    [PROTOCOL_METHODS.poll]: (params) => runPoll(connector, text(params, "trigger"), {
      ...runtime(params),
      cursor: optionalText(params, "cursor"),
      since: optionalText(params, "since"),
      limit: optionalNumber(params, "limit")
    }),
    [PROTOCOL_METHODS.action]: (params) => {
      const action = text(params, "action");
      const args = params.args ?? {};
      if (!isRecord(args)) throw new InvalidParams('"args" must be an object');
      return runAction(connector, action, args, runtime(params));
    },
    [PROTOCOL_METHODS.footer]: async (params) => {
      const id = text(params, "footer");
      const footer = connector.contributes?.footers?.find((entry) => entry.id === id);
      if (!footer) throw new InvalidParams(`${connector.id} contributes no footer "${id}"`);
      return { items: await footer.run(sessionContext(params)) };
    },
    [PROTOCOL_METHODS.handler]: async (params) => {
      const id = text(params, "handler");
      const handler = connector.contributes?.linkHandlers?.find((entry) => entry.id === id);
      if (!handler) throw new InvalidParams(`${connector.id} contributes no link handler "${id}"`);
      const context = { ...sessionContext(params), url: text(params, "url") };
      return { ...await handler.run(context) ?? {} };
    }
  };
  const hello = (id, params) => {
    const offered = params.protocols;
    if (!Array.isArray(offered)) {
      return refusal2(id, PROTOCOL_ERROR_CODES.invalidParams, '"protocols" must be a list');
    }
    if (!offered.includes(PROTOCOL_VERSION)) {
      return refusal2(
        id,
        PROTOCOL_ERROR_CODES.unsupportedProtocol,
        `Vorn offers connector protocol ${offered.join(", ") || "none"}; ${connector.id} speaks ${PROTOCOL_VERSION}`
      );
    }
    greeted = true;
    const result = {
      protocol: PROTOCOL_VERSION,
      sdk: { name: "@vornrun/connector-sdk", version: SDK_VERSION },
      connector: { id: connector.id, version: connector.version, kind: connector.kind }
    };
    return { jsonrpc: "2.0", id, result };
  };
  return {
    async handle(message) {
      if (!isRecord(message) || typeof message.id !== "number") return void 0;
      const { id, method } = message;
      if (typeof method !== "string") {
        return refusal2(id, PROTOCOL_ERROR_CODES.invalidParams, "A request names its method");
      }
      const params = message.params ?? {};
      if (!isRecord(params)) {
        return refusal2(id, PROTOCOL_ERROR_CODES.invalidParams, '"params" must be an object');
      }
      if (method === PROTOCOL_METHODS.hello) return hello(id, params);
      const run = Object.hasOwn(methods, method) ? methods[method] : void 0;
      if (!run) return refusal2(id, PROTOCOL_ERROR_CODES.methodNotFound, "Method not found");
      if (!greeted) {
        return refusal2(
          id,
          PROTOCOL_ERROR_CODES.beforeHello,
          `Call ${PROTOCOL_METHODS.hello} before ${method}`
        );
      }
      try {
        return { jsonrpc: "2.0", id, result: await run(params) };
      } catch (error) {
        if (error instanceof InvalidParams || error instanceof UnknownNameError) {
          return refusal2(id, PROTOCOL_ERROR_CODES.invalidParams, error.message);
        }
        return failure(id, protocolError(error));
      }
    }
  };
}
function frame(response) {
  try {
    const line = JSON.stringify(response);
    if (Buffer.byteLength(line) > MAX_FRAME_BYTES) {
      throw new Error(`The answer is over ${MAX_FRAME_BYTES} bytes`);
    }
    return line;
  } catch (error) {
    return JSON.stringify(failure(response.id, protocolError(error)));
  }
}
var SERVING = /* @__PURE__ */ Symbol.for("@vornrun/connector-sdk/serving");
async function serveConnector(connector, options = {}) {
  const shared = globalThis;
  if (shared[SERVING]) return;
  shared[SERVING] = true;
  const reply2 = process.stdout.write.bind(process.stdout);
  process.stdout.write = process.stderr.write.bind(process.stderr);
  const server = createConnectorServer(connector, options);
  let inFlight = 0;
  let ended = false;
  const finish = () => {
    if (ended && inFlight === 0) reply2("", () => process.exit(0));
  };
  const onLine = (line) => {
    if (line.trim() === "") return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      process.stderr.write(`${connector.id}: skipped a line that is not JSON
`);
      return;
    }
    inFlight++;
    void server.handle(message).then((response) => {
      if (response) reply2(`${frame(response)}
`);
    }).finally(() => {
      inFlight--;
      finish();
    });
  };
  process.stdin.on(
    "data",
    lineReader(onLine, () => {
      process.stderr.write(`${connector.id}: a message was over ${MAX_FRAME_BYTES} bytes
`);
      process.exit(1);
    })
  );
  process.stdin.on("end", () => {
    ended = true;
    finish();
  });
}

// packages/gitlab/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  GlabNotFoundError: () => GlabNotFoundError,
  GlabSignedOutError: () => GlabSignedOutError,
  TERMINAL_PIPELINE_STATUSES: () => TERMINAL_PIPELINE_STATUSES,
  apiUrl: () => apiUrl,
  connector: () => gitlabConnector,
  createGitLabClient: () => createGitLabClient,
  createGitLabConnector: () => createGitLabConnector,
  createTokenSource: () => createTokenSource,
  default: () => index_default,
  gitlabConnector: () => gitlabConnector,
  gitlabPreflight: () => gitlabPreflight,
  glabInstallHint: () => glabInstallHint,
  hostOf: () => hostOf,
  isFinishedPipeline: () => isFinishedPipeline,
  issueToItem: () => issueToItem,
  mergeRequestToItem: () => mergeRequestToItem,
  normalizeBaseUrl: () => normalizeBaseUrl,
  pipelineToItem: () => pipelineToItem,
  projectSegment: () => projectSegment,
  runGlab: () => runGlab
});
import { execFile } from "child_process";
import { promisify } from "util";
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var execFileAsync = promisify(execFile);
var GLAB_TIMEOUT_MS = 1e4;
var API_PATH = "/api/v4";
var DEFAULT_BASE_URL = "https://gitlab.com";
var MAX_PAGE_SIZE = 100;
var MAX_ERROR_BODY2 = 300;
function glabInstallHint(platform = process.platform) {
  switch (platform) {
    case "darwin":
      return "Install with Homebrew: `brew install glab`";
    case "win32":
      return "Install with winget: `winget install glab.glab` (or see https://gitlab.com/gitlab-org/cli)";
    default:
      return "Install from https://gitlab.com/gitlab-org/cli (releases carry .deb, .rpm and tarballs)";
  }
}
var GlabNotFoundError = class extends Error {
  code = "GLAB_NOT_FOUND";
  constructor() {
    super(`GitLab CLI (glab) not found on PATH. ${glabInstallHint()}`);
    this.name = "GlabNotFoundError";
  }
};
var GlabSignedOutError = class extends Error {
  code = "GLAB_SIGNED_OUT";
  constructor(detail) {
    super(`Not signed in to GitLab. Run \`glab auth login\`.${detail ? `
${detail}` : ""}`);
    this.name = "GlabSignedOutError";
  }
};
var runGlab = async (args) => {
  try {
    const { stdout } = await execFileAsync("glab", args, { timeout: GLAB_TIMEOUT_MS });
    return stdout;
  } catch (error) {
    if (error.code === "ENOENT") throw new GlabNotFoundError();
    const stderr = String(error.stderr ?? "").trim();
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
};
function normalizeBaseUrl(value) {
  const trimmed = String(value ?? "").trim();
  const base = trimmed === "" ? DEFAULT_BASE_URL : trimmed;
  let url;
  try {
    url = new URL(base);
  } catch {
    throw new Error(`GITLAB_BASE_URL is not a URL: "${base}"`);
  }
  return url.toString().replace(/\/+$/, "");
}
function hostOf(baseUrl) {
  return new URL(normalizeBaseUrl(baseUrl)).host;
}
function apiUrl(baseUrl, path, query) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${API_PATH}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === void 0 || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}
function projectSegment(project) {
  const value = String(project ?? "").trim();
  if (!value) throw new Error("GITLAB_PROJECT is required");
  return encodeURIComponent(value);
}
function createTokenSource(options = {}) {
  const glab = options.glab ?? runGlab;
  const pasted = String(options.token ?? "").trim();
  const host = hostOf(options.baseUrl ?? DEFAULT_BASE_URL);
  let cached = pasted || void 0;
  async function read() {
    const token = (await glab(["config", "get", "token", "--host", host])).trim();
    if (!token) throw new GlabSignedOutError(`glab has no token for ${host}.`);
    return token;
  }
  return {
    /** Whether the token came from `glab`, and so could be re-read. */
    borrowed: !pasted,
    async get() {
      return cached ??= await read();
    },
    /** Drop a borrowed token so the next `get()` asks `glab` again. */
    invalidate() {
      if (!pasted) cached = void 0;
    }
  };
}
async function describeFailure2(response) {
  const text22 = await response.text().catch(() => "");
  let detail = text22;
  try {
    const parsed = JSON.parse(text22);
    const message = parsed.message ?? parsed.error;
    if (message !== void 0) detail = typeof message === "string" ? message : JSON.stringify(message);
  } catch {
  }
  const quoted = detail.length > MAX_ERROR_BODY2 ? `${detail.slice(0, MAX_ERROR_BODY2)}\u2026` : detail;
  return `GitLab API ${response.status}${quoted ? `: ${quoted}` : ""}`;
}
var MAX_LIST_PAGES = 10;
function createGitLabClient(options) {
  const baseUrl = normalizeBaseUrl(options.config.baseUrl);
  const tokens = options.tokens ?? createTokenSource({
    ...options.config.token !== void 0 && { token: options.config.token },
    baseUrl,
    ...options.glab && { glab: options.glab }
  });
  async function send(url) {
    const token = await tokens.get();
    return options.fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  }
  async function get(url) {
    let response = await send(url);
    if (response.status === 401 && tokens.borrowed) {
      tokens.invalidate();
      response = await send(url);
      if (response.status === 401) {
        throw new GlabSignedOutError("The token from `glab config get token` was rejected twice.");
      }
    }
    if (response.status === 401) {
      throw new Error(
        "GitLab rejected the personal access token (401). Check it has not expired and carries the api or read_api scope."
      );
    }
    if (!response.ok) throw new Error(await describeFailure2(response));
    return response;
  }
  return {
    baseUrl,
    /** One GET, parsed as JSON. Whatever shape comes back is the caller's to judge. */
    async getJson(path, query) {
      const response = await get(apiUrl(baseUrl, path, query));
      return await response.json();
    },
    /**
     * Every page of a list endpoint, following `x-next-page` (empty when there
     * is no next page). Never `x-total`: lists over 10,000 records omit it.
     */
    async list(path, query, listOptions = {}) {
      const maxPages = listOptions.maxPages ?? MAX_LIST_PAGES;
      const collected = [];
      let page2 = 1;
      for (let index = 0; index < maxPages; index++) {
        const response = await get(apiUrl(baseUrl, path, { ...query, per_page: MAX_PAGE_SIZE, page: page2 }));
        const items = await response.json();
        if (!Array.isArray(items)) {
          throw new Error(`GitLab answered ${path} with something other than a list`);
        }
        collected.push(...items);
        if (listOptions.limit !== void 0 && collected.length >= listOptions.limit) break;
        const next = Number(response.headers.get("x-next-page") ?? "");
        if (!Number.isInteger(next) || next <= page2) break;
        page2 = next;
      }
      return collected;
    }
  };
}
async function gitlabPreflight(options = {}) {
  try {
    await createTokenSource(options).get();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
var TERMINAL_PIPELINE_STATUSES = /* @__PURE__ */ new Set([
  "success",
  "failed",
  "canceled",
  "skipped"
]);
function isFinishedPipeline(pipeline) {
  return TERMINAL_PIPELINE_STATUSES.has(pipeline.status);
}
function issueToItem(issue) {
  return {
    externalId: String(issue.iid),
    title: issue.title,
    url: issue.web_url,
    description: issue.description ?? "",
    status: issue.state,
    labels: issue.labels ?? [],
    ...issue.assignees?.[0]?.username && { assignee: issue.assignees[0].username },
    updatedAt: issue.created_at,
    data: {
      id: issue.id,
      iid: issue.iid,
      projectId: issue.project_id,
      author: issue.author?.username ?? "",
      assignees: (issue.assignees ?? []).map((user) => user.username),
      createdAt: issue.created_at,
      changedAt: issue.updated_at,
      closedAt: issue.closed_at ?? null,
      issueType: issue.issue_type ?? "issue",
      confidential: issue.confidential === true
    }
  };
}
function mergeRequestToItem(mr) {
  return {
    externalId: String(mr.iid),
    title: mr.title,
    url: mr.web_url,
    description: mr.description ?? "",
    status: mr.state,
    labels: mr.labels ?? [],
    updatedAt: mr.created_at,
    data: {
      id: mr.id,
      iid: mr.iid,
      projectId: mr.project_id,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      draft: mr.draft === true,
      sha: mr.sha ?? "",
      author: mr.author?.username ?? "",
      createdAt: mr.created_at,
      changedAt: mr.updated_at,
      mergedAt: mr.merged_at ?? null,
      closedAt: mr.closed_at ?? null,
      hasConflicts: mr.has_conflicts === true,
      detailedMergeStatus: mr.detailed_merge_status ?? ""
    }
  };
}
function pipelineToItem(pipeline) {
  return {
    externalId: String(pipeline.id),
    title: `${pipeline.name || pipeline.ref}: ${pipeline.status}`,
    url: pipeline.web_url,
    status: pipeline.status,
    updatedAt: pipeline.updated_at,
    data: {
      id: pipeline.id,
      iid: pipeline.iid ?? null,
      projectId: pipeline.project_id,
      ref: pipeline.ref,
      sha: pipeline.sha,
      source: pipeline.source ?? "",
      name: pipeline.name ?? "",
      createdAt: pipeline.created_at
    }
  };
}
var SAMPLE_ISSUE = {
  id: 201377309,
  iid: 627684,
  project_id: 278964,
  title: "Restructure Package Metadata Database documentation and split the offline quick start guide",
  description: "This issue tracks a documentation follow-up agreed during review of https://gitlab.com/gitlab-org/gitlab/-/merge_requests/...",
  state: "opened",
  created_at: "2026-09-04T02:23:26.054Z",
  updated_at: "2026-09-04T03:10:09.633Z",
  closed_at: null,
  labels: ["automation:quick-win-judged", "documentation", "group::composition analysis", "type::maintenance"],
  author: { id: 32685309, username: "azaydan", name: "Ahmad Zaydan" },
  assignees: [],
  web_url: "https://gitlab.com/gitlab-org/gitlab/-/work_items/627684",
  issue_type: "issue",
  confidential: false
};
var SAMPLE_MERGE_REQUEST = {
  id: 527853893,
  iid: 253583,
  project_id: 278964,
  title: "Add scope, engine and level properties to perform_search",
  description: "Nothing in GitLab measured whether a search returned any results, so the zero-result rate could not be computed. This adds...",
  state: "opened",
  draft: false,
  created_at: "2026-09-04T03:07:05.722Z",
  updated_at: "2026-09-04T03:12:24.611Z",
  merged_at: null,
  closed_at: null,
  source_branch: "wt/telemetry-zero-result",
  target_branch: "master",
  sha: "ae17207bc7b8ea3696979d9888fd25e0629c8bde",
  author: { id: 9717668, username: "johnmason", name: "John Mason" },
  labels: ["analytics instrumentation", "backend", "feature::addition", "type::feature"],
  web_url: "https://gitlab.com/gitlab-org/gitlab/-/merge_requests/253583",
  has_conflicts: false,
  detailed_merge_status: "not_approved"
};
var SAMPLE_PIPELINE = {
  id: 2818962738,
  iid: 6291260,
  project_id: 278964,
  sha: "631b08ab8c69929b88af7f06d64500c3e5f400ae",
  ref: "master",
  status: "success",
  source: "push",
  created_at: "2026-09-04T03:12:16.050Z",
  updated_at: "2026-09-04T03:12:20.492Z",
  web_url: "https://gitlab.com/gitlab-org/gitlab/-/pipelines/2818962738",
  name: "Ruby 3.3.12 master branch"
};
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || void 0;
}
var AUTH_HEADERS = { Authorization: "Bearer {{config.token}}" };
var API = "{{config.baseUrl}}/api/v4";
var FIRST_POLL_LOOKBACK_MS = 6e4;
function pageSize(limit) {
  if (typeof limit !== "number") return void 0;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)));
}
function renames(mapping, path) {
  return Object.entries(mapping).map(([from, to]) => ({
    op: "rename",
    from,
    to,
    ...path !== void 0 && { path }
  }));
}
var ISSUE_SHAPE = [
  {
    op: "pick",
    keys: [
      "id",
      "iid",
      "project_id",
      "title",
      "description",
      "state",
      "web_url",
      "labels",
      "author",
      "assignees",
      "created_at",
      "updated_at",
      "closed_at",
      "issue_type",
      "confidential"
    ]
  },
  ...renames({
    project_id: "projectId",
    web_url: "url",
    created_at: "createdAt",
    updated_at: "updatedAt",
    closed_at: "closedAt",
    issue_type: "issueType"
  }),
  { op: "pick", keys: ["id", "username", "name"], path: "author" },
  { op: "pick", keys: ["id", "username", "name"], path: "assignees" }
];
var NOTE_SHAPE = [
  {
    op: "pick",
    keys: ["id", "body", "author", "created_at", "noteable_iid", "noteable_type", "internal"]
  },
  ...renames({ created_at: "createdAt", noteable_iid: "noteableIid", noteable_type: "noteableType" }),
  { op: "pick", keys: ["id", "username", "name"], path: "author" }
];
var NOTE_OUTPUTS = [
  { key: "id", type: "number", description: "The note id" },
  { key: "body", description: "The comment as posted" },
  { key: "author", description: "Who posted it, as {id, username, name}" },
  { key: "createdAt", description: "When it was posted" },
  { key: "noteableIid", type: "number", description: "The iid it was posted on" },
  { key: "noteableType", description: "Issue or MergeRequest" },
  { key: "internal", type: "boolean", description: "Whether only members can see it" }
];
var PROJECT_INPUT = {
  key: "project",
  label: "Project",
  required: true,
  description: "Project path such as group/project, or its numeric id",
  builderHint: "The path is what the URL shows after the host; the id is on the project page. Either is sent URL-encoded as the :id segment."
};
var BODY_INPUT = {
  key: "body",
  label: "Comment",
  required: true,
  description: "Markdown, up to 1,000,000 characters"
};
var INTERNAL_INPUT = {
  key: "internal",
  label: "Internal note",
  type: "boolean",
  description: "Visible to project members only. Defaults to false.",
  builderHint: "The documented replacement for the deprecated confidential flag on notes."
};
function createGitLabConnector(options = {}) {
  const env = options.env ?? process.env;
  const sources = /* @__PURE__ */ new Map();
  function tokensFor(config) {
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const token = text2(config.token);
    const key = `${baseUrl} ${token ?? ""}`;
    let source = sources.get(key);
    if (!source) {
      source = createTokenSource({
        ...token !== void 0 && { token },
        baseUrl,
        ...options.glab && { glab: options.glab }
      });
      sources.set(key, source);
    }
    return source;
  }
  function client(context) {
    return createGitLabClient({
      config: context.config,
      fetch: context.fetch,
      tokens: tokensFor(context.config)
    });
  }
  function sinceOf(context) {
    return context.since ?? new Date(Date.parse(context.now()) - FIRST_POLL_LOOKBACK_MS).toISOString();
  }
  function fetchIssues(context) {
    return client(context).list(
      `/projects/${projectSegment(context.config.project)}/issues`,
      {
        state: "all",
        order_by: "created_at",
        sort: "asc",
        created_after: sinceOf(context)
      },
      { ...context.limit !== void 0 && { limit: context.limit } }
    ).then((issues) => issues.map(issueToItem));
  }
  function fetchMergeRequests(context) {
    return client(context).list(
      `/projects/${projectSegment(context.config.project)}/merge_requests`,
      {
        state: "all",
        order_by: "created_at",
        sort: "asc",
        created_after: sinceOf(context)
      },
      { ...context.limit !== void 0 && { limit: context.limit } }
    ).then((mrs) => mrs.map(mergeRequestToItem));
  }
  async function fetchPipelines(context) {
    const pipelines = await client(context).list(
      `/projects/${projectSegment(context.config.project)}/pipelines`,
      {
        order_by: "updated_at",
        sort: "asc",
        updated_after: sinceOf(context),
        ref: text2(context.config.ref)
      }
      // No `limit` here: a page is mostly pipelines still running, and cutting
      // the walk short on the raw count would starve the finished ones behind them.
    );
    return pipelines.filter(isFinishedPipeline).map(pipelineToItem);
  }
  return defineConnector({
    id: "gitlab",
    name: "GitLab",
    ...options.version && { version: options.version },
    description: "Trigger workflows from GitLab issues, merge requests and pipeline results, and create or comment on issues and merge requests from a step.",
    // GitLab's own mark.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "m23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8627 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8627 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z"
      ]
    },
    auth: {
      rung: "cli",
      probe: { command: "glab", args: ["auth", "status"] },
      // `glab auth token` does not exist; `config get token` is the documented
      // way to read what `glab auth login` stored. The host runs it at spawn
      // and hands the answer over as GITLAB_TOKEN, which is why that variable
      // is also the `token` field's env: a host refuses to borrow a name the
      // connector does not openly read. This is the gitlab.com default; the
      // connector's own token source adds `--host` from `baseUrl` when it has
      // to borrow for itself.
      borrow: {
        env: ["GITLAB_TOKEN"],
        tokenArgs: ["glab", "config", "get", "token"],
        tokenEnv: "GITLAB_TOKEN"
      }
    },
    config: [
      {
        key: "baseUrl",
        env: "GITLAB_BASE_URL",
        label: "GitLab URL",
        default: DEFAULT_BASE_URL,
        description: "Instance URL without a trailing slash. Leave the default for gitlab.com.",
        builderHint: "Every request goes to <baseUrl>/api/v4. A self-managed instance under a relative root (https://host/gitlab) works as-is. Declared requests append the path verbatim, so a trailing slash here would double it."
      },
      {
        key: "project",
        env: "GITLAB_PROJECT",
        label: "Project",
        required: true,
        description: "Path such as group/project, or the numeric id. The triggers poll this project.",
        builderHint: "Sent URL-encoded (group%2Fproject) as the :id segment, as the docs require for namespaced paths. Actions take their own project input so one connection can act on several."
      },
      {
        key: "token",
        env: "GITLAB_TOKEN",
        label: "Personal access token",
        secret: true,
        description: "Leave empty to borrow the glab CLI login. Needs scope api, or read_api for the triggers and read-only actions.",
        builderHint: "Created under Edit profile, Access, Personal access tokens, Generate token; prefixed glpat-, 365-day default expiry. Filled, it is sent as-is and glab is never run; empty, the connector asks glab config get token --host <host>."
      },
      {
        key: "ref",
        env: "GITLAB_REF",
        label: "Pipeline ref",
        description: "Branch or tag whose pipelines to watch. Blank for every ref.",
        builderHint: "Sent as the ref filter on GET /projects/:id/pipelines; the other two triggers ignore it."
      }
    ],
    preflight: () => gitlabPreflight({
      ...text2(env.GITLAB_TOKEN) !== void 0 && { token: env.GITLAB_TOKEN },
      baseUrl: text2(env.GITLAB_BASE_URL) ?? DEFAULT_BASE_URL,
      ...options.glab && { glab: options.glab }
    }),
    triggers: [
      {
        type: "issueCreated",
        label: "An issue is created",
        description: "Fires once for each issue created in the project since the last poll.",
        // The SDK keeps the watermark and the ids sitting on it; the fetch
        // asks GitLab for everything created on or after it.
        dedupe: "timestamp",
        fetch: fetchIssues,
        statusMapping: [
          { upstream: "opened", suggestedLocal: "todo" },
          { upstream: "closed", suggestedLocal: "done" }
        ],
        defaultWorkflow: { name: "GitLab: issues", defaultCronFromMinutes: 5 },
        sample: [issueToItem(SAMPLE_ISSUE)]
      },
      {
        type: "mergeRequestOpened",
        label: "A merge request is opened",
        description: "Fires once for each merge request opened in the project since the last poll.",
        dedupe: "timestamp",
        fetch: fetchMergeRequests,
        statusMapping: [
          { upstream: "opened", suggestedLocal: "in_progress" },
          { upstream: "merged", suggestedLocal: "done" },
          { upstream: "closed", suggestedLocal: "done" }
        ],
        defaultWorkflow: { name: "GitLab: merge requests", defaultCronFromMinutes: 5 },
        sample: [mergeRequestToItem(SAMPLE_MERGE_REQUEST)]
      },
      {
        type: "pipelineFinished",
        label: "A pipeline finishes",
        description: "Fires once for each pipeline that reaches success, failed, canceled or skipped, with the status on the item.",
        dedupe: "timestamp",
        fetch: fetchPipelines,
        // A failed pipeline is work to pick up; Vorn has no `blocked` status
        // to suggest, so it lands as todo.
        statusMapping: [
          { upstream: "success", suggestedLocal: "done" },
          { upstream: "failed", suggestedLocal: "todo" },
          { upstream: "canceled", suggestedLocal: "cancelled" },
          { upstream: "skipped", suggestedLocal: "cancelled" }
        ],
        defaultWorkflow: { name: "GitLab: pipelines", defaultCronFromMinutes: 5 },
        sample: [pipelineToItem(SAMPLE_PIPELINE)]
      }
    ],
    actions: [
      {
        type: "createIssue",
        label: "Create an issue",
        description: "Open a new issue in a project.",
        // Two identical calls make two issues; GitLab offers no idempotency key.
        idempotent: false,
        inputs: [
          PROJECT_INPUT,
          { key: "title", label: "Title", required: true, description: "Issue title" },
          {
            key: "description",
            label: "Description",
            description: "Markdown body, up to 1,048,576 characters"
          },
          {
            key: "labels",
            label: "Labels",
            description: "Comma-separated label names",
            builderHint: "GitLab takes labels as one comma-separated string, so this is passed through as typed."
          }
        ],
        outputs: [
          { key: "id", type: "number", description: "Global issue id" },
          { key: "iid", type: "number", description: "The number shown in the project, as in #12" },
          { key: "url", description: "Where to read it" },
          { key: "title", description: "The title as saved" },
          { key: "state", description: "opened" },
          { key: "createdAt", description: "When it was created" }
        ],
        request: {
          method: "POST",
          url: `${API}/projects/{{args.project}}/issues`,
          headers: AUTH_HEADERS,
          body: {
            title: "{{args.title}}",
            description: "{{args.description}}",
            labels: "{{args.labels}}"
          }
        },
        postReceive: [
          { op: "pick", keys: ["id", "iid", "web_url", "title", "state", "created_at"] },
          ...renames({ web_url: "url", created_at: "createdAt" })
        ]
      },
      {
        type: "commentOnIssue",
        label: "Comment on an issue",
        description: "Post a note on an issue.",
        // Two identical calls make two notes.
        idempotent: false,
        inputs: [
          PROJECT_INPUT,
          {
            key: "iid",
            label: "Issue number",
            type: "number",
            required: true,
            description: "The issue number shown in the project (its iid, not the global id)"
          },
          BODY_INPUT,
          INTERNAL_INPUT
        ],
        outputs: NOTE_OUTPUTS,
        request: {
          method: "POST",
          url: `${API}/projects/{{args.project}}/issues/{{args.iid}}/notes`,
          headers: AUTH_HEADERS,
          body: { body: "{{args.body}}", internal: "{{args.internal}}" }
        },
        postReceive: NOTE_SHAPE
      },
      {
        type: "commentOnMergeRequest",
        label: "Comment on a merge request",
        description: "Post a note on a merge request.",
        idempotent: false,
        inputs: [
          PROJECT_INPUT,
          {
            key: "iid",
            label: "Merge request number",
            type: "number",
            required: true,
            description: "The merge request number shown in the project (its iid)"
          },
          BODY_INPUT,
          INTERNAL_INPUT
        ],
        outputs: NOTE_OUTPUTS,
        request: {
          method: "POST",
          url: `${API}/projects/{{args.project}}/merge_requests/{{args.iid}}/notes`,
          headers: AUTH_HEADERS,
          body: { body: "{{args.body}}", internal: "{{args.internal}}" }
        },
        postReceive: NOTE_SHAPE
      },
      {
        type: "getProject",
        label: "Get a project",
        description: "Read a project by path or id.",
        // Reading changes nothing.
        idempotent: true,
        inputs: [PROJECT_INPUT],
        outputs: [
          { key: "id", type: "number", description: "Project id" },
          { key: "name", description: "Display name" },
          { key: "path", description: "The last segment of the path" },
          { key: "pathWithNamespace", description: "group/project" },
          { key: "description", description: "Project description" },
          { key: "defaultBranch", description: "Usually main or master" },
          { key: "visibility", description: "private, internal or public" },
          { key: "url", description: "Where to open it" },
          { key: "httpUrlToRepo", description: "Clone URL over HTTPS" },
          { key: "sshUrlToRepo", description: "Clone URL over SSH" },
          { key: "createdAt", description: "When the project was created" },
          { key: "lastActivityAt", description: "When something last happened in it" },
          { key: "archived", type: "boolean", description: "Whether it is archived" },
          {
            key: "namespace",
            description: "The owning group or user, as {id, name, path, fullPath, kind}"
          },
          { key: "starCount", type: "number", description: "Stars" },
          { key: "forksCount", type: "number", description: "Forks" },
          { key: "topics", description: "Topic names" }
        ],
        // A public project on gitlab.com, so the live check works with read_api.
        sample: { project: "gitlab-org/gitlab" },
        request: {
          url: `${API}/projects/{{args.project}}`,
          headers: AUTH_HEADERS
        },
        postReceive: [
          {
            op: "pick",
            keys: [
              "id",
              "name",
              "path",
              "path_with_namespace",
              "description",
              "default_branch",
              "visibility",
              "web_url",
              "http_url_to_repo",
              "ssh_url_to_repo",
              "created_at",
              "last_activity_at",
              "archived",
              "namespace",
              "star_count",
              "forks_count",
              "topics"
            ]
          },
          ...renames({
            path_with_namespace: "pathWithNamespace",
            default_branch: "defaultBranch",
            web_url: "url",
            http_url_to_repo: "httpUrlToRepo",
            ssh_url_to_repo: "sshUrlToRepo",
            created_at: "createdAt",
            last_activity_at: "lastActivityAt",
            star_count: "starCount",
            forks_count: "forksCount"
          }),
          { op: "pick", keys: ["id", "name", "path", "full_path", "kind"], path: "namespace" },
          ...renames({ full_path: "fullPath" }, "namespace")
        ]
      },
      {
        type: "listOpenMergeRequests",
        label: "List open merge requests",
        description: "The open merge requests of a project, most recently updated first.",
        idempotent: true,
        inputs: [
          PROJECT_INPUT,
          {
            key: "limit",
            label: "Maximum",
            type: "number",
            description: "How many to return, 1 to 100. Defaults to 20.",
            builderHint: "Sent as per_page; 100 is the documented maximum."
          },
          {
            key: "targetBranch",
            label: "Target branch",
            description: "Only merge requests into this branch. Blank for all."
          }
        ],
        outputs: [
          { key: "count", type: "number", description: "How many merge requests came back" },
          {
            key: "items",
            description: "One entry per merge request, shaped as the merge request trigger delivers it: externalId (the iid), title, url, description, status, labels, updatedAt, and data with id, iid, projectId, sourceBranch, targetBranch, draft, sha, author, createdAt, changedAt, mergedAt, closedAt, hasConflicts, detailedMergeStatus"
          }
        ],
        sample: { project: "gitlab-org/gitlab" },
        // Hand-written rather than declared: a declared request cannot count
        // what it returns, and the spec asks for the trigger's own mapping.
        async run(args, context) {
          const answer = await client(context).getJson(
            `/projects/${projectSegment(args.project)}/merge_requests`,
            {
              state: "opened",
              order_by: "updated_at",
              sort: "desc",
              per_page: pageSize(args.limit),
              target_branch: text2(args.targetBranch)
            }
          );
          const mrs = Array.isArray(answer) ? answer : [];
          const items = mrs.map(mergeRequestToItem);
          return { count: items.length, items };
        }
      },
      {
        type: "getIssue",
        label: "Get an issue",
        description: "Read one issue by its number.",
        idempotent: true,
        inputs: [
          PROJECT_INPUT,
          {
            key: "iid",
            label: "Issue number",
            type: "number",
            required: true,
            description: "The issue number shown in the project (its iid)"
          }
        ],
        outputs: [
          { key: "id", type: "number", description: "Global issue id" },
          { key: "iid", type: "number", description: "The number shown in the project" },
          { key: "projectId", type: "number", description: "The project it belongs to" },
          { key: "title", description: "Issue title" },
          { key: "description", description: "Markdown body" },
          { key: "state", description: "opened or closed" },
          { key: "url", description: "Where to read it" },
          { key: "labels", description: "Label names" },
          { key: "author", description: "Who opened it, as {id, username, name}" },
          { key: "assignees", description: "Each as {id, username, name}" },
          { key: "createdAt", description: "When it was opened" },
          { key: "updatedAt", description: "When it last changed" },
          { key: "closedAt", description: "When it was closed, or null" },
          { key: "issueType", description: "issue, incident, test_case or task" },
          { key: "confidential", type: "boolean", description: "Whether only members can see it" }
        ],
        sample: { project: "gitlab-org/gitlab", iid: "1" },
        request: {
          url: `${API}/projects/{{args.project}}/issues/{{args.iid}}`,
          headers: AUTH_HEADERS
        },
        postReceive: ISSUE_SHAPE
      }
    ]
  });
}
function isEntryPoint(moduleUrl, entry = process.argv[1]) {
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}
function serveIfEntryPoint(connector, moduleUrl, serve = serveConnector) {
  if (!isEntryPoint(moduleUrl)) return false;
  void serve(connector);
  return true;
}
var package_default = {
  name: "@vornrun/connector-gitlab",
  version: "0.1.2",
  description: "Trigger workflows from GitLab issues, merge requests and pipelines.",
  type: "module",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/connectors.git",
    directory: "packages/gitlab"
  },
  bin: {
    "vorn-connector-gitlab": "dist/index.js"
  },
  main: "./dist/index.js",
  files: [
    "dist",
    "README.md",
    "CHANGELOG.md"
  ],
  scripts: {
    build: "tsup src/index.ts --format esm --target node22 --clean",
    typecheck: "tsc --noEmit",
    test: "vitest run"
  },
  dependencies: {
    "@vornrun/connector-sdk": "^0.7.2"
  },
  devDependencies: {
    "@types/node": "^22.10.2",
    "@vitest/coverage-v8": "^4.1.10",
    tsup: "^8.5.1",
    typescript: "^6.0.3",
    vitest: "^4.1.10"
  },
  vorn: {
    category: "Development",
    keywords: [
      "gitlab",
      "issues",
      "merge requests",
      "pipelines",
      "ci",
      "code review",
      "repositories"
    ],
    auth: "Borrows the GitLab CLI's login \u2014 `glab auth login` is all it needs \u2014 or takes a personal access token if you would rather paste one.",
    packs: true
  }
};
var { version } = package_default;
var gitlabConnector = createGitLabConnector({ version });
var index_default = gitlabConnector;
serveIfEntryPoint(gitlabConnector, import.meta.url);

// packages/gitlab/vorn-connector-pack.js
import { readFileSync } from "node:fs";
var exported = Object.values(dist_exports).find((value) => value && Array.isArray(value.triggers));
if (!exported) throw new Error("./dist/index.js exports no connector");
if (process.argv.includes("--check")) {
  const manifest = connectorManifest(exported);
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(new URL("./verified.json", import.meta.url), "utf8"));
  } catch {
  }
  const problems = selfCheck(manifest, receipt, RECORDED_CHECKS);
  for (const problem of problems) console.error(problem);
  if (problems.length === 0) console.log(`${manifest.id} ${manifest.version}: ${receipt.checks.join(", ")}`);
  process.exit(problems.length === 0 ? 0 : 1);
}
await serveConnector(exported);
