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
  let parsed2;
  try {
    parsed2 = new URL(url);
  } catch {
    throw fail(`${names.urlVar} is ${JSON.stringify(url)}, which is not a URL`);
  }
  if (parsed2.protocol !== "http:" || !LOOPBACK_HOSTS.includes(parsed2.hostname)) {
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
  let parsed2;
  try {
    parsed2 = JSON.parse(text22);
  } catch {
    throw new Error("The signed-in window answered with a body that is not JSON");
  }
  const reply2 = parsed2;
  if (!parsed2 || typeof parsed2 !== "object" || typeof reply2.status !== "number") {
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
  let parsed2;
  try {
    parsed2 = new URL(url);
  } catch {
    return false;
  }
  if (parsed2.protocol !== "https:" || parsed2.port !== "") return false;
  const target = parsed2.hostname.toLowerCase();
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
    let parsed2;
    try {
      parsed2 = JSON.parse(text22);
    } catch {
      throw new HostReplyError(method, "a body that is not JSON");
    }
    if (!parsed2 || typeof parsed2 !== "object" || !("result" in parsed2)) {
      throw new HostReplyError(method, "a body carrying no result");
    }
    return parsed2.result;
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
  let parsed2;
  try {
    parsed2 = JSON.parse(cursor);
  } catch (error) {
    throw new Error(`Cursor is not valid SDK cursor JSON: ${cursor}`, { cause: error });
  }
  const state = parsed2;
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
    const parsed2 = typeof value2 === "string" ? Number(value2) : Number.NaN;
    if (Number.isNaN(parsed2)) throw new Error(`Expected a number, got ${shown(value2)}`);
    return parsed2;
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

// hubspot/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  API_ROOT: () => API_ROOT,
  ASSOCIATIONS_PATH: () => ASSOCIATIONS_PATH,
  CRM_PATH: () => CRM_PATH,
  DEFAULT_PROPERTIES: () => DEFAULT_PROPERTIES,
  DEFAULT_RATE_LIMIT_INTERVAL_MS: () => DEFAULT_RATE_LIMIT_INTERVAL_MS,
  HubSpotApiError: () => HubSpotApiError,
  INDEXING_MARGIN_MS: () => INDEXING_MARGIN_MS,
  MAX_RETRY_AFTER_MS: () => MAX_RETRY_AFTER_MS,
  MAX_SEARCH_LIMIT: () => MAX_SEARCH_LIMIT,
  MAX_SEARCH_PAGES: () => MAX_SEARCH_PAGES,
  NOTE_ASSOCIATION_TYPE_IDS: () => NOTE_ASSOCIATION_TYPE_IDS,
  OBJECTS_PATH: () => OBJECTS_PATH,
  OBJECT_TYPE_IDS: () => OBJECT_TYPE_IDS,
  RATE_LIMIT_RETRY_MS: () => RATE_LIMIT_RETRY_MS,
  SAMPLE_COMPANY: () => SAMPLE_COMPANY,
  SAMPLE_CONTACT: () => SAMPLE_CONTACT,
  SAMPLE_DEAL: () => SAMPLE_DEAL,
  STAGE_LOOKBACK_MS: () => STAGE_LOOKBACK_MS,
  companyTitle: () => companyTitle,
  connector: () => connector,
  contactTitle: () => contactTitle,
  count: () => count,
  createHubSpotClient: () => createHubSpotClient,
  createHubSpotConnector: () => createHubSpotConnector,
  createdToItem: () => createdToItem,
  dealTitle: () => dealTitle,
  default: () => index_default,
  epochMillis: () => epochMillis,
  filter: () => filter,
  filterGroupsArg: () => filterGroupsArg,
  isEmail: () => isEmail,
  modifiedAt: () => modifiedAt,
  namesArg: () => namesArg,
  propertiesArg: () => propertiesArg,
  property: () => property,
  recordOutput: () => recordOutput,
  recordUrl: () => recordUrl,
  retryAfterMs: () => retryAfterMs2,
  stageToItem: () => stageToItem
});
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var API_ROOT = "https://api.hubapi.com";
var OBJECTS_PATH = "/crm/v3/objects";
var CRM_PATH = "/crm/v3";
var ASSOCIATIONS_PATH = "/crm/v4/objects";
var MAX_SEARCH_LIMIT = 200;
var MAX_SEARCH_PAGES = 10;
var RATE_LIMIT_RETRY_MS = 1e3;
var MAX_RETRY_AFTER_MS = 3e4;
var DEFAULT_RATE_LIMIT_INTERVAL_MS = 1e4;
var SERVER_ERROR_BACKOFF_MS = 500;
var MAX_ERROR_BODY2 = 300;
var HubSpotApiError = class extends Error {
  status;
  category;
  correlationId;
  policyName;
  constructor(status, detail) {
    const suffix = [detail.errorType, detail.policyName].filter(Boolean).join(" ");
    super(
      `${detail.category ? `${detail.category}: ` : ""}${detail.message}${detail.correlationId ? ` (${detail.correlationId})` : ""}${suffix ? ` [${suffix}]` : ""}`
    );
    this.name = "HubSpotApiError";
    this.status = status;
    this.category = detail.category;
    this.correlationId = detail.correlationId;
    this.policyName = detail.policyName;
  }
};
var wait2 = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
function retryAfterMs2(header, now) {
  const trimmed = (header ?? "").trim();
  if (trimmed === "") return void 0;
  const millis = Number(trimmed);
  if (Number.isFinite(millis)) return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, millis));
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? void 0 : Math.min(MAX_RETRY_AFTER_MS, Math.max(0, at - now));
}
async function readError(response) {
  const text22 = await response.text().catch(() => "");
  try {
    const parsed2 = JSON.parse(text22);
    if (typeof parsed2 === "object" && parsed2 !== null) return { ...parsed2, text: text22 };
  } catch {
  }
  return { text: text22 };
}
function describeFailure2(status, body) {
  const quoted = body.text.length > MAX_ERROR_BODY2 ? `${body.text.slice(0, MAX_ERROR_BODY2)}\u2026` : body.text;
  const message = body.message ?? `HubSpot API ${status}${quoted ? `: ${quoted}` : ""}`;
  return new HubSpotApiError(status, { ...body, message });
}
function compact(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== null && value !== "") out[key] = value;
  }
  return out;
}
function createHubSpotClient(options) {
  const accessToken = options.accessToken.trim();
  if (!accessToken) throw new Error("HUBSPOT_ACCESS_TOKEN is required");
  const sleep = options.sleep ?? wait2;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  let windowResetsAt = 0;
  function noteRateLimit(response) {
    const remaining = response.headers.get("x-hubspot-ratelimit-remaining");
    if (remaining === null || Number(remaining) > 0) return;
    const interval = Number(response.headers.get("x-hubspot-ratelimit-interval-milliseconds"));
    windowResetsAt = now() + (Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_RATE_LIMIT_INTERVAL_MS);
  }
  async function call(path, callOptions = {}) {
    const method = callOptions.method ?? "GET";
    const url = new URL(`${API_ROOT}${path}`);
    for (const [key, value] of Object.entries(compact(callOptions.query ?? {}))) {
      url.searchParams.set(key, String(value));
    }
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...callOptions.body !== void 0 && { "Content-Type": "application/json" }
      },
      ...callOptions.body !== void 0 && { body: JSON.stringify(callOptions.body) }
    };
    for (let attempt = 0; ; attempt++) {
      const pending = windowResetsAt - now();
      if (pending > 0) await sleep(pending);
      const response = await options.fetch(url.toString(), init);
      noteRateLimit(response);
      if (response.status === 429) {
        const body = await readError(response);
        if (attempt === 0 && body.policyName !== "DAILY") {
          await sleep(retryAfterMs2(response.headers.get("retry-after"), now()) ?? RATE_LIMIT_RETRY_MS);
          continue;
        }
        throw describeFailure2(response.status, body);
      }
      if (attempt === 0 && response.status >= 500 && callOptions.idempotent === true) {
        await sleep(SERVER_ERROR_BACKOFF_MS * (0.5 + random()));
        continue;
      }
      if (!response.ok) throw describeFailure2(response.status, await readError(response));
      const text22 = await response.text();
      return text22 === "" ? {} : JSON.parse(text22);
    }
  }
  const objectPath = (objectType, id) => `${OBJECTS_PATH}/${[objectType, id].filter((segment) => segment !== void 0).map(encodeURIComponent).join("/")}`;
  function getObject(objectType, id, query = {}) {
    return call(objectPath(objectType, id), { query, idempotent: true });
  }
  function createObject(objectType, body) {
    return call(objectPath(objectType), { method: "POST", body });
  }
  function updateObject(objectType, id, body) {
    return call(objectPath(objectType, id), { method: "PATCH", body, idempotent: true });
  }
  function searchPage(objectType, body) {
    return call(`${objectPath(objectType)}/search`, {
      method: "POST",
      body: compact(body),
      idempotent: true
    });
  }
  async function search(objectType, body, searchOptions = {}) {
    const maxPages = searchOptions.maxPages ?? MAX_SEARCH_PAGES;
    const collected = [];
    let after;
    for (let index = 0; index < maxPages; index++) {
      const page2 = await searchPage(objectType, { ...body, after });
      collected.push(...page2.results ?? []);
      after = page2.paging?.next?.after;
      if (!after) break;
    }
    return collected;
  }
  function associate(from, to, typeId) {
    const base = `${ASSOCIATIONS_PATH}/${encodeURIComponent(from.type)}/${encodeURIComponent(from.id)}/associations`;
    const target = `${encodeURIComponent(to.type)}/${encodeURIComponent(to.id)}`;
    return typeId === void 0 ? call(`${base}/default/${target}`, { method: "PUT", idempotent: true }) : call(`${base}/${target}`, {
      method: "PUT",
      body: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: typeId }],
      idempotent: true
    });
  }
  return { call, getObject, createObject, updateObject, searchPage, search, associate };
}
var OBJECT_TYPE_IDS = {
  contacts: "0-1",
  companies: "0-2",
  deals: "0-3"
};
var DEFAULT_PROPERTIES = {
  contacts: ["createdate", "email", "firstname", "lastname", "phone", "company", "lifecyclestage", "hs_object_id", "lastmodifieddate"],
  deals: ["dealname", "amount", "closedate", "pipeline", "dealstage", "hubspot_owner_id", "createdate", "hs_lastmodifieddate", "hs_object_id"],
  companies: ["name", "domain", "createdate", "hs_lastmodifieddate", "hs_object_id"]
};
var NOTE_ASSOCIATION_TYPE_IDS = {
  contact: 202,
  company: 190,
  deal: 214
};
function property(record, name) {
  const value = record.properties?.[name];
  return value === null || value === void 0 || value === "" ? void 0 : String(value);
}
function recordUrl(portalId, objectType, id) {
  if (!portalId || !id) return void 0;
  return `https://app.hubspot.com/contacts/${encodeURIComponent(portalId)}/record/${OBJECT_TYPE_IDS[objectType]}/${encodeURIComponent(id)}`;
}
function contactTitle(record) {
  const name = [property(record, "firstname"), property(record, "lastname")].filter(Boolean).join(" ");
  const email = property(record, "email");
  if (name && email) return `${name} <${email}>`;
  return name || email || record.id;
}
function dealTitle(record) {
  const name = property(record, "dealname") ?? record.id;
  const detail = [property(record, "dealstage"), property(record, "amount")].filter(Boolean).join(", ");
  return detail ? `${name} (${detail})` : name;
}
function companyTitle(record) {
  const name = property(record, "name");
  const domain = property(record, "domain");
  if (name && domain) return `${name} (${domain})`;
  return name || domain || record.id;
}
function recordData(record) {
  return {
    id: record.id,
    properties: record.properties ?? {},
    createdAt: record.createdAt ?? "",
    updatedAt: record.updatedAt ?? "",
    archived: record.archived === true
  };
}
var TITLES = {
  contacts: contactTitle,
  deals: dealTitle,
  companies: companyTitle
};
function createdToItem(record, scope) {
  const url = recordUrl(scope.portalId, scope.objectType, record.id);
  return {
    externalId: record.id,
    title: TITLES[scope.objectType](record),
    ...url !== void 0 && { url },
    updatedAt: property(record, "createdate") ?? record.createdAt ?? "",
    data: recordData(record)
  };
}
function stageToItem(record, portalId) {
  const stage = property(record, "dealstage") ?? "";
  const url = recordUrl(portalId, "deals", record.id);
  return {
    externalId: `${record.id}:${stage}`,
    title: `${property(record, "dealname") ?? record.id} moved to ${stage || "no stage"}`,
    ...url !== void 0 && { url },
    status: stage,
    data: recordData(record)
  };
}
function modifiedAt(record) {
  return property(record, "hs_lastmodifieddate") ?? property(record, "lastmodifieddate") ?? record.updatedAt ?? "";
}
function recordOutput(record) {
  return recordData(record);
}
function filter(propertyName, operator, value) {
  return { propertyName, operator, value };
}
function epochMillis(iso) {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) throw new Error(`Not an instant: "${iso}"`);
  return String(at);
}
var SAMPLE_CONTACT = {
  id: "33451",
  properties: {
    createdate: "2022-06-01T14:31:48.469Z",
    email: "lorelai@thedragonfly.com",
    firstname: "Lorelai",
    lastname: "Gilmore",
    phone: null,
    company: null,
    lifecyclestage: "lead",
    hs_object_id: "33451",
    lastmodifieddate: "2025-07-07T20:27:17.947Z"
  },
  createdAt: "2022-06-01T14:31:48.469Z",
  updatedAt: "2025-07-07T20:27:17.947Z",
  archived: false
};
var SAMPLE_DEAL = {
  id: "21678228008",
  properties: {
    dealname: "New deal",
    amount: "1500.00",
    closedate: "2019-12-07T16:50:06.678Z",
    pipeline: "default",
    dealstage: "contractsent",
    hubspot_owner_id: "910901",
    createdate: "2019-12-07T16:50:06.678Z",
    hs_lastmodifieddate: "2019-12-07T16:50:06.678Z",
    hs_object_id: "21678228008"
  },
  createdAt: "2019-12-07T16:50:06.678Z",
  updatedAt: "2019-12-07T16:50:06.678Z",
  archived: false
};
var SAMPLE_COMPANY = {
  id: "5000526215",
  properties: {
    name: "HubSpot",
    domain: "hubspot.com",
    createdate: "2019-10-30T03:30:17.883Z",
    hs_lastmodifieddate: "2019-12-07T16:50:06.678Z",
    hs_object_id: "5000526215"
  },
  createdAt: "2019-10-30T03:30:17.883Z",
  updatedAt: "2019-12-07T16:50:06.678Z",
  archived: false
};
var package_default = {
  name: "@vornrun/connector-hubspot",
  version: "0.1.1",
  description: "Trigger workflows from new HubSpot contacts, companies and deals or deal stage changes, and create, update, search, annotate or associate CRM records from a step.",
  type: "module",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "hubspot"
  },
  keywords: [
    "vorn",
    "connector",
    "hubspot"
  ],
  bin: {
    "vorn-connector-hubspot": "dist/index.js"
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
    category: "Productivity",
    keywords: [
      "hubspot",
      "crm",
      "contacts",
      "companies",
      "deals",
      "pipeline",
      "sales"
    ],
    auth: "Paste a HubSpot private app access token with the contacts, companies and deals read and write scopes, crm.objects.owners.read and crm.schemas.deals.read. There is no HubSpot CLI to borrow a CRM login from.",
    hosts: [
      "api.hubapi.com"
    ]
  }
};
var FIRST_POLL_LOOKBACK_MS = 60 * 6e4;
var STAGE_LOOKBACK_MS = 60 * 6e4;
var INDEXING_MARGIN_MS = 3e4;
var POLL_PAGE_SIZE = 100;
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || void 0;
}
function required(config, key, env) {
  const value = text2(config[key]);
  if (value === void 0) throw new Error(`${env} is required`);
  return value;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parsed(value, key) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${key} must be JSON`);
  }
}
function propertiesArg(value, key = "properties") {
  if (value === void 0 || value === "") return {};
  const object = parsed(value, key);
  if (!isRecord2(object)) throw new Error(`${key} must be a JSON object of property values keyed by property name`);
  const out = {};
  for (const [name, entry] of Object.entries(object)) {
    if (entry === void 0 || entry === null) continue;
    out[name] = typeof entry === "string" ? entry : isRecord2(entry) || Array.isArray(entry) ? JSON.stringify(entry) : String(entry);
  }
  return out;
}
function namesArg(value) {
  const raw = text2(value);
  if (raw === void 0) return [];
  return raw.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
}
function filterGroupsArg(value) {
  if (value === void 0 || value === "") return void 0;
  const raw = parsed(value, "filterGroups");
  const entries = Array.isArray(raw) ? raw : [raw];
  const groups = [];
  for (const entry of entries) {
    if (!isRecord2(entry)) throw new Error("filterGroups must be a JSON array of { filters: [...] } groups");
    if (Array.isArray(entry.filters)) groups.push(entry);
    else if (typeof entry.propertyName === "string") groups.push({ filters: [entry] });
    else if (Object.keys(entry).length > 0) throw new Error("filterGroups must be a JSON array of { filters: [...] } groups");
  }
  return groups.length > 0 ? groups : void 0;
}
function count(value, key, max) {
  if (value === void 0 || value === "") return void 0;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || max !== void 0 && number > max) {
    const bound = max === void 0 ? "of at least 1" : `from 1 to ${max}`;
    throw new Error(`${key} must be a whole number ${bound}, got "${String(value)}"`);
  }
  return number;
}
function isEmail(value) {
  return value.includes("@");
}
var PROPERTIES_INPUT = (what, required2 = false) => ({
  key: "properties",
  label: "Properties",
  type: "json",
  required: required2,
  description: `A JSON object of ${what} keyed by internal property name, e.g. {"lifecyclestage":"customer"}.`,
  builderHint: "Sent as the properties object of the JSON body; values are written as strings because HubSpot stores every property as one, and a name the account lacks answers 400 VALIDATION_ERROR."
});
var OWNER_INPUT = {
  key: "ownerId",
  label: "Owner",
  description: "The owner id from listOwners, its id rather than its userId.",
  builderHint: "Sent as hubspot_owner_id; a userId in its place answers 400 VALIDATION_ERROR."
};
var PROPERTY_NAMES_INPUT = {
  key: "properties",
  label: "Properties to return",
  description: "Comma-separated internal property names to return; blank returns the standard set.",
  builderHint: "Sent as the properties list; a name the account lacks is ignored rather than refused."
};
var AFTER_INPUT = {
  key: "after",
  label: "After",
  description: "The paging.next.after cursor from an earlier page.",
  builderHint: "Sent as after; HubSpot wants a numeric string and refuses paging past 10,000 results with 400."
};
var RECORD_OUTPUTS = [
  { key: "id", description: "Record id, a numeric string" },
  { key: "properties", description: "The properties HubSpot returned, every value a string or null" },
  { key: "createdAt", description: "When the record was created, ISO 8601" },
  { key: "updatedAt", description: "When the record last changed, ISO 8601" },
  { key: "archived", type: "boolean", description: "Whether the record is archived" }
];
var OBJECT_TYPE_OPTIONS = [
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
  { value: "deal", label: "Deal" }
];
function createHubSpotConnector(options = {}) {
  const env = options.env ?? process.env;
  const clock = options.now ?? Date.now;
  function client(context) {
    return createHubSpotClient({
      accessToken: required(context.config, "accessToken", "HUBSPOT_ACCESS_TOKEN"),
      fetch: context.fetch,
      now: clock,
      ...options.sleep && { sleep: options.sleep },
      ...options.random && { random: options.random }
    });
  }
  function windowOf(context, lookback) {
    const nowMs = Date.parse(context.now());
    const since = lookback !== void 0 || context.since === void 0 ? String(nowMs - (lookback ?? FIRST_POLL_LOOKBACK_MS)) : epochMillis(context.since);
    return { since, until: nowMs - INDEXING_MARGIN_MS };
  }
  async function searchSince(context, objectType, cursorProperty, extra, lookback) {
    const { since, until } = windowOf(context, lookback);
    const body = {
      filterGroups: [{ filters: [filter(cursorProperty, "GTE", since), ...extra] }],
      sorts: [{ propertyName: cursorProperty, direction: "ASCENDING" }],
      properties: [...DEFAULT_PROPERTIES[objectType], ...namesArg(context.config.properties)],
      limit: POLL_PAGE_SIZE
    };
    return { records: await client(context).search(objectType, body), until };
  }
  function settled(records, until, stamp) {
    return records.filter((record) => !(Date.parse(stamp(record)) > until));
  }
  function pipelineFilters(config, withStage) {
    const filters = [];
    const pipeline = text2(config.pipeline);
    if (pipeline !== void 0) filters.push(filter("pipeline", "EQ", pipeline));
    const stage = withStage ? text2(config.dealstage) : void 0;
    if (stage !== void 0) filters.push(filter("dealstage", "EQ", stage));
    return filters;
  }
  function fetchCreated(objectType, extra = () => []) {
    return async (context) => {
      const { records, until } = await searchSince(context, objectType, "createdate", extra(context.config));
      const portalId = text2(context.config.portalId);
      return settled(records, until, (record) => property(record, "createdate") ?? record.createdAt ?? "").map(
        (record) => createdToItem(record, { objectType, portalId })
      );
    };
  }
  async function fetchStageChanges(context) {
    const { records, until } = await searchSince(context, "deals", "hs_lastmodifieddate", pipelineFilters(context.config, true), STAGE_LOOKBACK_MS);
    const portalId = text2(context.config.portalId);
    return settled(records, until, modifiedAt).map((record) => stageToItem(record, portalId));
  }
  const sampleContact = text2(env.HUBSPOT_CONTACT_ID);
  const sampleCompany = text2(env.HUBSPOT_COMPANY_ID);
  return defineConnector({
    id: "hubspot",
    name: "HubSpot",
    version: options.version ?? package_default.version,
    description: "Trigger workflows from new HubSpot contacts, companies and deals or deal stage changes, and create, update, search, annotate or associate CRM records from a step.",
    // HubSpot's sprocket: the hub ring with three spokes ending in nodes.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M9.8 14a5.2 5.2 0 1 0 10.4 0a5.2 5.2 0 1 0 -10.4 0zM12.4 14a2.6 2.6 0 1 1 5.2 0a2.6 2.6 0 1 1 -5.2 0zM4.85 4.62L10.97 11.07L12.28 9.83L6.15 3.38zM3.9 4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0zM7.59 21.68L11.91 17.9L10.72 16.55L6.41 20.32zM5.7 21a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0zM2.96 14.4L10.07 14.7L10.14 12.9L3.04 12.6zM1.7 13.5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0z"
      ]
    },
    auth: { rung: "key", keys: ["accessToken"] },
    config: [
      {
        key: "accessToken",
        env: "HUBSPOT_ACCESS_TOKEN",
        label: "Private app access token",
        secret: true,
        required: true,
        description: "The access token of a private app from Settings, Integrations, Private Apps, with the crm.objects.contacts, crm.objects.companies and crm.objects.deals read and write scopes, crm.objects.owners.read and crm.schemas.deals.read.",
        builderHint: "Sent as Authorization: Bearer on every call. A wrong or revoked token answers 401; a token missing a scope answers 403 MISSING_SCOPES naming the scope. There is no HubSpot CLI to borrow a CRM login from."
      },
      {
        key: "portalId",
        env: "HUBSPOT_PORTAL_ID",
        label: "Portal id",
        description: "The account number in the app.hubspot.com URL, used to give each item a link to open the record. Blank leaves items without a URL.",
        builderHint: "No API answer carries it, so the record URL https://app.hubspot.com/contacts/{portalId}/record/{objectTypeId}/{id} can only be built when it is set."
      },
      {
        key: "properties",
        env: "HUBSPOT_PROPERTIES",
        label: "Extra properties",
        description: "Comma-separated internal property names every trigger fetches on top of the standard set.",
        builderHint: "Appended to the search body\u2019s properties list; HubSpot ignores a name the account lacks."
      },
      {
        key: "pipeline",
        env: "HUBSPOT_PIPELINE",
        label: "Deal pipeline",
        description: "A pipeline id from listDealPipelines; the deal triggers then watch only that pipeline. Blank watches every pipeline.",
        builderHint: 'Adds { propertyName: "pipeline", operator: "EQ" } to the deal searches; the default pipeline\u2019s id is "default".'
      },
      {
        key: "dealstage",
        env: "HUBSPOT_DEAL_STAGE",
        label: "Deal stage",
        description: "A stage id such as closedwon or a numeric custom stage id; the stage-changed trigger then fires only for deals reaching it.",
        builderHint: 'Adds { propertyName: "dealstage", operator: "EQ" } to the stage-changed search only; stage ids come from listDealPipelines.'
      }
    ],
    triggers: [
      {
        type: "newContact",
        label: "A contact is created",
        description: "Fires once for each contact created since the last poll, oldest first.",
        dedupe: "timestamp",
        fetch: fetchCreated("contacts"),
        defaultWorkflow: { name: "HubSpot: new contacts", defaultCronFromMinutes: 5 },
        sample: [createdToItem(SAMPLE_CONTACT, { objectType: "contacts" })]
      },
      {
        type: "newDeal",
        label: "A deal is created",
        description: "Fires once for each deal created since the last poll, oldest first, in the configured pipeline or in all of them.",
        dedupe: "timestamp",
        fetch: fetchCreated("deals", (config) => pipelineFilters(config, false)),
        defaultWorkflow: { name: "HubSpot: new deals", defaultCronFromMinutes: 5 },
        sample: [createdToItem(SAMPLE_DEAL, { objectType: "deals" })]
      },
      {
        type: "newCompany",
        label: "A company is created",
        description: "Fires once for each company created since the last poll, oldest first.",
        dedupe: "timestamp",
        fetch: fetchCreated("companies"),
        defaultWorkflow: { name: "HubSpot: new companies", defaultCronFromMinutes: 5 },
        sample: [createdToItem(SAMPLE_COMPANY, { objectType: "companies" })]
      },
      {
        type: "dealStageChanged",
        label: "A deal moves to a stage",
        description: "Fires once per deal and stage when a deal is found at a stage it has not fired for; a deal edited without changing stage is dropped. Filter by pipeline and stage in the settings.",
        dedupe: "timestamp",
        fetch: fetchStageChanges,
        defaultWorkflow: { name: "HubSpot: deal stage changes", defaultCronFromMinutes: 5 },
        sample: [stageToItem(SAMPLE_DEAL)]
      }
    ],
    actions: [
      {
        type: "createContact",
        label: "Create a contact",
        description: "Add a contact by email. An email that already exists answers 409 with the existing id in the message.",
        // A repeat answers 409 CONFLICT rather than a second contact, but the call is still not one to retry blindly.
        idempotent: false,
        inputs: [
          {
            key: "email",
            label: "Email",
            required: true,
            description: "The contact\u2019s email address, HubSpot\u2019s unique identifier for contacts.",
            builderHint: 'Sent as properties.email; a duplicate answers 409 CONFLICT "Contact already exists. Existing ID: <id>", which the thrown message carries.'
          },
          { key: "firstname", label: "First name", description: "First name.", builderHint: "Sent as properties.firstname." },
          { key: "lastname", label: "Last name", description: "Last name.", builderHint: "Sent as properties.lastname." },
          { key: "phone", label: "Phone", description: "Phone number.", builderHint: "Sent as properties.phone, unformatted." },
          {
            key: "company",
            label: "Company",
            description: "Company name, as a text property on the contact rather than an association.",
            builderHint: "Sent as properties.company; use associate to link the contact to a company record."
          },
          PROPERTIES_INPUT("extra properties to set")
        ],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const properties = {
            ...propertiesArg(args.properties),
            email: String(args.email),
            ...text2(args.firstname) && { firstname: text2(args.firstname) },
            ...text2(args.lastname) && { lastname: text2(args.lastname) },
            ...text2(args.phone) && { phone: text2(args.phone) },
            ...text2(args.company) && { company: text2(args.company) }
          };
          return recordOutput(await client(context).createObject("contacts", { properties }));
        }
      },
      {
        type: "updateContact",
        label: "Update a contact",
        description: "Set the given properties of a contact and leave the rest as they were.",
        // Harmless to repeat with real values, but the mock check sends placeholders, so it is kept out of the live run.
        idempotent: false,
        inputs: [
          {
            key: "contactId",
            label: "Contact",
            required: true,
            description: "The contact\u2019s record id, such as 33451.",
            builderHint: "Sent URL-encoded as the path segment of PATCH /crm/v3/objects/contacts/{id}; an unknown id answers 404 OBJECT_NOT_FOUND."
          },
          PROPERTIES_INPUT("properties to set", true)
        ],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const record = await client(context).updateObject("contacts", String(args.contactId), {
            properties: propertiesArg(args.properties)
          });
          return recordOutput(record);
        }
      },
      {
        type: "createDeal",
        label: "Create a deal",
        description: "Add a deal at a stage of a pipeline. Every call makes a new deal.",
        idempotent: false,
        inputs: [
          { key: "dealname", label: "Deal name", required: true, description: "The deal\u2019s name.", builderHint: "Sent as properties.dealname." },
          {
            key: "dealstage",
            label: "Stage",
            required: true,
            description: "A stage id from listDealPipelines, such as appointmentscheduled or closedwon in the default pipeline; custom stages are numeric.",
            builderHint: "Sent as properties.dealstage; a stage outside the chosen pipeline answers 400 VALIDATION_ERROR."
          },
          {
            key: "pipeline",
            label: "Pipeline",
            description: "A pipeline id from listDealPipelines. Blank uses the default pipeline.",
            builderHint: 'Sent as properties.pipeline when set; "If a pipeline isn\u2019t specified, the default pipeline will be used".'
          },
          {
            key: "amount",
            label: "Amount",
            type: "number",
            description: "The deal amount in the account\u2019s currency.",
            builderHint: "Sent as properties.amount written out as a decimal string such as 1500.00."
          },
          {
            key: "closedate",
            label: "Close date",
            description: "The expected close date as an ISO 8601 instant, such as 2019-12-07T16:50:06.678Z.",
            builderHint: "Sent as properties.closedate; HubSpot answers it back in the same form."
          },
          OWNER_INPUT,
          PROPERTIES_INPUT("extra properties to set")
        ],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const amount = text2(args.amount);
          const properties = {
            ...propertiesArg(args.properties),
            dealname: String(args.dealname),
            dealstage: String(args.dealstage),
            ...text2(args.pipeline) && { pipeline: text2(args.pipeline) },
            ...amount && { amount },
            ...text2(args.closedate) && { closedate: text2(args.closedate) },
            ...text2(args.ownerId) && { hubspot_owner_id: text2(args.ownerId) }
          };
          return recordOutput(await client(context).createObject("deals", { properties }));
        }
      },
      {
        type: "updateDeal",
        label: "Update a deal",
        description: 'Set the given properties of a deal, such as {"dealstage":"closedwon"}, and leave the rest as they were.',
        idempotent: false,
        inputs: [
          {
            key: "dealId",
            label: "Deal",
            required: true,
            description: "The deal\u2019s record id.",
            builderHint: "Sent URL-encoded as the path segment of PATCH /crm/v3/objects/deals/{id}; an unknown id answers 404 OBJECT_NOT_FOUND."
          },
          PROPERTIES_INPUT("properties to set", true)
        ],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const record = await client(context).updateObject("deals", String(args.dealId), {
            properties: propertiesArg(args.properties)
          });
          return recordOutput(record);
        }
      },
      {
        type: "createCompany",
        label: "Create a company",
        description: "Add a company by name, with its domain when known. Every call makes a new company.",
        idempotent: false,
        inputs: [
          { key: "name", label: "Name", required: true, description: "The company name.", builderHint: "Sent as properties.name." },
          {
            key: "domain",
            label: "Domain",
            description: "The website domain such as hubspot.com, HubSpot\u2019s unique identifier for companies.",
            builderHint: "Sent as properties.domain; HubSpot does not refuse a duplicate domain, so a repeat makes a second company."
          },
          PROPERTIES_INPUT("extra properties to set")
        ],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const properties = {
            ...propertiesArg(args.properties),
            name: String(args.name),
            ...text2(args.domain) && { domain: text2(args.domain) }
          };
          return recordOutput(await client(context).createObject("companies", { properties }));
        }
      },
      {
        type: "createNote",
        label: "Add a note to a record",
        description: "Attach a note to a contact, company or deal, stamped with the current time.",
        idempotent: false,
        inputs: [
          {
            key: "objectType",
            label: "Record type",
            type: "select",
            required: true,
            options: OBJECT_TYPE_OPTIONS,
            description: "What the note is attached to: contact, company or deal.",
            builderHint: "Picks the association type id of the note: 202 to a contact, 190 to a company, 214 to a deal."
          },
          {
            key: "objectId",
            label: "Record",
            required: true,
            description: "The record id to attach the note to.",
            builderHint: "Sent as associations[0].to.id; an unknown id answers 400 VALIDATION_ERROR."
          },
          {
            key: "body",
            label: "Note",
            required: true,
            description: "The note text, up to 65,536 characters.",
            builderHint: "Sent as properties.hs_note_body; hs_timestamp is filled with the current instant because HubSpot requires it."
          },
          OWNER_INPUT
        ],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const objectType = String(args.objectType);
          const associationTypeId = NOTE_ASSOCIATION_TYPE_IDS[objectType];
          if (associationTypeId === void 0) {
            throw new Error(`objectType must be one of contact, company or deal, got "${objectType}"`);
          }
          const record = await client(context).createObject("notes", {
            properties: {
              hs_timestamp: context.now(),
              hs_note_body: String(args.body),
              ...text2(args.ownerId) && { hubspot_owner_id: text2(args.ownerId) }
            },
            associations: [
              {
                to: { id: String(args.objectId) },
                types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId }]
              }
            ]
          });
          return recordOutput(record);
        }
      },
      {
        type: "associate",
        label: "Associate two records",
        description: "Link two records with the default association for their types, or with a labelled type id.",
        // A PUT states the association; a repeat answers the same record.
        idempotent: true,
        inputs: [
          {
            key: "fromObjectType",
            label: "From type",
            required: true,
            description: "contact, company, deal or note, or an object type id such as 0-1.",
            builderHint: "Sent URL-encoded as the first path segment of PUT /crm/v4/objects/{from}/{id}/associations/..."
          },
          { key: "fromObjectId", label: "From record", required: true, description: "The record id to link from.", builderHint: "Sent URL-encoded as the second path segment." },
          {
            key: "toObjectType",
            label: "To type",
            required: true,
            description: "contact, company, deal or note, or an object type id.",
            builderHint: "Sent URL-encoded after /associations/default/ or /associations/ when a type id is given."
          },
          { key: "toObjectId", label: "To record", required: true, description: "The record id to link to.", builderHint: "Sent URL-encoded as the last path segment." },
          {
            key: "associationTypeId",
            label: "Association type id",
            type: "number",
            description: "A labelled type id such as 1 for a contact\u2019s primary company. Blank uses the default association for the two types.",
            builderHint: 'When set the labelled form is used: PUT .../associations/{to}/{toId} with body [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId }]; the defaults are contact\u2192company 279, company\u2192contact 280, contact\u2192deal 4, deal\u2192contact 3, deal\u2192company 341, company\u2192deal 342, contact\u2192note 201, company\u2192note 189, deal\u2192note 213.'
          }
        ],
        outputs: [
          { key: "fromObjectTypeId", description: "The from record\u2019s object type id, such as 0-1" },
          { key: "fromObjectId", description: "The from record id" },
          { key: "toObjectTypeId", description: "The to record\u2019s object type id, such as 0-3" },
          { key: "toObjectId", description: "The to record id" },
          { key: "labels", description: 'The association labels now in place, such as ["Point of contact"]' }
        ],
        ...sampleContact && sampleCompany && {
          sample: { fromObjectType: "contact", fromObjectId: sampleContact, toObjectType: "company", toObjectId: sampleCompany }
        },
        async run(args, context) {
          const typeId = count(args.associationTypeId, "associationTypeId");
          const result = await client(context).associate(
            { type: String(args.fromObjectType), id: String(args.fromObjectId) },
            { type: String(args.toObjectType), id: String(args.toObjectId) },
            typeId
          );
          return {
            fromObjectTypeId: result.fromObjectTypeId ?? "",
            fromObjectId: result.fromObjectId ?? String(args.fromObjectId),
            toObjectTypeId: result.toObjectTypeId ?? "",
            toObjectId: result.toObjectId ?? String(args.toObjectId),
            labels: Array.isArray(result.labels) ? result.labels : []
          };
        }
      },
      {
        type: "getContact",
        label: "Get a contact",
        description: "Read one contact by record id or by email address.",
        idempotent: true,
        inputs: [
          {
            key: "contactId",
            label: "Contact",
            required: true,
            description: "The contact\u2019s record id, or an email address to look it up by.",
            builderHint: "A value with an @ is sent as GET /crm/v3/objects/contacts/{email}?idProperty=email; anything else as the record id. An unknown one answers 404 OBJECT_NOT_FOUND."
          },
          PROPERTY_NAMES_INPUT
        ],
        outputs: RECORD_OUTPUTS,
        ...sampleContact && { sample: { contactId: sampleContact } },
        async run(args, context) {
          const contactId = String(args.contactId);
          const names = namesArg(args.properties);
          const record = await client(context).getObject("contacts", contactId, {
            properties: (names.length > 0 ? names : DEFAULT_PROPERTIES.contacts).join(","),
            ...isEmail(contactId) && { idProperty: "email" }
          });
          return recordOutput(record);
        }
      },
      {
        type: "searchContacts",
        label: "Search contacts",
        description: "Find contacts by free text or by filter groups, one page at a time.",
        idempotent: true,
        inputs: [
          {
            key: "query",
            label: "Query",
            description: "Text matched against the default searchable properties: name, email, phone and company.",
            builderHint: "Sent as query, at most 3,000 characters; archived contacts are excluded from search."
          },
          {
            key: "filterGroups",
            label: "Filter groups",
            type: "json",
            description: 'A JSON array of { "filters": [{ "propertyName", "operator", "value" }] } groups exactly as the search API takes them; groups are ORed and filters within one ANDed.',
            builderHint: "Sent as filterGroups, at most 5 groups of 6 filters; a bare filter object is taken as a group of one. Date values are epoch milliseconds as strings."
          },
          PROPERTY_NAMES_INPUT,
          {
            key: "limit",
            label: "Limit",
            type: "number",
            description: "Contacts per page, 1 to 200. Defaults to 10.",
            builderHint: "Sent as limit; the search API is limited to five requests per second and 10,000 results per query."
          },
          AFTER_INPUT
        ],
        outputs: [
          { key: "total", type: "number", description: "How many contacts match in all" },
          { key: "contacts", description: "The page of matching records, each { id, properties, createdAt, updatedAt, archived }" },
          { key: "nextAfter", description: "Pass back as after to fetch the next page; empty on the last one" }
        ],
        sample: { query: "test" },
        async run(args, context) {
          const names = namesArg(args.properties);
          const page2 = await client(context).searchPage("contacts", {
            query: text2(args.query),
            filterGroups: filterGroupsArg(args.filterGroups),
            properties: names.length > 0 ? names : DEFAULT_PROPERTIES.contacts,
            limit: count(args.limit, "limit", MAX_SEARCH_LIMIT),
            after: text2(args.after)
          });
          return {
            total: page2.total ?? 0,
            contacts: (page2.results ?? []).map(recordOutput),
            nextAfter: page2.paging?.next?.after ?? ""
          };
        }
      },
      {
        type: "listDealPipelines",
        label: "List deal pipelines",
        description: "The deal pipelines of the account with their stages.",
        idempotent: true,
        inputs: [],
        outputs: [
          {
            key: "pipelines",
            description: "One entry per pipeline: id, label, displayOrder, archived, stages [{ id, label, displayOrder, metadata: { probability } }]"
          }
        ],
        sample: {},
        request: {
          url: `${API_ROOT}${CRM_PATH}/pipelines/deals`,
          headers: { Authorization: "Bearer {{config.accessToken}}" }
        },
        postReceive: [
          { op: "rename", from: "results", to: "pipelines" },
          { op: "pick", keys: ["pipelines"] }
        ]
      },
      {
        type: "listOwners",
        label: "List owners",
        description: "The users who can own records, with the id to assign a record by.",
        idempotent: true,
        inputs: [
          {
            key: "email",
            label: "Email",
            description: "Only the owner with this email address.",
            builderHint: "Sent as the email query parameter; the answer is then a list of one or none."
          },
          {
            key: "limit",
            label: "Limit",
            type: "number",
            description: "Owners per page. Defaults to 100.",
            builderHint: "Sent as the limit query parameter."
          },
          { ...AFTER_INPUT, builderHint: "Sent as the after query parameter; the answer\u2019s paging.next.after names the next page." },
          {
            key: "archived",
            label: "Archived",
            type: "boolean",
            description: "List deactivated users instead of active ones.",
            builderHint: "Sent as the archived query parameter."
          }
        ],
        outputs: [
          {
            key: "owners",
            description: "One entry per owner: id, email, firstName, lastName, userId, type, archived, createdAt, updatedAt, teams; assign records by id, never userId"
          },
          { key: "nextAfter", description: "Pass back as after to fetch the next page; empty on the last one" }
        ],
        sample: {},
        async run(args, context) {
          const page2 = await client(context).call(`${CRM_PATH}/owners`, {
            query: {
              email: text2(args.email),
              limit: count(args.limit, "limit"),
              after: text2(args.after),
              ...args.archived !== void 0 && args.archived !== "" && { archived: String(args.archived) }
            },
            idempotent: true
          });
          return {
            owners: Array.isArray(page2.results) ? page2.results : [],
            nextAfter: page2.paging?.next?.after ?? ""
          };
        }
      }
    ]
  });
}
var connector = createHubSpotConnector();
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

// hubspot/vorn-connector-pack.js
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
