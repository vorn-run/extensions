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
  const seconds2 = Number(trimmed);
  if (Number.isFinite(seconds2)) return Math.max(0, seconds2 * 1e3);
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
function resolveConfig(connector2, env = process.env) {
  const config = {};
  const missing = [];
  for (const field of connector2.config) {
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
      `Connector ${connector2.id} is missing required configuration: ${missing.join(", ")}`
    );
  }
  return config;
}
function connectionSetup(connector2, triggerType) {
  const trigger = connector2.triggers.find((entry) => entry.type === triggerType);
  if (!trigger) {
    throw new Error(`Connector ${connector2.id} has no trigger "${triggerType}"`);
  }
  return {
    connectorId: connector2.id,
    triggerType,
    env: connector2.config.map((field) => ({
      name: envNameFor(field.key, field.env),
      required: field.required === true,
      secret: field.secret === true,
      ...field.description !== void 0 && { description: field.description },
      ...field.builderHint !== void 0 && { builderHint: field.builderHint }
    }))
  };
}
function manifestContributions(connector2) {
  const contributes = connector2.contributes;
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
function connectorManifest(connector2) {
  const contributes = manifestContributions(connector2);
  return {
    protocol: PROTOCOL_VERSION,
    id: connector2.id,
    name: connector2.name,
    version: connector2.version,
    kind: connector2.kind,
    ...connector2.description !== void 0 && { description: connector2.description },
    ...connector2.icon !== void 0 && { icon: connector2.icon },
    ...connector2.auth !== void 0 && { auth: connector2.auth },
    ...contributes !== void 0 && { contributes },
    ...connector2.permissions !== void 0 && { permissions: connector2.permissions },
    ...connector2.activates !== void 0 && { activates: connector2.activates },
    triggers: connector2.triggers.map((trigger) => ({
      type: trigger.type,
      label: trigger.label,
      ...trigger.description !== void 0 && { description: trigger.description },
      // Carried through so the app can seed a connection's status mapping and
      // its polling workflow. Absent when the connector said nothing, which is
      // different from saying there is nothing.
      ...trigger.statusMapping !== void 0 && { statusMapping: trigger.statusMapping },
      ...trigger.defaultWorkflow !== void 0 && { defaultWorkflow: trigger.defaultWorkflow },
      setup: connectionSetup(connector2, trigger.type)
    })),
    actions: connector2.actions.map((action) => ({
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
function sessionFor(connector2, options, retryable) {
  if (connector2.auth?.rung !== "browser") return void 0;
  const fetchImpl = options.sessionFetchImpl ?? createSessionFetch(options.sessionCall ? { call: options.sessionCall } : {});
  return { fetch: wrap(fetchImpl, options, retryable) };
}
async function runPoll(connector2, triggerType, options = {}) {
  const trigger = connector2.triggers.find((entry) => entry.type === triggerType);
  if (!trigger) {
    throw new UnknownNameError(`${connector2.id} has no trigger "${triggerType}"`);
  }
  const now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
  const polledAt = now();
  const session = sessionFor(connector2, options, true);
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
async function runOptions(connector2, name, options = {}) {
  const loader = connector2.options?.[name];
  if (!loader) {
    throw new UnknownNameError(`${connector2.id} serves no options set "${name}"`);
  }
  const session = sessionFor(connector2, options, true);
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
async function runAction(connector2, actionType, args, options = {}) {
  const action = connector2.actions.find((entry) => entry.type === actionType);
  if (!action) {
    throw new UnknownNameError(`${connector2.id} has no action "${actionType}"`);
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
  const session = sessionFor(connector2, options, retryable);
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
function createConnectorServer(connector2, options = {}) {
  let cached = options.config;
  const config = () => cached ??= resolveConfig(connector2);
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
    [PROTOCOL_METHODS.manifest]: () => connectorManifest(connector2),
    // A throw is the connector saying "broken", which must not read as a passing check.
    [PROTOCOL_METHODS.preflight]: async () => {
      if (!connector2.preflight) return { ok: null };
      try {
        return { ...await connector2.preflight() };
      } catch (error) {
        return { ok: false, message: messageOf(error) };
      }
    },
    [PROTOCOL_METHODS.options]: async (params) => ({
      options: await runOptions(connector2, text(params, "name"), runtime(params))
    }),
    [PROTOCOL_METHODS.poll]: (params) => runPoll(connector2, text(params, "trigger"), {
      ...runtime(params),
      cursor: optionalText(params, "cursor"),
      since: optionalText(params, "since"),
      limit: optionalNumber(params, "limit")
    }),
    [PROTOCOL_METHODS.action]: (params) => {
      const action = text(params, "action");
      const args = params.args ?? {};
      if (!isRecord(args)) throw new InvalidParams('"args" must be an object');
      return runAction(connector2, action, args, runtime(params));
    },
    [PROTOCOL_METHODS.footer]: async (params) => {
      const id = text(params, "footer");
      const footer = connector2.contributes?.footers?.find((entry) => entry.id === id);
      if (!footer) throw new InvalidParams(`${connector2.id} contributes no footer "${id}"`);
      return { items: await footer.run(sessionContext(params)) };
    },
    [PROTOCOL_METHODS.handler]: async (params) => {
      const id = text(params, "handler");
      const handler = connector2.contributes?.linkHandlers?.find((entry) => entry.id === id);
      if (!handler) throw new InvalidParams(`${connector2.id} contributes no link handler "${id}"`);
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
        `Vorn offers connector protocol ${offered.join(", ") || "none"}; ${connector2.id} speaks ${PROTOCOL_VERSION}`
      );
    }
    greeted = true;
    const result = {
      protocol: PROTOCOL_VERSION,
      sdk: { name: "@vornrun/connector-sdk", version: SDK_VERSION },
      connector: { id: connector2.id, version: connector2.version, kind: connector2.kind }
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
async function serveConnector(connector2, options = {}) {
  const shared = globalThis;
  if (shared[SERVING]) return;
  shared[SERVING] = true;
  const reply2 = process.stdout.write.bind(process.stdout);
  process.stdout.write = process.stderr.write.bind(process.stderr);
  const server = createConnectorServer(connector2, options);
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
      process.stderr.write(`${connector2.id}: skipped a line that is not JSON
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
      process.stderr.write(`${connector2.id}: a message was over ${MAX_FRAME_BYTES} bytes
`);
      process.exit(1);
    })
  );
  process.stdin.on("end", () => {
    ended = true;
    finish();
  });
}

// openai/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  API_ROOT: () => API_ROOT,
  OpenAIApiError: () => OpenAIApiError,
  connector: () => connector,
  createOpenAIClient: () => createOpenAIClient,
  createOpenAIConnector: () => createOpenAIConnector,
  default: () => index_default,
  durationMs: () => durationMs,
  normalizeKey: () => normalizeKey,
  readSettings: () => readSettings
});
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var API_ROOT = "https://api.openai.com/v1";
var RETRYABLE_429_CODES = /* @__PURE__ */ new Set(["rate_limit_error", "rate_limit_exceeded", "slow_down", "server_is_overloaded"]);
var RETRYABLE_SERVER_STATUS = /* @__PURE__ */ new Set([500, 502, 503, 504]);
var DEFAULT_RATE_LIMIT_WAIT_MS = 2e3;
var DEFAULT_SERVER_ERROR_WAIT_MS = 1e3;
var MAX_JITTER_MS = 500;
var MAX_PREEMPTIVE_WAIT_MS = 1e4;
var MAX_ERROR_BODY2 = 300;
var KEY_HINT = "Create one at https://platform.openai.com/api-keys (Create new secret key) and set OPENAI_API_KEY on the connection.";
function normalizeKey(raw) {
  const key = String(raw ?? "").trim();
  if (key === "") throw new Error(`OPENAI_API_KEY is required. ${KEY_HINT}`);
  return key;
}
var DURATION_PART = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
var UNIT_MS = { ms: 1, s: 1e3, m: 6e4, h: 36e5 };
function durationMs(value) {
  const text22 = String(value ?? "").trim();
  if (text22 === "") return void 0;
  let total = 0;
  let matched = "";
  for (const part of text22.matchAll(DURATION_PART)) {
    total += Number(part[1]) * UNIT_MS[part[2]];
    matched += part[0];
  }
  return matched === text22 ? total : void 0;
}
function seconds(value) {
  if (value === null || value.trim() === "") return void 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : void 0;
}
var OpenAIApiError = class extends Error {
  status;
  code;
  type;
  param;
  requestId;
  constructor(status, body, requestId) {
    super(describeFailure2(status, body, requestId));
    this.name = "OpenAIApiError";
    const error = errorOf(body);
    this.status = status;
    this.code = error.code ?? void 0;
    this.type = error.type;
    this.param = error.param ?? void 0;
    this.requestId = requestId;
  }
};
function errorOf(body) {
  const error = body?.error;
  return typeof error === "object" && error !== null ? error : {};
}
function describeFailure2(status, body, requestId) {
  const error = errorOf(body);
  const label = error.code ?? error.type;
  let message = typeof error.message === "string" ? error.message.trim() : "";
  if (message === "") {
    const raw = typeof body === "string" ? body : body === void 0 ? "" : JSON.stringify(body);
    message = raw.length > MAX_ERROR_BODY2 ? `${raw.slice(0, MAX_ERROR_BODY2)}\u2026` : raw;
  }
  const head = label ? `${status} ${label}` : String(status);
  const tail = requestId ? ` (request ${requestId})` : "";
  return `${head}: ${message || "no body"}${tail}`;
}
var defaultSleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var defaultFetch = (input, init) => globalThis.fetch(input, init);
async function readBody2(response) {
  const text22 = await response.text();
  if (text22 === "") return void 0;
  try {
    return JSON.parse(text22);
  } catch {
    return text22;
  }
}
function createOpenAIClient(options) {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const sleep = options.sleep ?? defaultSleep;
  const warn = options.warn ?? ((message) => console.warn(message));
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const headers = {
    authorization: `Bearer ${options.apiKey}`,
    ...options.organization && { "openai-organization": options.organization },
    ...options.project && { "openai-project": options.project }
  };
  let exhaustedUntil = 0;
  async function pause(ms, why) {
    warn(`OpenAI: ${why}; waiting ${(ms / 1e3).toFixed(1)}s.`);
    await sleep(ms);
  }
  function jitter() {
    return Math.floor(random() * MAX_JITTER_MS);
  }
  function remember(response) {
    const remaining = seconds(response.headers.get("x-ratelimit-remaining-requests"));
    const reset = durationMs(response.headers.get("x-ratelimit-reset-requests"));
    if (remaining === 0 && reset !== void 0) exhaustedUntil = now() + reset;
  }
  async function waitForBudget() {
    const left = Math.min(MAX_PREEMPTIVE_WAIT_MS, exhaustedUntil - now());
    if (left > 0) await pause(left, "the request budget is spent");
  }
  async function request(method, path, opts = {}) {
    const url = new URL(`${API_ROOT}/${path.replace(/^\//, "")}`);
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== void 0 && value !== "") url.searchParams.set(key, String(value));
    }
    const init = {
      method: method.toUpperCase(),
      headers: opts.body === void 0 ? headers : { ...headers, "content-type": "application/json" },
      ...opts.body !== void 0 && { body: JSON.stringify(opts.body) }
    };
    const route = `${method.toUpperCase()} /${path.replace(/^\//, "")}`;
    let rateLimited = false;
    let serverErrored = false;
    for (; ; ) {
      await waitForBudget();
      const response = await fetchImpl(url.toString(), init);
      remember(response);
      const body = await readBody2(response);
      if (response.ok) return body;
      const requestId = response.headers.get("x-request-id") ?? void 0;
      const failure2 = new OpenAIApiError(response.status, body, requestId);
      const retryAfter = seconds(response.headers.get("retry-after"));
      if (response.status === 429) {
        const retryable = failure2.code === void 0 || RETRYABLE_429_CODES.has(failure2.code);
        if (!retryable || rateLimited) throw failure2;
        rateLimited = true;
        const asked = retryAfter !== void 0 ? retryAfter * 1e3 : durationMs(response.headers.get("x-ratelimit-reset-requests")) ?? DEFAULT_RATE_LIMIT_WAIT_MS;
        await pause(asked + jitter(), `${route} was rate limited`);
        continue;
      }
      if (RETRYABLE_SERVER_STATUS.has(response.status) && !serverErrored) {
        serverErrored = true;
        const asked = retryAfter !== void 0 ? retryAfter * 1e3 : DEFAULT_SERVER_ERROR_WAIT_MS;
        await pause(asked + jitter(), `${route} answered ${response.status}`);
        continue;
      }
      throw failure2;
    }
  }
  return {
    request,
    get: (path, query) => request("GET", path, { query })
  };
}
var PLATFORM_URL = "https://platform.openai.com";
var BATCH_TERMINAL_STATUSES = ["completed", "failed", "expired", "cancelled"];
var FINE_TUNING_TERMINAL_STATUSES = ["succeeded", "failed", "cancelled"];
function isoOf(seconds2) {
  return typeof seconds2 === "number" && Number.isFinite(seconds2) ? new Date(seconds2 * 1e3).toISOString() : null;
}
function secondsOf(iso) {
  return Math.floor(Date.parse(iso) / 1e3);
}
function isBatchTerminal(status) {
  return BATCH_TERMINAL_STATUSES.includes(status ?? "");
}
function isFineTuningTerminal(status) {
  return FINE_TUNING_TERMINAL_STATUSES.includes(status ?? "");
}
function batchFinishedAt(batch) {
  return batch.completed_at ?? batch.failed_at ?? batch.expired_at ?? batch.cancelled_at ?? batch.created_at ?? void 0;
}
function jobFinishedAt(job) {
  return job.finished_at ?? job.created_at ?? void 0;
}
function requestCountsText(batch) {
  const counts = batch.request_counts ?? {};
  const total = counts.total ?? 0;
  const completed = counts.completed ?? 0;
  const failed = counts.failed ?? 0;
  return `${completed} of ${total} requests, ${failed} failed`;
}
function batchToItem(batch) {
  const status = batch.status ?? "unknown";
  return {
    externalId: `${batch.id}:${status}`,
    title: `Batch ${batch.id} ${status}: ${requestCountsText(batch)}`,
    url: `${PLATFORM_URL}/batches/${encodeURIComponent(batch.id)}`,
    status,
    updatedAt: isoOf(batchFinishedAt(batch)) ?? void 0,
    data: { ...batch }
  };
}
function fileToItem(file) {
  const name = file.filename ?? file.id;
  const purpose = file.purpose ?? "unknown purpose";
  return {
    externalId: file.id,
    title: `${name} (${purpose}, ${file.bytes ?? 0} bytes)`,
    url: `${PLATFORM_URL}/storage/files/${encodeURIComponent(file.id)}`,
    updatedAt: isoOf(file.created_at) ?? void 0,
    data: { ...file }
  };
}
function fineTuningJobToItem(job) {
  const status = job.status ?? "unknown";
  const detail = status === "failed" && job.error?.message ? job.error.message : job.fine_tuned_model ?? job.model ?? job.id;
  return {
    externalId: `${job.id}:${status}`,
    title: `Fine-tuning job ${job.id} ${status}: ${detail}`,
    url: `${PLATFORM_URL}/finetune/${encodeURIComponent(job.id)}`,
    status,
    updatedAt: isoOf(jobFinishedAt(job)) ?? void 0,
    data: { ...job }
  };
}
function batchOutput(batch) {
  const counts = batch.request_counts ?? {};
  return {
    id: batch.id,
    status: batch.status ?? null,
    endpoint: batch.endpoint ?? null,
    inputFileId: batch.input_file_id ?? null,
    outputFileId: batch.output_file_id ?? null,
    errorFileId: batch.error_file_id ?? null,
    requestCounts: { total: counts.total ?? 0, completed: counts.completed ?? 0, failed: counts.failed ?? 0 },
    createdAt: isoOf(batch.created_at),
    completedAt: isoOf(batch.completed_at),
    failedAt: isoOf(batch.failed_at),
    expiredAt: isoOf(batch.expired_at),
    cancelledAt: isoOf(batch.cancelled_at),
    errors: batch.errors ?? null,
    metadata: batch.metadata ?? null,
    batch
  };
}
function fileSummary(file) {
  return {
    id: file.id,
    filename: file.filename ?? null,
    bytes: file.bytes ?? null,
    purpose: file.purpose ?? null,
    createdAt: isoOf(file.created_at),
    expiresAt: isoOf(file.expires_at)
  };
}
function modelSummary(model) {
  return {
    id: model.id,
    created: isoOf(model.created),
    ownedBy: model.owned_by ?? null,
    shutdownDate: model.shutdown_date ?? null
  };
}
var SAMPLE_BATCH = {
  id: "batch_abc123",
  object: "batch",
  endpoint: "/v1/chat/completions",
  errors: null,
  input_file_id: "file-abc123",
  completion_window: "24h",
  status: "completed",
  output_file_id: "file-cvaTdG",
  error_file_id: "file-HOWS94",
  created_at: 1711471533,
  in_progress_at: 1711471538,
  expires_at: 1711557933,
  finalizing_at: 1711493133,
  completed_at: 1711493163,
  failed_at: null,
  expired_at: null,
  cancelling_at: null,
  cancelled_at: null,
  request_counts: { total: 100, completed: 95, failed: 5 },
  metadata: { customer_id: "user_123456789", batch_description: "Nightly job" }
};
var SAMPLE_FILE = {
  id: "file-abc123",
  object: "file",
  bytes: 175,
  created_at: 1613677385,
  expires_at: 1677614202,
  filename: "salesOverview.pdf",
  purpose: "assistants"
};
var SAMPLE_FINE_TUNING_JOB = {
  object: "fine_tuning.job",
  id: "ftjob-abc123",
  model: "gpt-4o-mini-2024-07-18",
  created_at: 1721764800,
  finished_at: 1721851200,
  fine_tuned_model: "ft:gpt-4o-mini-2024-07-18:org::abc123",
  organization_id: "org-123",
  result_files: ["file-results123"],
  status: "succeeded",
  validation_file: null,
  training_file: "file-abc123",
  trained_tokens: 5768,
  error: null,
  metadata: { key: "value" }
};
var SAMPLE_BATCH_ITEM = batchToItem(SAMPLE_BATCH);
var SAMPLE_FILE_ITEM = fileToItem(SAMPLE_FILE);
var SAMPLE_FINE_TUNING_JOB_ITEM = fineTuningJobToItem(SAMPLE_FINE_TUNING_JOB);
var package_default = {
  name: "@vornrun/connector-openai",
  version: "0.1.1",
  description: "Trigger workflows when an OpenAI batch or fine-tuning job finishes or a file is uploaded, and create responses, chat completions, embeddings, moderations and batches from a step.",
  type: "module",
  license: "MIT",
  author: "Javier Canizalez <javier-canizalez@outlook.com>",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "openai"
  },
  keywords: [
    "vorn",
    "connector",
    "openai"
  ],
  bin: {
    "vorn-connector-openai": "dist/index.js"
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
    category: "AI",
    keywords: [
      "openai",
      "gpt",
      "chatgpt",
      "llm",
      "responses",
      "chat completions",
      "embeddings",
      "moderation",
      "batches",
      "fine-tuning"
    ],
    auth: "Paste an API key from https://platform.openai.com/api-keys. There is no OpenAI CLI to sign in with.",
    hosts: [
      "api.openai.com"
    ]
  }
};
var PAGE_SIZE = 100;
var MAX_PAGES = 5;
var DEFAULT_BATCH_LOOKBACK_HOURS = 48;
var DEFAULT_FINE_TUNING_LOOKBACK_HOURS = 168;
var FIRST_POLL_BATCH_HOURS = 24 * 7;
var FIRST_POLL_FILE_HOURS = 1;
var DEFAULT_LIST_FILES_LIMIT = 100;
var DEFAULT_SCHEMA_NAME = "output";
var BATCH_ENDPOINTS = [
  "/v1/responses",
  "/v1/chat/completions",
  "/v1/embeddings",
  "/v1/completions",
  "/v1/moderations",
  "/v1/images/generations",
  "/v1/images/edits",
  "/v1/videos"
];
var FILE_PURPOSES = [
  "assistants",
  "assistants_output",
  "batch",
  "batch_output",
  "fine-tune",
  "fine-tune-results",
  "vision",
  "user_data"
];
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? void 0 : trimmed;
}
function hours(value, env, fallback) {
  const raw = text2(value);
  if (raw === void 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${env} must be a number of hours of at least 0, got "${raw}"`);
  }
  return parsed;
}
function readSettings(config) {
  const organization = text2(config.organization);
  const project = text2(config.project);
  const batchEndpoint = text2(config.batchEndpoint);
  const filePurpose = text2(config.filePurpose);
  return {
    apiKey: normalizeKey(config.apiKey),
    ...organization && { organization },
    ...project && { project },
    ...batchEndpoint && { batchEndpoint },
    batchLookbackHours: hours(config.batchLookbackHours, "OPENAI_BATCH_LOOKBACK_HOURS", DEFAULT_BATCH_LOOKBACK_HOURS),
    ...filePurpose && { filePurpose },
    fineTuningLookbackHours: hours(
      config.fineTuningLookbackHours,
      "OPENAI_FINE_TUNING_LOOKBACK_HOURS",
      DEFAULT_FINE_TUNING_LOOKBACK_HOURS
    )
  };
}
function textOrJsonArray(value) {
  const raw = String(value ?? "");
  if (raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return raw;
}
function messageList(value, key = "messages") {
  const list = Array.isArray(value) ? value : [value];
  if (list.length === 0) throw new Error(`${key} must hold at least one message`);
  for (const message of list) {
    if (typeof message !== "object" || message === null || Array.isArray(message)) {
      throw new Error(`${key} must be a JSON array of { role, content } objects`);
    }
  }
  return list;
}
function jsonObject(value, key) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error(`${key} must be a JSON object`);
  return value;
}
function number(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function flag(value) {
  return /^(true|1|yes)$/i.test(String(value ?? "").trim());
}
function responseText(response) {
  const parts = [];
  for (const item of response.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") parts.push(part.text);
    }
  }
  return parts.join("");
}
function parsedJson(textValue) {
  try {
    return JSON.parse(textValue);
  } catch {
    return null;
  }
}
function createOpenAIConnector(options = {}) {
  const version = options.version ?? "0.0.0";
  const warn = options.warn ?? ((message) => console.warn(message));
  const env = options.env ?? process.env;
  function fromEnv(value) {
    const raw = text2(value);
    if (raw === void 0) return void 0;
    const match = /^\$([A-Z][A-Z0-9_]*)$/.exec(raw);
    return match ? text2(env[match[1]]) : raw;
  }
  function clientFor(config, fetchImpl) {
    const settings = readSettings(config);
    return createOpenAIClient({
      apiKey: settings.apiKey,
      ...settings.organization && { organization: settings.organization },
      ...settings.project && { project: settings.project },
      fetchImpl: options.fetchImpl ?? fetchImpl,
      ...options.sleep && { sleep: options.sleep },
      warn
    });
  }
  async function walk(client, path, query, floor) {
    const collected = /* @__PURE__ */ new Map();
    let after;
    for (let page2 = 0; page2 < MAX_PAGES; page2 += 1) {
      const body = await client.get(path, { ...query, limit: PAGE_SIZE, after });
      const data = Array.isArray(body?.data) ? body.data : [];
      for (const entry of data) if (entry?.id) collected.set(entry.id, entry);
      if (data.length === 0 || body.has_more !== true) break;
      const oldest = Math.min(...data.map((entry) => entry.created_at ?? Number.POSITIVE_INFINITY));
      if (oldest < floor) break;
      after = body.last_id ?? data[data.length - 1].id;
    }
    return [...collected.values()];
  }
  function sinceSeconds(context) {
    return context.since ? secondsOf(context.since) : void 0;
  }
  async function fetchBatches(context) {
    const settings = readSettings(context.config);
    const client = clientFor(context.config, context.fetch);
    const since = sinceSeconds(context);
    const firstPollFloor = secondsOf(context.now()) - FIRST_POLL_BATCH_HOURS * 3600;
    const pagingFloor = since === void 0 ? firstPollFloor : since - settings.batchLookbackHours * 3600;
    const batches = await walk(client, "batches", {}, pagingFloor);
    return batches.filter((batch) => isBatchTerminal(batch.status)).filter((batch) => settings.batchEndpoint === void 0 || batch.endpoint === settings.batchEndpoint).filter((batch) => since !== void 0 || (batchFinishedAt(batch) ?? 0) >= firstPollFloor).sort((left, right) => (batchFinishedAt(left) ?? 0) - (batchFinishedAt(right) ?? 0)).map(batchToItem);
  }
  async function fetchFiles(context) {
    const settings = readSettings(context.config);
    const client = clientFor(context.config, context.fetch);
    const floor = sinceSeconds(context) ?? secondsOf(context.now()) - FIRST_POLL_FILE_HOURS * 3600;
    const files = await walk(client, "files", { order: "desc", purpose: settings.filePurpose }, floor);
    return files.filter((file) => (file.created_at ?? 0) >= floor).sort((left, right) => (left.created_at ?? 0) - (right.created_at ?? 0)).map(fileToItem);
  }
  async function fetchFineTuningJobs(context) {
    const settings = readSettings(context.config);
    const client = clientFor(context.config, context.fetch);
    const lookback = settings.fineTuningLookbackHours * 3600;
    const since = sinceSeconds(context) ?? secondsOf(context.now()) - lookback;
    const jobs = await walk(client, "fine_tuning/jobs", {}, since - lookback);
    return jobs.filter((job) => isFineTuningTerminal(job.status)).filter((job) => (jobFinishedAt(job) ?? 0) >= since).sort((left, right) => (jobFinishedAt(left) ?? 0) - (jobFinishedAt(right) ?? 0)).map(fineTuningJobToItem);
  }
  function requiredArg(args, key) {
    const value = fromEnv(args[key]);
    if (!value) throw new Error(`${key} is required`);
    return value;
  }
  const MODEL_INPUT = {
    key: "model",
    label: "Model",
    required: true,
    description: "Model id, such as gpt-4o-mini.",
    builderHint: "Any id listModels returns. A fine-tuned model is its ft:\u2026 id."
  };
  const TEMPERATURE_INPUT = {
    key: "temperature",
    label: "Temperature",
    type: "number",
    description: "Sampling temperature, 0 to 2. Lower is more deterministic.",
    builderHint: "Alter this or top_p, not both; leave empty for the model default of 1."
  };
  return defineConnector({
    id: "openai",
    name: "OpenAI",
    version,
    description: "Trigger workflows when an OpenAI batch or fine-tuning job finishes or a file is uploaded, and create responses, chat completions, embeddings, moderations and batches from a step.",
    auth: { rung: "key", keys: ["apiKey"] },
    // The hexagonal knot: six interlaced loops as one path, the counters punched through by the evenodd rule.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
      ]
    },
    config: [
      {
        key: "apiKey",
        env: "OPENAI_API_KEY",
        label: "API key",
        secret: true,
        required: true,
        description: `Sent as \`Authorization: Bearer <key>\`. ${KEY_HINT}`,
        builderHint: "A standard or project key (sk-\u2026 or sk-proj-\u2026), not an Admin key: Admin keys serve only the Administration API. Permissions are set per key at creation; a key that lacks an endpoint answers 401 insufficient permissions. Pasted whitespace is trimmed."
      },
      {
        key: "organization",
        env: "OPENAI_ORGANIZATION",
        label: "Organization",
        description: "Organization id (org-\u2026), sent as OpenAI-Organization. Only needed when the key belongs to more than one organization.",
        builderHint: "Settings \u2192 Organization \u2192 General. Leave empty for a project key, which is already scoped."
      },
      {
        key: "project",
        env: "OPENAI_PROJECT",
        label: "Project",
        description: "Project id (proj_\u2026), sent as OpenAI-Project. Only needed when a legacy user key should bill one project.",
        builderHint: "Settings \u2192 Project \u2192 General. Leave empty for a project key."
      },
      {
        key: "batchEndpoint",
        env: "OPENAI_BATCH_ENDPOINT",
        label: "Batch endpoint filter",
        description: "Only batches for this endpoint, such as /v1/chat/completions. Empty delivers every batch.",
        builderHint: "The list has no server-side filter; the connector compares the batch object\u2019s endpoint field."
      },
      {
        key: "batchLookbackHours",
        env: "OPENAI_BATCH_LOOKBACK_HOURS",
        label: "Batch look-back (hours)",
        default: String(DEFAULT_BATCH_LOOKBACK_HOURS),
        description: "How far before the watermark the batch poll reads, because a batch finishes up to a day after it is created.",
        builderHint: "Raise it if batches take longer than two days to finish or expire; lower it for a busy account."
      },
      {
        key: "filePurpose",
        env: "OPENAI_FILE_PURPOSE",
        label: "File purpose filter",
        description: `Only files uploaded with this purpose (${FILE_PURPOSES.join(", ")}). Empty delivers every file.`,
        builderHint: "Passed through as the purpose query parameter, so the API does the filtering."
      },
      {
        key: "fineTuningLookbackHours",
        env: "OPENAI_FINE_TUNING_LOOKBACK_HOURS",
        label: "Fine-tuning look-back (hours)",
        default: String(DEFAULT_FINE_TUNING_LOOKBACK_HOURS),
        description: "How far before the watermark the fine-tuning poll reads, because a job is created long before it finishes.",
        builderHint: "A week by default. Jobs that queue longer than this before finishing are missed."
      }
    ],
    async preflight() {
      const key = text2(env.OPENAI_API_KEY);
      if (!key) return { ok: false, message: `Set OPENAI_API_KEY. ${KEY_HINT}` };
      const client = createOpenAIClient({
        apiKey: normalizeKey(key),
        ...text2(env.OPENAI_ORGANIZATION) && { organization: text2(env.OPENAI_ORGANIZATION) },
        ...text2(env.OPENAI_PROJECT) && { project: text2(env.OPENAI_PROJECT) },
        ...options.fetchImpl && { fetchImpl: options.fetchImpl },
        ...options.sleep && { sleep: options.sleep },
        warn
      });
      const models = await client.get("models");
      const count = Array.isArray(models?.data) ? models.data.length : 0;
      return { ok: true, message: `Signed in; ${count} models available` };
    },
    triggers: [
      {
        type: "batchFinished",
        label: "A batch finishes",
        description: "Fires once when a batch reaches completed, failed, expired or cancelled. The list has no status filter, so every batch created inside the look-back is read and the terminal ones kept.",
        defaultWorkflow: { name: "OpenAI: finished batches", defaultCronFromMinutes: 5 },
        statusMapping: [
          { upstream: "completed", suggestedLocal: "done" },
          { upstream: "failed", suggestedLocal: "todo" },
          { upstream: "expired", suggestedLocal: "cancelled" },
          { upstream: "cancelled", suggestedLocal: "cancelled" }
        ],
        dedupe: "timestamp",
        sample: [SAMPLE_BATCH_ITEM],
        fetch: fetchBatches
      },
      {
        type: "fileUploaded",
        label: "A file is uploaded",
        description: "Fires once per file uploaded since the last poll, newest first from GET /files.",
        defaultWorkflow: { name: "OpenAI: uploaded files", defaultCronFromMinutes: 5 },
        dedupe: "timestamp",
        sample: [SAMPLE_FILE_ITEM],
        fetch: fetchFiles
      },
      {
        type: "fineTuningJobFinished",
        label: "A fine-tuning job finishes",
        description: "Fires once when a fine-tuning job reaches succeeded, failed or cancelled.",
        defaultWorkflow: { name: "OpenAI: finished fine-tuning jobs", defaultCronFromMinutes: 15 },
        statusMapping: [
          { upstream: "succeeded", suggestedLocal: "done" },
          { upstream: "failed", suggestedLocal: "todo" },
          { upstream: "cancelled", suggestedLocal: "cancelled" }
        ],
        dedupe: "timestamp",
        sample: [SAMPLE_FINE_TUNING_JOB_ITEM],
        fetch: fetchFineTuningJobs
      }
    ],
    actions: [
      {
        type: "createResponse",
        label: "Create a response",
        description: "Ask a model for a response with the Responses API, optionally constrained to a JSON schema. Spends tokens; not stored unless asked.",
        idempotent: false,
        inputs: [
          MODEL_INPUT,
          {
            key: "input",
            label: "Input",
            required: true,
            description: "Plain text, or a JSON array of message items { role, content } with role user, assistant, system or developer.",
            builderHint: "A value that parses as a JSON array is sent as the array; anything else is sent as text."
          },
          {
            key: "instructions",
            label: "Instructions",
            description: "A system or developer message inserted into the model\u2019s context.",
            builderHint: "Prefer this over a system message in input; it is not carried into a later turn."
          },
          TEMPERATURE_INPUT,
          {
            key: "maxOutputTokens",
            label: "Max output tokens",
            type: "number",
            description: "Upper bound on generated tokens, including reasoning tokens. Sent as max_output_tokens.",
            builderHint: "The API refuses values under 16. A response cut here reports incompleteReason max_output_tokens."
          },
          {
            key: "schema",
            label: "JSON schema",
            type: "json",
            description: "A JSON Schema object the output must match, sent as text.format json_schema with strict true.",
            builderHint: "Strict mode wants every property in required and additionalProperties false. The parsed result is the json output."
          },
          {
            key: "schemaName",
            label: "Schema name",
            description: `Name of the format, letters, digits, underscores and dashes up to 64 characters. Default ${DEFAULT_SCHEMA_NAME}.`,
            builderHint: "Only read when schema is given."
          },
          {
            key: "store",
            label: "Store the response",
            type: "boolean",
            description: "Keep the response retrievable for 30 days. Off here by default, unlike the API.",
            builderHint: "true when a later step needs previous_response_id."
          }
        ],
        outputs: [
          { key: "id", description: "Response id" },
          { key: "status", description: "completed, incomplete, failed or in_progress" },
          { key: "text", description: "Every output_text part of every message, joined" },
          { key: "json", description: "The text parsed as JSON when a schema was given, else null" },
          { key: "model", description: "The model that answered" },
          { key: "usage", description: "{ input_tokens, output_tokens, total_tokens, reasoning_tokens }" },
          { key: "incompleteReason", description: "Why the response stopped early, or null" },
          { key: "response", description: "The raw response object" }
        ],
        async run(args, context) {
          const schema = jsonObject(args.schema, "schema");
          const schemaName = text2(args.schemaName) ?? DEFAULT_SCHEMA_NAME;
          const temperature = number(args.temperature);
          const maxOutputTokens = number(args.maxOutputTokens);
          const instructions = text2(args.instructions);
          const client = clientFor(context.config, context.fetch);
          const response = await client.request("POST", "responses", {
            body: {
              model: requiredArg(args, "model"),
              input: textOrJsonArray(args.input),
              store: flag(args.store),
              ...instructions && { instructions },
              ...temperature !== void 0 && { temperature },
              ...maxOutputTokens !== void 0 && { max_output_tokens: maxOutputTokens },
              ...schema && { text: { format: { type: "json_schema", name: schemaName, schema, strict: true } } }
            }
          });
          const body = response ?? {};
          const output = responseText(body);
          return {
            id: body.id ?? null,
            status: body.status ?? null,
            text: output,
            json: schema ? parsedJson(output) : null,
            model: body.model ?? null,
            usage: {
              input_tokens: body.usage?.input_tokens ?? 0,
              output_tokens: body.usage?.output_tokens ?? 0,
              total_tokens: body.usage?.total_tokens ?? 0,
              reasoning_tokens: body.usage?.output_tokens_details?.reasoning_tokens ?? 0
            },
            incompleteReason: body.incomplete_details?.reason ?? null,
            response: body
          };
        }
      },
      {
        type: "createChatCompletion",
        label: "Create a chat completion",
        description: "Ask a model for the next message in a conversation with the Chat Completions API. Spends tokens.",
        idempotent: false,
        inputs: [
          MODEL_INPUT,
          {
            key: "messages",
            label: "Messages",
            type: "json",
            required: true,
            description: "A JSON array of { role, content } with role system, developer, user, assistant or tool.",
            builderHint: "One object is taken as a single message."
          },
          TEMPERATURE_INPUT,
          {
            key: "maxTokens",
            label: "Max completion tokens",
            type: "number",
            description: "Upper bound on generated tokens, including reasoning tokens. Sent as max_completion_tokens.",
            builderHint: "max_tokens is deprecated and refused by o-series models, so this never sends it."
          },
          {
            key: "responseFormat",
            label: "Response format",
            type: "json",
            description: 'JSON: { "type": "text" }, { "type": "json_object" } or { "type": "json_schema", "json_schema": { name, schema, strict } }.',
            builderHint: "json_object needs the word JSON somewhere in the messages or the API refuses."
          }
        ],
        outputs: [
          { key: "id", description: "Completion id" },
          { key: "text", description: "Content of the first choice" },
          { key: "finishReason", description: "stop, length, tool_calls, content_filter or function_call" },
          { key: "refusal", description: "The refusal message of the first choice, or null" },
          { key: "model", description: "The model that answered" },
          { key: "usage", description: "{ prompt_tokens, completion_tokens, total_tokens }" },
          { key: "completion", description: "The raw completion object" }
        ],
        async run(args, context) {
          const temperature = number(args.temperature);
          const maxTokens = number(args.maxTokens);
          const responseFormat = jsonObject(args.responseFormat, "responseFormat");
          const client = clientFor(context.config, context.fetch);
          const completion = await client.request("POST", "chat/completions", {
            body: {
              model: requiredArg(args, "model"),
              messages: messageList(args.messages),
              ...temperature !== void 0 && { temperature },
              ...maxTokens !== void 0 && { max_completion_tokens: maxTokens },
              ...responseFormat && { response_format: responseFormat }
            }
          });
          const body = completion ?? {};
          const first = body.choices?.[0];
          return {
            id: body.id ?? null,
            text: first?.message?.content ?? "",
            finishReason: first?.finish_reason ?? null,
            refusal: first?.message?.refusal ?? null,
            model: body.model ?? null,
            usage: {
              prompt_tokens: body.usage?.prompt_tokens ?? 0,
              completion_tokens: body.usage?.completion_tokens ?? 0,
              total_tokens: body.usage?.total_tokens ?? 0
            },
            completion: body
          };
        }
      },
      {
        type: "createEmbeddings",
        label: "Create embeddings",
        description: "Turn text into embedding vectors. The same input yields the same vectors and nothing is stored.",
        idempotent: true,
        sample: { model: "text-embedding-3-small", input: "hello" },
        inputs: [
          {
            ...MODEL_INPUT,
            description: "text-embedding-3-small, text-embedding-3-large or text-embedding-ada-002.",
            builderHint: "text-embedding-3-small is the cheapest; dimensions only works on the 3 series."
          },
          {
            key: "input",
            label: "Input",
            required: true,
            description: "Plain text, or a JSON array of strings to embed in one call.",
            builderHint: "Each string at most 8192 tokens, an array at most 2048 entries."
          },
          {
            key: "dimensions",
            label: "Dimensions",
            type: "number",
            description: "How many dimensions each vector should have. text-embedding-3 models only.",
            builderHint: "Leave empty for the model default (1536 for small, 3072 for large)."
          }
        ],
        outputs: [
          { key: "embeddings", description: "Array of number arrays, in input order" },
          { key: "dimensions", type: "number", description: "Length of the first vector" },
          { key: "model", description: "The model used" },
          { key: "usage", description: "{ prompt_tokens, total_tokens }" }
        ],
        async run(args, context) {
          const dimensions = number(args.dimensions);
          const client = clientFor(context.config, context.fetch);
          const body = await client.request("POST", "embeddings", {
            body: {
              model: requiredArg(args, "model"),
              input: textOrJsonArray(args.input),
              ...dimensions !== void 0 && { dimensions }
            }
          });
          const embeddings = [...body?.data ?? []].sort((left, right) => (left.index ?? 0) - (right.index ?? 0)).map((entry) => entry.embedding ?? []);
          return {
            embeddings,
            dimensions: embeddings[0]?.length ?? 0,
            model: body?.model ?? null,
            usage: { prompt_tokens: body?.usage?.prompt_tokens ?? 0, total_tokens: body?.usage?.total_tokens ?? 0 }
          };
        }
      },
      {
        type: "moderateText",
        label: "Moderate text",
        description: "Classify text against OpenAI\u2019s usage policies. Free, and nothing is stored.",
        idempotent: true,
        sample: { input: "hello" },
        inputs: [
          {
            key: "input",
            label: "Input",
            required: true,
            description: "Plain text, or a JSON array of strings to classify separately.",
            builderHint: "One result per string, in order."
          },
          {
            key: "model",
            label: "Model",
            description: "omni-moderation-latest (default), omni-moderation-2024-09-26, text-moderation-latest or text-moderation-stable.",
            builderHint: "Leave empty for omni-moderation-latest."
          }
        ],
        outputs: [
          { key: "flagged", type: "boolean", description: "True when any result is flagged" },
          { key: "results", description: "Array of { flagged, categories, category_scores, category_applied_input_types }" },
          { key: "model", description: "The moderation model used" },
          { key: "id", description: "Moderation id" }
        ],
        async run(args, context) {
          const model = text2(args.model);
          const client = clientFor(context.config, context.fetch);
          const body = await client.request("POST", "moderations", {
            body: { input: textOrJsonArray(args.input), ...model && { model } }
          });
          const results = Array.isArray(body?.results) ? body.results : [];
          return {
            flagged: results.some((result) => result?.flagged === true),
            results,
            model: body?.model ?? null,
            id: body?.id ?? null
          };
        }
      },
      {
        type: "listModels",
        label: "List models",
        description: "List the models the key can use, with their owner.",
        idempotent: true,
        sample: {},
        outputs: [
          { key: "models", description: "Array of { id, created, ownedBy, shutdownDate }" },
          { key: "count", type: "number", description: "How many models" }
        ],
        async run(_args, context) {
          const client = clientFor(context.config, context.fetch);
          const body = await client.get("models");
          const models = (Array.isArray(body?.data) ? body.data : []).map(modelSummary);
          return { models, count: models.length };
        }
      },
      {
        type: "getModel",
        label: "Get a model",
        description: "Read one model by id. An unknown id answers 404 model_not_found.",
        idempotent: true,
        sample: { model: "gpt-4o-mini" },
        inputs: [MODEL_INPUT],
        outputs: [
          { key: "id", description: "Model id" },
          { key: "created", description: "When it was created, ISO 8601" },
          { key: "ownedBy", description: "The organization that owns it" },
          { key: "shutdownDate", description: "Planned retirement date, or null" }
        ],
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const model = await client.get(`models/${encodeURIComponent(requiredArg(args, "model"))}`);
          return modelSummary(model ?? { id: requiredArg(args, "model") });
        }
      },
      {
        type: "listFiles",
        label: "List files",
        description: "List uploaded files, newest first, optionally by purpose.",
        idempotent: true,
        sample: { limit: "5" },
        inputs: [
          {
            key: "purpose",
            label: "Purpose",
            type: "select",
            options: FILE_PURPOSES.map((value) => ({ value })),
            description: "Only files uploaded with this purpose.",
            builderHint: "Leave empty for every purpose."
          },
          {
            key: "limit",
            label: "Limit",
            type: "number",
            description: `1 to 10,000 files per page; default ${DEFAULT_LIST_FILES_LIMIT}.`,
            builderHint: "The API default is 10,000, which is a lot to hand a workflow step."
          },
          {
            key: "order",
            label: "Order",
            type: "select",
            options: [{ value: "desc", label: "Newest first" }, { value: "asc", label: "Oldest first" }],
            description: "Sort by created_at. Default desc.",
            builderHint: "asc with after walks a backlog oldest first."
          },
          {
            key: "after",
            label: "After",
            description: "A file id from an earlier page; the list continues after it.",
            builderHint: "Feed lastId from the previous call."
          }
        ],
        outputs: [
          { key: "files", description: "Array of { id, filename, bytes, purpose, createdAt, expiresAt }" },
          { key: "hasMore", type: "boolean", description: "Whether another page follows" },
          { key: "lastId", description: "Id of the last file listed, for after" }
        ],
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const body = await client.get("files", {
            purpose: text2(args.purpose),
            limit: number(args.limit) ?? DEFAULT_LIST_FILES_LIMIT,
            order: text2(args.order),
            after: text2(args.after)
          });
          const files = Array.isArray(body?.data) ? body.data : [];
          return {
            files: files.map(fileSummary),
            hasMore: body?.has_more === true,
            lastId: body?.last_id ?? files[files.length - 1]?.id ?? null
          };
        }
      },
      {
        type: "getBatch",
        label: "Get a batch",
        description: "Read one batch by id, with its status, request counts and output files.",
        idempotent: true,
        sample: { batch: "$OPENAI_BATCH_ID" },
        inputs: [
          {
            key: "batch",
            label: "Batch",
            required: true,
            description: "Batch id, such as batch_abc123.",
            builderHint: "Often {{trigger.item.id}} from the batch trigger. $NAME reads the environment for live checks."
          }
        ],
        outputs: batchOutputs(),
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const id = requiredArg(args, "batch");
          const batch = await client.get(`batches/${encodeURIComponent(id)}`);
          return batchOutput(batch ?? { id });
        }
      },
      {
        type: "createBatch",
        label: "Create a batch",
        description: "Queue a batch of requests from an uploaded JSONL file. Each call queues a new batch that runs and bills.",
        idempotent: false,
        inputs: [
          {
            key: "inputFileId",
            label: "Input file",
            required: true,
            description: "Id of an uploaded JSONL file with purpose batch, one request per line.",
            builderHint: "Upload with the Files API first; this connector does not upload."
          },
          {
            key: "endpoint",
            label: "Endpoint",
            type: "select",
            required: true,
            options: BATCH_ENDPOINTS.map((value) => ({ value })),
            description: "The endpoint every request in the file targets.",
            builderHint: "Must match the url field of each line in the file."
          },
          {
            key: "completionWindow",
            label: "Completion window",
            type: "select",
            options: [{ value: "24h" }],
            description: "How long the batch has to finish. Only 24h is supported; default 24h.",
            builderHint: "Left as a select so a future window can be added without a code change."
          },
          {
            key: "metadata",
            label: "Metadata",
            type: "json",
            description: "A JSON object of up to 16 string pairs, keys up to 64 characters and values up to 512.",
            builderHint: "Comes back on the batch object and in the trigger item\u2019s data.metadata."
          }
        ],
        outputs: batchOutputs(),
        async run(args, context) {
          const metadata = jsonObject(args.metadata, "metadata");
          const client = clientFor(context.config, context.fetch);
          const batch = await client.request("POST", "batches", {
            body: {
              input_file_id: requiredArg(args, "inputFileId"),
              endpoint: requiredArg(args, "endpoint"),
              completion_window: text2(args.completionWindow) ?? "24h",
              ...metadata && { metadata }
            }
          });
          return batchOutput(batch ?? { id: "" });
        }
      }
    ]
  });
}
function batchOutputs() {
  return [
    { key: "id", description: "Batch id" },
    { key: "status", description: "validating, failed, in_progress, finalizing, completed, expired, cancelling or cancelled" },
    { key: "endpoint", description: "The endpoint the batch calls" },
    { key: "inputFileId", description: "The JSONL file of requests" },
    { key: "outputFileId", description: "The file of results, once completed" },
    { key: "errorFileId", description: "The file of failed requests, or null" },
    { key: "requestCounts", description: "{ total, completed, failed }" },
    { key: "createdAt", description: "When it was created, ISO 8601" },
    { key: "completedAt", description: "When it completed, or null" },
    { key: "failedAt", description: "When it failed, or null" },
    { key: "expiredAt", description: "When it expired, or null" },
    { key: "cancelledAt", description: "When it was cancelled, or null" },
    { key: "errors", description: "Validation errors, or null" },
    { key: "metadata", description: "The metadata it was created with" },
    { key: "batch", description: "The raw batch object" }
  ];
}
var connector = createOpenAIConnector({ version: package_default.version });
function isEntryPoint(moduleUrl, argv = process.argv) {
  const invoked = argv[1];
  if (invoked === void 0) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(invoked);
  } catch {
    return false;
  }
}
async function serveIfEntryPoint(moduleUrl, serve = serveConnector) {
  if (!isEntryPoint(moduleUrl)) return false;
  await serve(connector);
  return true;
}
var index_default = connector;
await serveIfEntryPoint(import.meta.url);

// openai/vorn-connector-pack.js
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
