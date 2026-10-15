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

// ../e4-connectors/packages/connector-sdk/dist/chunk-TPBIZCEC.js
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

// stripe/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  API_ROOT: () => API_ROOT,
  MAX_LIST_PAGES: () => MAX_LIST_PAGES,
  MAX_PAGE_SIZE: () => MAX_PAGE_SIZE,
  SAMPLE_CHARGE: () => SAMPLE_CHARGE,
  SAMPLE_CUSTOMER: () => SAMPLE_CUSTOMER,
  SAMPLE_FAILED_INVOICE: () => SAMPLE_FAILED_INVOICE,
  SAMPLE_PAID_INVOICE: () => SAMPLE_PAID_INVOICE,
  SAMPLE_PAYMENT_INTENT: () => SAMPLE_PAYMENT_INTENT,
  STRIPE_VERSION: () => STRIPE_VERSION,
  StripeApiError: () => StripeApiError,
  StripeNotFoundError: () => StripeNotFoundError,
  StripeSignedOutError: () => StripeSignedOutError,
  assertSecretKey: () => assertSecretKey,
  chargeOutput: () => chargeOutput,
  connector: () => stripeConnector,
  createStripeClient: () => createStripeClient,
  createStripeConnector: () => createStripeConnector,
  createTokenSource: () => createTokenSource,
  customerOutput: () => customerOutput,
  customerToItem: () => customerToItem,
  dashboardUrl: () => dashboardUrl,
  default: () => index_default,
  encodeParams: () => encodeParams,
  idempotencyKey: () => idempotencyKey,
  invoiceFailedToItem: () => invoiceFailedToItem,
  invoicePaidToItem: () => invoicePaidToItem,
  isFailedAttempt: () => isFailedAttempt,
  isoFromUnix: () => isoFromUnix,
  paymentIntentToItem: () => paymentIntentToItem,
  readProfileKey: () => readProfileKey,
  runStripe: () => runStripe,
  stripeConnector: () => stripeConnector,
  stripeInstallHint: () => stripeInstallHint,
  stripePreflight: () => stripePreflight
});
import { execFile } from "child_process";
import { createHash } from "crypto";
import { promisify } from "util";
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var execFileAsync = promisify(execFile);
var API_ROOT = "https://api.stripe.com/v1";
var STRIPE_VERSION = "2026-08-26.dahlia";
var MAX_PAGE_SIZE = 100;
var MAX_LIST_PAGES = 10;
var STRIPE_TIMEOUT_MS = 1e4;
var MAX_ERROR_BODY2 = 300;
var POST_RETRIES = 2;
var POST_BACKOFF_MS = 500;
function stripeInstallHint(platform = process.platform) {
  switch (platform) {
    case "darwin":
      return "Install with Homebrew: `brew install stripe/stripe-cli/stripe`";
    case "win32":
      return "Install with Scoop: `scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git && scoop install stripe`";
    default:
      return "Install from https://docs.stripe.com/stripe-cli#install (apt, yum and tarballs)";
  }
}
var StripeNotFoundError = class extends Error {
  code = "STRIPE_CLI_NOT_FOUND";
  constructor() {
    super(`Stripe CLI (stripe) not found on PATH. ${stripeInstallHint()}`);
    this.name = "StripeNotFoundError";
  }
};
var StripeSignedOutError = class extends Error {
  code = "STRIPE_SIGNED_OUT";
  constructor(detail) {
    super(`Not signed in to Stripe. Run \`stripe login\`.${detail ? `
${detail}` : ""}`);
    this.name = "StripeSignedOutError";
  }
};
var StripeApiError = class extends Error {
  status;
  type;
  errorCode;
  requestId;
  constructor(status, detail) {
    const head = detail.type ? `${detail.type}${detail.code ? `/${detail.code}` : ""}: ` : "";
    super(`${head}${detail.message}${detail.requestId ? ` (${detail.requestId})` : ""}`);
    this.name = "StripeApiError";
    this.status = status;
    this.type = detail.type;
    this.errorCode = detail.code;
    this.requestId = detail.requestId;
  }
};
var runStripe = async (args) => {
  try {
    const { stdout } = await execFileAsync("stripe", args, { timeout: STRIPE_TIMEOUT_MS });
    return stdout;
  } catch (error) {
    if (error.code === "ENOENT") throw new StripeNotFoundError();
    const stderr = String(error.stderr ?? "").trim();
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
};
var TABLE_LINE = /^\s*\[\s*"?([^"\]]+?)"?\s*\]\s*$/;
var KEY_LINE = /^\s*(test_mode_api_key|live_mode_api_key)\s*=\s*"([^"]*)"\s*$/;
function readProfileKey(toml, project, liveMode) {
  const wanted = liveMode ? "live_mode_api_key" : "test_mode_api_key";
  let table = "";
  for (const line of toml.split(/\r?\n/)) {
    const heading = TABLE_LINE.exec(line);
    if (heading) {
      table = heading[1].trim();
      continue;
    }
    const entry = KEY_LINE.exec(line);
    if (entry && table === project && entry[1] === wanted && entry[2].trim() !== "") {
      return entry[2].trim();
    }
  }
  return void 0;
}
function assertSecretKey(key) {
  if (key.startsWith("pk_")) {
    throw new Error(
      "STRIPE_API_KEY is a publishable key (pk_\u2026), which cannot call the API. Use a restricted (rk_) or secret (sk_) key."
    );
  }
  return key;
}
function createTokenSource(options = {}) {
  const stripe = options.stripe ?? runStripe;
  const pasted = String(options.apiKey ?? "").trim();
  const project = String(options.project ?? "").trim() || "default";
  const liveMode = options.liveMode === true;
  let cached = pasted || void 0;
  async function read() {
    const args = ["config", "--list", ...project !== "default" ? ["--project-name", project] : []];
    const key = readProfileKey(await stripe(args), project, liveMode);
    if (!key) {
      const which = liveMode ? "live_mode_api_key" : "test_mode_api_key";
      throw new StripeSignedOutError(`stripe config --list holds no ${which} for profile "${project}".`);
    }
    return key;
  }
  return {
    borrowed: !pasted,
    async get() {
      return assertSecretKey(cached ??= await read());
    },
    invalidate() {
      if (!pasted) cached = void 0;
    }
  };
}
function encodeParams(params, into = new URLSearchParams(), prefix = "") {
  for (const [key, value] of Object.entries(params)) {
    if (value === void 0 || value === null || value === "") continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => encodeParams({ [index]: entry }, into, name));
    } else if (typeof value === "object") {
      encodeParams(value, into, name);
    } else {
      into.set(name, String(value));
    }
  }
  return into;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}
function idempotencyKey(action, args) {
  return createHash("sha256").update(`${action}
${JSON.stringify(canonical(args))}`).digest("hex");
}
function dashboardUrl(path, livemode) {
  return `https://dashboard.stripe.com/${livemode ? "" : "test/"}${path}`;
}
async function describeFailure2(response) {
  const text22 = await response.text().catch(() => "");
  const requestId = response.headers.get("request-id") ?? void 0;
  try {
    const parsed = JSON.parse(text22);
    if (parsed.error && typeof parsed.error.message === "string") {
      return new StripeApiError(response.status, {
        ...parsed.error.type && { type: parsed.error.type },
        ...parsed.error.code && { code: parsed.error.code },
        message: parsed.error.message,
        ...requestId && { requestId }
      });
    }
  } catch {
  }
  const quoted = text22.length > MAX_ERROR_BODY2 ? `${text22.slice(0, MAX_ERROR_BODY2)}\u2026` : text22;
  return new StripeApiError(response.status, {
    message: `Stripe API ${response.status}${quoted ? `: ${quoted}` : ""}`,
    ...requestId && { requestId }
  });
}
var wait2 = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
function isRetryable(status) {
  return status === 429 || status >= 500;
}
function createStripeClient(options) {
  const tokens = options.tokens ?? createTokenSource({
    ...options.config.apiKey !== void 0 && { apiKey: options.config.apiKey },
    ...options.config.project !== void 0 && { project: options.config.project },
    liveMode: options.config.liveMode === "true",
    ...options.stripe && { stripe: options.stripe }
  });
  const sleep = options.sleep ?? wait2;
  const random = options.random ?? Math.random;
  async function send(url, init, headers) {
    const key = await tokens.get();
    return options.fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Stripe-Version": STRIPE_VERSION, ...headers }
    });
  }
  async function authorized(url, init, headers) {
    let response = await send(url, init, headers);
    if (response.status === 401 && tokens.borrowed) {
      tokens.invalidate();
      response = await send(url, init, headers);
      if (response.status === 401) {
        throw new StripeSignedOutError("The key from `stripe config --list` was rejected twice.");
      }
    }
    return response;
  }
  async function settle(response) {
    if (!response.ok) throw await describeFailure2(response);
    return await response.json();
  }
  async function get(path, query = {}) {
    const search = encodeParams(query).toString();
    const url = `${API_ROOT}${path}${search ? `?${search}` : ""}`;
    return settle(await authorized(url, { method: "GET" }, {}));
  }
  async function post(path, form, idempotency) {
    const body = encodeParams(form).toString();
    const init = { method: "POST", body };
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotency
    };
    for (let attempt = 0; ; attempt++) {
      const response = await authorized(`${API_ROOT}${path}`, init, headers);
      if (!isRetryable(response.status) || attempt >= POST_RETRIES) return settle(response);
      await sleep(POST_BACKOFF_MS * 2 ** attempt * (0.5 + random()));
    }
  }
  async function list(path, query, listOptions = {}) {
    const maxPages = listOptions.maxPages ?? MAX_LIST_PAGES;
    const collected = [];
    let startingAfter;
    for (let index = 0; index < maxPages; index++) {
      const page2 = await get(path, {
        ...query,
        limit: MAX_PAGE_SIZE,
        ...startingAfter !== void 0 && { starting_after: startingAfter }
      });
      if (!Array.isArray(page2.data)) {
        throw new Error(`Stripe answered ${path} with something other than a list`);
      }
      collected.push(...page2.data);
      const last = page2.data[page2.data.length - 1];
      if (page2.has_more !== true || last === void 0) break;
      startingAfter = last.id;
    }
    return collected;
  }
  return { get, post, list };
}
async function stripePreflight(options = {}) {
  try {
    await createTokenSource(options).get();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
function isoFromUnix(seconds) {
  return typeof seconds === "number" ? new Date(seconds * 1e3).toISOString() : null;
}
function personLabel(name, email, id) {
  if (name && email) return `${name} <${email}>`;
  return name || email || id;
}
function money(amount, currency) {
  return `${amount} ${currency}`;
}
function customerToItem(customer) {
  return {
    externalId: customer.id,
    title: personLabel(customer.name, customer.email, customer.id),
    url: dashboardUrl(`customers/${customer.id}`, customer.livemode),
    description: customer.description ?? "",
    updatedAt: new Date(customer.created * 1e3).toISOString(),
    data: customerOutput(customer)
  };
}
function paymentIntentToItem(intent, updatedAt) {
  return {
    externalId: intent.id,
    title: `${money(intent.amount, intent.currency)} ${intent.status}`,
    url: dashboardUrl(`payments/${intent.id}`, intent.livemode),
    description: intent.description ?? "",
    status: intent.status,
    ...updatedAt !== void 0 && { updatedAt },
    data: {
      id: intent.id,
      amount: intent.amount,
      amountReceived: intent.amount_received ?? 0,
      currency: intent.currency,
      customer: intent.customer ?? null,
      latestCharge: intent.latest_charge ?? null,
      receiptEmail: intent.receipt_email ?? null,
      metadata: intent.metadata ?? {},
      created: isoFromUnix(intent.created),
      livemode: intent.livemode === true
    }
  };
}
function invoiceData(invoice) {
  const transitions = invoice.status_transitions ?? {};
  return {
    id: invoice.id,
    number: invoice.number ?? null,
    customer: invoice.customer ?? null,
    customerEmail: invoice.customer_email ?? null,
    customerName: invoice.customer_name ?? null,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    amountRemaining: invoice.amount_remaining,
    currency: invoice.currency,
    attempted: invoice.attempted === true,
    attemptCount: invoice.attempt_count ?? 0,
    nextPaymentAttempt: isoFromUnix(invoice.next_payment_attempt),
    paidAt: isoFromUnix(transitions.paid_at),
    finalizedAt: isoFromUnix(transitions.finalized_at),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    collectionMethod: invoice.collection_method ?? "",
    billingReason: invoice.billing_reason ?? null,
    created: isoFromUnix(invoice.created),
    livemode: invoice.livemode === true
  };
}
function invoiceLabel(invoice) {
  return `Invoice ${invoice.number || invoice.id}`;
}
function invoicePaidToItem(invoice) {
  const paidAt = isoFromUnix(invoice.status_transitions?.paid_at);
  return {
    externalId: `${invoice.id}:paid`,
    title: `${invoiceLabel(invoice)} paid: ${money(invoice.amount_paid, invoice.currency)}`,
    url: dashboardUrl(`invoices/${invoice.id}`, invoice.livemode),
    status: invoice.status,
    ...paidAt !== null && { updatedAt: paidAt },
    data: invoiceData(invoice)
  };
}
function isFailedAttempt(invoice) {
  return invoice.status === "open" && invoice.attempted === true && (invoice.attempt_count ?? 0) > 0 && invoice.amount_remaining > 0;
}
function invoiceFailedToItem(invoice) {
  const attempt = invoice.attempt_count ?? 0;
  return {
    externalId: `${invoice.id}:failed:${attempt}`,
    title: `${invoiceLabel(invoice)} payment failed (attempt ${attempt}): ${money(invoice.amount_remaining, invoice.currency)}`,
    url: dashboardUrl(`invoices/${invoice.id}`, invoice.livemode),
    status: invoice.status,
    data: invoiceData(invoice)
  };
}
function customerOutput(customer) {
  return {
    id: customer.id,
    email: customer.email ?? null,
    name: customer.name ?? null,
    description: customer.description ?? null,
    phone: customer.phone ?? null,
    currency: customer.currency ?? null,
    balance: customer.balance ?? 0,
    delinquent: customer.delinquent === true,
    created: isoFromUnix(customer.created),
    metadata: customer.metadata ?? {},
    deleted: customer.deleted === true,
    livemode: customer.livemode === true,
    url: dashboardUrl(`customers/${customer.id}`, customer.livemode)
  };
}
function chargeOutput(charge) {
  return {
    id: charge.id,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded ?? 0,
    currency: charge.currency,
    status: charge.status,
    paid: charge.paid === true,
    refunded: charge.refunded === true,
    captured: charge.captured === true,
    customer: charge.customer ?? null,
    paymentIntent: charge.payment_intent ?? null,
    description: charge.description ?? null,
    receiptUrl: charge.receipt_url ?? null,
    failureCode: charge.failure_code ?? null,
    failureMessage: charge.failure_message ?? null,
    created: isoFromUnix(charge.created),
    livemode: charge.livemode === true
  };
}
var SAMPLE_CUSTOMER = {
  id: "cus_NffrFeUfNV2Hib",
  object: "customer",
  created: 1680893993,
  email: "jennyrosen@example.com",
  name: "Jenny Rosen",
  description: null,
  phone: null,
  currency: null,
  balance: 0,
  delinquent: false,
  metadata: {},
  livemode: false
};
var SAMPLE_PAYMENT_INTENT = {
  id: "pi_3MtwBwLkdIwHu7ix28a3tqPa",
  object: "payment_intent",
  amount: 2e3,
  amount_received: 2e3,
  currency: "usd",
  status: "succeeded",
  created: 1680800504,
  customer: null,
  latest_charge: "ch_3MtwBwLkdIwHu7ix0snN0B15",
  description: null,
  receipt_email: null,
  metadata: {},
  livemode: false
};
var SAMPLE_PAID_INVOICE = {
  id: "in_1MtHbELkdIwHu7ixl4OzzPMv",
  object: "invoice",
  number: "F1B2C3D-0001",
  status: "paid",
  customer: "cus_NeZwdNtLEOXuvB",
  customer_email: "jennyrosen@example.com",
  customer_name: "Jenny Rosen",
  amount_due: 4900,
  amount_paid: 4900,
  amount_remaining: 0,
  currency: "usd",
  created: 1680644467,
  attempted: true,
  attempt_count: 1,
  next_payment_attempt: null,
  status_transitions: {
    finalized_at: 1680644467,
    paid_at: 1680644467,
    marked_uncollectible_at: null,
    voided_at: null
  },
  hosted_invoice_url: "https://invoice.stripe.com/i/acct_1/test_YWNjdF8x",
  collection_method: "charge_automatically",
  billing_reason: "subscription_cycle",
  livemode: false
};
var SAMPLE_FAILED_INVOICE = {
  ...SAMPLE_PAID_INVOICE,
  status: "open",
  amount_paid: 0,
  amount_remaining: 4900,
  attempted: true,
  attempt_count: 2,
  next_payment_attempt: 1681249267,
  status_transitions: {
    finalized_at: 1680644467,
    paid_at: null,
    marked_uncollectible_at: null,
    voided_at: null
  }
};
var SAMPLE_CHARGE = {
  id: "ch_3MmlLrLkdIwHu7ix0snN0B15",
  amount: 1099,
  amount_refunded: 0,
  currency: "usd",
  status: "succeeded",
  paid: true,
  refunded: false,
  captured: true,
  customer: null,
  payment_intent: null,
  description: null,
  receipt_url: "https://pay.stripe.com/receipts/payment/example",
  failure_code: null,
  failure_message: null,
  created: 1679090539,
  livemode: false
};
var FIRST_POLL_LOOKBACK_MS = 60 * 6e4;
var DEFAULT_LOOKBACK_MINUTES = 60;
var DEFAULT_FAILED_LOOKBACK_MINUTES = 1440;
var MAX_METADATA_KEYS = 50;
var REFUND_REASONS = ["duplicate", "fraudulent", "requested_by_customer"];
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || void 0;
}
function minutes(value, env, fallback) {
  const raw = text2(value);
  if (raw === void 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${env} must be a whole number of minutes, got "${raw}"`);
  }
  return parsed;
}
function pageSize(limit) {
  if (typeof limit !== "number") return void 0;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)));
}
function unixSeconds(iso) {
  return Math.floor(Date.parse(iso) / 1e3);
}
function metadataParams(value) {
  if (value === void 0) return void 0;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("metadata must be a JSON object of string values");
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_METADATA_KEYS) {
    throw new Error(`metadata may hold at most ${MAX_METADATA_KEYS} keys, got ${entries.length}`);
  }
  const out = {};
  for (const [key, entry] of entries) {
    if (/[[\]]/.test(key)) throw new Error(`metadata key "${key}" may not contain square brackets`);
    if (entry !== null && typeof entry === "object") {
      throw new Error(`metadata value for "${key}" must be a string, number or boolean`);
    }
    out[key] = entry === null ? "" : String(entry);
  }
  return out;
}
function smallestUnit(value, key) {
  if (value === void 0) return void 0;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive whole number in the smallest currency unit, got "${String(value)}"`);
  }
  return value;
}
var LIMIT_INPUT = {
  key: "limit",
  label: "Maximum",
  type: "number",
  description: "How many to return, 1 to 100. Defaults to 10.",
  builderHint: "Sent as limit; 100 is the documented maximum and lists come back newest first."
};
var STARTING_AFTER_INPUT = (kind) => ({
  key: "startingAfter",
  label: "Starting after",
  description: `A ${kind} id from an earlier page, to fetch the next one.`,
  builderHint: "Sent as starting_after, the documented cursor; pass the last id of the previous page while hasMore is true."
});
var CUSTOMER_FIELDS = [
  { key: "id", description: "Customer id, cus_\u2026" },
  { key: "email", description: "Email address, or null" },
  { key: "name", description: "Full or business name, or null" },
  { key: "description", description: "Free text shown alongside the customer" },
  { key: "phone", description: "Phone number, or null" },
  { key: "currency", description: "Three-letter currency of recurring billing, or null" },
  { key: "balance", type: "number", description: "Current balance in the smallest currency unit; negative is credit" },
  { key: "delinquent", type: "boolean", description: "Whether the latest invoice is unpaid past due" },
  { key: "created", description: "When the customer was created, ISO 8601" },
  { key: "metadata", description: "The metadata object as stored" },
  { key: "livemode", type: "boolean", description: "False for a sandbox customer" },
  { key: "url", description: "Where to open it in the dashboard" }
];
function createStripeConnector(options = {}) {
  const env = options.env ?? process.env;
  const sources = /* @__PURE__ */ new Map();
  function tokensFor(config) {
    const apiKey = text2(config.apiKey);
    const project = text2(config.project);
    const liveMode = text2(config.liveMode) === "true";
    const key = `${apiKey ?? ""} ${project ?? ""} ${liveMode}`;
    let source = sources.get(key);
    if (!source) {
      source = createTokenSource({
        ...apiKey !== void 0 && { apiKey },
        ...project !== void 0 && { project },
        liveMode,
        ...options.stripe && { stripe: options.stripe }
      });
      sources.set(key, source);
    }
    return source;
  }
  function client(context) {
    return createStripeClient({
      config: context.config,
      fetch: context.fetch,
      tokens: tokensFor(context.config),
      ...options.sleep && { sleep: options.sleep }
    });
  }
  function watermarkOf(context) {
    return context.since ?? new Date(Date.parse(context.now()) - FIRST_POLL_LOOKBACK_MS).toISOString();
  }
  function lookbackOf(config) {
    return minutes(config.lookbackMinutes, "STRIPE_LOOKBACK_MINUTES", DEFAULT_LOOKBACK_MINUTES);
  }
  function customerFilter(config) {
    const customer = text2(config.customer);
    return customer ? { customer } : {};
  }
  async function fetchCustomers(context) {
    const customers = await client(context).list("/customers", {
      created: { gte: unixSeconds(watermarkOf(context)) }
    });
    return customers.reverse().map(customerToItem);
  }
  async function fetchSucceededPayments(context) {
    const watermark = Date.parse(watermarkOf(context));
    const since = context.since === void 0 ? void 0 : Date.parse(context.since);
    const from = watermark - lookbackOf(context.config) * 6e4;
    const polledAt = context.now();
    const intents = await client(context).list("/payment_intents", {
      created: { gte: Math.floor(from / 1e3) }
    });
    return intents.reverse().filter((intent) => intent.status === "succeeded").map(
      (intent) => since !== void 0 && intent.created * 1e3 <= since ? paymentIntentToItem(intent) : paymentIntentToItem(intent, polledAt)
    );
  }
  async function fetchPaidInvoices(context) {
    const from = Date.parse(watermarkOf(context)) - lookbackOf(context.config) * 6e4;
    const invoices = await client(context).list("/invoices", {
      status: "paid",
      created: { gte: Math.floor(from / 1e3) },
      ...customerFilter(context.config)
    });
    return invoices.reverse().filter((invoice) => typeof invoice.status_transitions?.paid_at === "number").map(invoicePaidToItem);
  }
  async function fetchFailedInvoices(context) {
    const lookback = minutes(
      context.config.failedLookbackMinutes,
      "STRIPE_FAILED_LOOKBACK_MINUTES",
      DEFAULT_FAILED_LOOKBACK_MINUTES
    );
    const from = Date.parse(context.now()) - lookback * 6e4;
    const invoices = await client(context).list("/invoices", {
      status: "open",
      created: { gte: Math.floor(from / 1e3) },
      ...customerFilter(context.config)
    });
    return invoices.reverse().filter(isFailedAttempt).map(invoiceFailedToItem);
  }
  return defineConnector({
    id: "stripe",
    name: "Stripe",
    ...options.version && { version: options.version },
    description: "Trigger workflows from new Stripe customers, succeeded payments and paid or failed invoices, and create customers, issue refunds or read balances and charges from a step.",
    // Stripe's own S.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
      ]
    },
    auth: {
      rung: "cli",
      probe: { command: "stripe", args: ["login", "list"] },
      // No tokenArgs: `stripe config --list` prints a TOML document rather than a bare key, so the connector reads the profile itself.
      borrow: { env: ["STRIPE_API_KEY"], tokenEnv: "STRIPE_API_KEY" }
    },
    config: [
      {
        key: "apiKey",
        env: "STRIPE_API_KEY",
        label: "API key",
        secret: true,
        description: "Leave empty to borrow the Stripe CLI login. A restricted key with read access to customers, charges, invoices and payment intents plus write access to customers and refunds is enough.",
        builderHint: "Created under Developers, API keys, Create restricted key; sandbox keys start sk_test_ or rk_test_, live keys sk_live_ or rk_live_. Filled, it is sent as-is and stripe is never run; empty, the connector reads test_mode_api_key from stripe config --list. A publishable pk_ key is refused before any call."
      },
      {
        key: "liveMode",
        env: "STRIPE_LIVE_MODE",
        label: "Live mode",
        default: "false",
        description: "true borrows the live key from the CLI profile instead of the test one. A pasted key carries its own mode.",
        builderHint: "Reads live_mode_api_key rather than test_mode_api_key from the CLI profile. Objects in one mode are invisible to the other, and every item and output carries livemode."
      },
      {
        key: "project",
        env: "STRIPE_PROJECT",
        label: "CLI profile",
        description: "The stripe --project-name profile to borrow from. Blank for the default profile.",
        builderHint: "Passed as --project-name to stripe config --list and read as the TOML table of that name; the default table is [default]."
      },
      {
        key: "customer",
        env: "STRIPE_CUSTOMER",
        label: "Customer",
        description: "Only this customer\u2019s invoices, for the two invoice triggers. Blank for every customer.",
        builderHint: "Sent as the customer filter on GET /v1/invoices; the customer and payment triggers ignore it."
      },
      {
        key: "lookbackMinutes",
        env: "STRIPE_LOOKBACK_MINUTES",
        label: "Look-back minutes",
        default: String(DEFAULT_LOOKBACK_MINUTES),
        description: "How far before the watermark the payment and paid-invoice polls re-read, to catch an intent or invoice that succeeded a while after it was created.",
        builderHint: "created is when an intent or invoice was made, not when it was paid, so the created filter opens this many minutes before the watermark; bank debits that settle later than this are missed."
      },
      {
        key: "failedLookbackMinutes",
        env: "STRIPE_FAILED_LOOKBACK_MINUTES",
        label: "Failed invoice look-back minutes",
        default: String(DEFAULT_FAILED_LOOKBACK_MINUTES),
        description: "How far before now the failed-invoice poll reads open invoices. A day by default, because retries are days apart.",
        builderHint: "Stripe records no time for a failed attempt, so this window is measured from now and the dedupe key carries the attempt count."
      }
    ],
    preflight: () => stripePreflight({
      ...text2(env.STRIPE_API_KEY) !== void 0 && { apiKey: env.STRIPE_API_KEY },
      ...text2(env.STRIPE_PROJECT) !== void 0 && { project: env.STRIPE_PROJECT },
      liveMode: text2(env.STRIPE_LIVE_MODE) === "true",
      ...options.stripe && { stripe: options.stripe }
    }),
    triggers: [
      {
        type: "newCustomer",
        label: "A customer is created",
        description: "Fires once for each customer created since the last poll.",
        dedupe: "timestamp",
        fetch: fetchCustomers,
        defaultWorkflow: { name: "Stripe: new customers", defaultCronFromMinutes: 5 },
        sample: [customerToItem(SAMPLE_CUSTOMER)]
      },
      {
        type: "paymentSucceeded",
        label: "A payment succeeds",
        description: "Fires once for each payment intent that reaches succeeded. Amounts are integers in the smallest currency unit.",
        dedupe: "timestamp",
        fetch: fetchSucceededPayments,
        statusMapping: [{ upstream: "succeeded", suggestedLocal: "done" }],
        defaultWorkflow: { name: "Stripe: payments", defaultCronFromMinutes: 5 },
        sample: [paymentIntentToItem(SAMPLE_PAYMENT_INTENT)]
      },
      {
        type: "invoicePaid",
        label: "An invoice is paid",
        description: "Fires once for each invoice that becomes paid, stamped with when it was paid.",
        dedupe: "timestamp",
        fetch: fetchPaidInvoices,
        statusMapping: [{ upstream: "paid", suggestedLocal: "done" }],
        defaultWorkflow: { name: "Stripe: paid invoices", defaultCronFromMinutes: 5 },
        sample: [invoicePaidToItem(SAMPLE_PAID_INVOICE)]
      },
      {
        type: "invoicePaymentFailed",
        label: "An invoice payment fails",
        description: "Fires once for each failed payment attempt on an open invoice, and again for each failed retry.",
        dedupe: "timestamp",
        fetch: fetchFailedInvoices,
        statusMapping: [{ upstream: "open", suggestedLocal: "todo" }],
        defaultWorkflow: { name: "Stripe: failed invoice payments", defaultCronFromMinutes: 15 },
        sample: [invoiceFailedToItem(SAMPLE_FAILED_INVOICE)]
      }
    ],
    actions: [
      {
        type: "createCustomer",
        label: "Create a customer",
        description: "Create a customer. Identical inputs within 24 hours return the first customer rather than a second one.",
        // Not idempotent in Stripe's sense: the Idempotency-Key makes a retry safe for a day, after which the same inputs create again.
        idempotent: false,
        inputs: [
          {
            key: "email",
            label: "Email",
            description: "Up to 512 characters, shown in the dashboard.",
            builderHint: "Not validated for uniqueness by Stripe; two customers may share one."
          },
          {
            key: "name",
            label: "Name",
            description: "Full or business name, up to 256 characters.",
            builderHint: "Sent as name; Stripe stores it as typed."
          },
          {
            key: "description",
            label: "Description",
            description: "Free text shown alongside the customer.",
            builderHint: "Sent as description, often used for an internal account reference."
          },
          {
            key: "metadata",
            label: "Metadata",
            type: "json",
            description: "A JSON object of string values, up to 50 keys of 40 characters with values of 500.",
            builderHint: "Sent as metadata[key]=value form fields; keys may not contain square brackets. Not shown to the customer."
          }
        ],
        outputs: [
          { key: "id", description: "The new customer id, cus_\u2026" },
          { key: "email", description: "Email as saved, or null" },
          { key: "name", description: "Name as saved, or null" },
          { key: "description", description: "Description as saved, or null" },
          { key: "created", description: "When it was created, ISO 8601" },
          { key: "metadata", description: "The metadata object as stored" },
          { key: "livemode", type: "boolean", description: "False for a sandbox customer" },
          { key: "url", description: "Where to open it in the dashboard" }
        ],
        async run(args, context) {
          const customer = await client(context).post(
            "/customers",
            {
              email: text2(args.email),
              name: text2(args.name),
              description: text2(args.description),
              metadata: metadataParams(args.metadata)
            },
            idempotencyKey("createCustomer", args)
          );
          const output = customerOutput(customer);
          return {
            id: output.id,
            email: output.email,
            name: output.name,
            description: output.description,
            created: output.created,
            metadata: output.metadata,
            livemode: output.livemode,
            url: output.url
          };
        }
      },
      {
        type: "getCustomer",
        label: "Get a customer",
        description: "Read a customer by id. A deleted customer comes back with deleted true and little else.",
        idempotent: true,
        inputs: [
          {
            key: "customer",
            label: "Customer",
            required: true,
            description: "Customer id such as cus_NffrFeUfNV2Hib.",
            builderHint: "Sent URL-encoded as the path segment of GET /v1/customers/:id; an unknown id answers 404 resource_missing."
          }
        ],
        outputs: [
          ...CUSTOMER_FIELDS,
          { key: "deleted", type: "boolean", description: "True when the customer was deleted" }
        ],
        // The reference's own example id, standing in for a real customer the live check may not have.
        sample: { customer: "cus_NffrFeUfNV2Hib" },
        async run(args, context) {
          const customer = await client(context).get(
            `/customers/${encodeURIComponent(String(args.customer))}`
          );
          return customerOutput(customer);
        }
      },
      {
        type: "listCharges",
        label: "List recent charges",
        description: "The most recent charges, newest first. Amounts are integers in the smallest currency unit.",
        idempotent: true,
        inputs: [
          LIMIT_INPUT,
          {
            key: "customer",
            label: "Customer",
            description: "Only this customer\u2019s charges. Blank for all.",
            builderHint: "Sent as the customer filter on GET /v1/charges."
          },
          STARTING_AFTER_INPUT("charge")
        ],
        outputs: [
          {
            key: "charges",
            description: "One entry per charge: id, amount, amountRefunded, currency, status, paid, refunded, captured, customer, paymentIntent, description, receiptUrl, failureCode, failureMessage, created, livemode"
          },
          { key: "hasMore", type: "boolean", description: "Whether another page follows the last id" }
        ],
        sample: { limit: "5" },
        async run(args, context) {
          const page2 = await client(context).get("/charges", {
            limit: pageSize(args.limit),
            customer: text2(args.customer),
            starting_after: text2(args.startingAfter)
          });
          return { charges: (page2.data ?? []).map(chargeOutput), hasMore: page2.has_more === true };
        }
      },
      {
        type: "createRefund",
        label: "Refund a payment",
        description: "Refund a payment intent or charge, in full or for an amount in the smallest currency unit. Identical inputs within 24 hours return the first refund.",
        // A retry with the same inputs replays the first refund; different inputs on a refunded charge answer charge_already_refunded.
        idempotent: false,
        inputs: [
          {
            key: "paymentIntent",
            label: "Payment intent",
            description: "The pi_\u2026 to refund. Give this or a charge.",
            builderHint: "Sent as payment_intent; Stripe refunds its latest charge."
          },
          {
            key: "charge",
            label: "Charge",
            description: "The ch_\u2026 to refund. Give this or a payment intent.",
            builderHint: "Sent as charge; the trigger and listCharges outputs carry ids that fit here."
          },
          {
            key: "amount",
            label: "Amount",
            type: "number",
            description: "Integer in the smallest currency unit: 1099 is 10.99 USD, 500 is 500 JPY. Omitted refunds what remains.",
            builderHint: "Never a decimal; refunding more than remains is an error from Stripe."
          },
          {
            key: "reason",
            label: "Reason",
            type: "select",
            options: REFUND_REASONS.map((value) => ({ value })),
            description: "duplicate, fraudulent or requested_by_customer. fraudulent adds the card to the block list.",
            builderHint: "Optional; shown in the dashboard and reported to the customer\u2019s bank as given."
          }
        ],
        outputs: [
          { key: "id", description: "Refund id, re_\u2026" },
          { key: "amount", type: "number", description: "Refunded amount in the smallest currency unit" },
          { key: "currency", description: "Three-letter currency" },
          { key: "status", description: "pending, requires_action, succeeded, failed or canceled" },
          { key: "charge", description: "The charge refunded" },
          { key: "paymentIntent", description: "The payment intent refunded, or null" },
          { key: "reason", description: "The reason as saved, or null" },
          { key: "failureReason", description: "Why a refund failed, or null" },
          { key: "created", description: "When it was created, ISO 8601" }
        ],
        async run(args, context) {
          const paymentIntent = text2(args.paymentIntent);
          const charge = text2(args.charge);
          if (!paymentIntent && !charge) throw new Error("createRefund needs a paymentIntent or a charge");
          const reason = text2(args.reason);
          if (reason !== void 0 && !REFUND_REASONS.includes(reason)) {
            throw new Error(`reason must be one of ${REFUND_REASONS.join(", ")}, got "${reason}"`);
          }
          const refund = await client(context).post(
            "/refunds",
            {
              payment_intent: paymentIntent,
              charge,
              amount: smallestUnit(args.amount, "amount"),
              reason
            },
            idempotencyKey("createRefund", args)
          );
          return {
            id: refund.id,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status ?? null,
            charge: refund.charge ?? null,
            paymentIntent: refund.payment_intent ?? null,
            reason: refund.reason ?? null,
            failureReason: refund.failure_reason ?? null,
            created: isoFromUnix(refund.created)
          };
        }
      },
      {
        type: "getBalance",
        label: "Get the account balance",
        description: "The current balance of the account the key belongs to, in the smallest currency unit per currency.",
        idempotent: true,
        inputs: [],
        outputs: [
          { key: "available", description: "Funds that can be paid out, as {amount, currency, sourceTypes} per currency" },
          { key: "pending", description: "Funds not yet available, in the same shape" },
          { key: "connectReserved", description: "Funds held in reserve for Connect, as {amount, currency}" },
          { key: "livemode", type: "boolean", description: "False for a sandbox balance" }
        ],
        sample: {},
        async run(_args, context) {
          const balance = await client(context).get("/balance");
          const funds = (entries) => (entries ?? []).map((entry) => ({
            amount: entry.amount,
            currency: entry.currency,
            sourceTypes: entry.source_types ?? {}
          }));
          return {
            available: funds(balance.available),
            pending: funds(balance.pending),
            connectReserved: (balance.connect_reserved ?? []).map((entry) => ({
              amount: entry.amount,
              currency: entry.currency
            })),
            livemode: balance.livemode === true
          };
        }
      },
      {
        type: "listCustomers",
        label: "List customers",
        description: "Customers newest first, optionally only those with one exact email address.",
        idempotent: true,
        inputs: [
          LIMIT_INPUT,
          {
            key: "email",
            label: "Email",
            description: "Exact, case-sensitive email address to filter by.",
            builderHint: "Sent as the email filter, which Stripe documents as a case-sensitive exact match."
          },
          STARTING_AFTER_INPUT("customer")
        ],
        outputs: [
          {
            key: "customers",
            description: "One entry per customer: id, email, name, description, phone, currency, balance, delinquent, created, metadata, deleted, livemode, url"
          },
          { key: "hasMore", type: "boolean", description: "Whether another page follows the last id" }
        ],
        sample: { limit: "5" },
        async run(args, context) {
          const page2 = await client(context).get("/customers", {
            limit: pageSize(args.limit),
            email: text2(args.email),
            starting_after: text2(args.startingAfter)
          });
          return { customers: (page2.data ?? []).map(customerOutput), hasMore: page2.has_more === true };
        }
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
  name: "@vornrun/connector-stripe",
  version: "0.1.1",
  description: "Trigger workflows from Stripe customers, payments and invoices, and create customers or refunds from a step.",
  type: "module",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "stripe"
  },
  keywords: [
    "vorn",
    "connector",
    "stripe"
  ],
  bin: {
    "vorn-connector-stripe": "dist/index.js"
  },
  main: "./dist/index.js",
  types: "./dist/index.d.ts",
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      default: "./dist/index.js"
    }
  },
  files: [
    "dist",
    "README.md",
    "CHANGELOG.md"
  ],
  scripts: {
    build: "tsup",
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
    publisher: "Vorn",
    category: "Finance",
    keywords: [
      "stripe",
      "payments",
      "customers",
      "invoices",
      "refunds",
      "billing",
      "charges"
    ],
    auth: "Borrows the Stripe CLI's login \u2014 `stripe login` is all it needs \u2014 or takes a restricted or secret API key if you would rather paste one.",
    hosts: [
      "api.stripe.com",
      "files.stripe.com"
    ]
  }
};
var { version } = package_default;
var stripeConnector = createStripeConnector({ version });
var index_default = stripeConnector;
serveIfEntryPoint(stripeConnector, import.meta.url);

// stripe/vorn-connector-pack.js
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
