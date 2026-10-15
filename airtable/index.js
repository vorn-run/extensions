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

// ../e4-connectors/packages/connector-sdk/dist/chunk-SLU654P6.js
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

// airtable/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  API_ROOT: () => API_ROOT,
  AirtableApiError: () => AirtableApiError,
  LOCKOUT_MS: () => LOCKOUT_MS,
  MAX_BATCH_RECORDS: () => MAX_BATCH_RECORDS,
  MAX_LIST_PAGES: () => MAX_LIST_PAGES,
  MAX_PAGE_SIZE: () => MAX_PAGE_SIZE,
  RATE_LIMIT_PER_SECOND: () => RATE_LIMIT_PER_SECOND,
  SAMPLE_BASE_ID: () => SAMPLE_BASE_ID,
  SAMPLE_RECORD: () => SAMPLE_RECORD,
  SAMPLE_TABLE_ID: () => SAMPLE_TABLE_ID,
  SAMPLE_UPDATED_RECORD: () => SAMPLE_UPDATED_RECORD,
  andFormulas: () => andFormulas,
  connector: () => connector,
  count: () => count,
  createAirtableClient: () => createAirtableClient,
  createAirtableConnector: () => createAirtableConnector,
  createRateLimiter: () => createRateLimiter,
  default: () => index_default,
  fieldReference: () => fieldReference,
  fieldsArg: () => fieldsArg,
  modifiedAt: () => modifiedAt,
  namesArg: () => namesArg,
  recordOutput: () => recordOutput,
  recordTitle: () => recordTitle,
  recordToItem: () => recordToItem,
  recordUrl: () => recordUrl,
  recordsArg: () => recordsArg,
  retryAfterMs: () => retryAfterMs2,
  sinceFormula: () => sinceFormula,
  sortArg: () => sortArg
});
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var API_ROOT = "https://api.airtable.com/v0";
var MAX_PAGE_SIZE = 100;
var MAX_LIST_PAGES = 10;
var MAX_BATCH_RECORDS = 10;
var RATE_LIMIT_PER_SECOND = 5;
var LOCKOUT_MS = 3e4;
var SERVER_ERROR_BACKOFF_MS = 500;
var MAX_ERROR_BODY2 = 300;
var AirtableApiError = class extends Error {
  status;
  type;
  constructor(status, detail) {
    super(detail.type ? `${detail.type}: ${detail.message}` : detail.message);
    this.name = "AirtableApiError";
    this.status = status;
    this.type = detail.type;
  }
};
var wait2 = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
function createRateLimiter(options = {}) {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? wait2;
  const perSecond = options.perSecond ?? RATE_LIMIT_PER_SECOND;
  const stamps = /* @__PURE__ */ new Map();
  async function acquire(base) {
    const recent = stamps.get(base) ?? [];
    stamps.set(base, recent);
    for (; ; ) {
      const at = now();
      while (recent.length > 0 && recent[0] <= at - 1e3) recent.shift();
      if (recent.length < perSecond) {
        recent.push(at);
        return;
      }
      await sleep(recent[0] + 1e3 - at);
    }
  }
  return { acquire };
}
function retryAfterMs2(header, now) {
  const trimmed = (header ?? "").trim();
  if (trimmed === "") return void 0;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - now);
}
async function describeFailure2(response) {
  const text22 = await response.text().catch(() => "");
  try {
    const parsed2 = JSON.parse(text22);
    if (typeof parsed2.error === "string") {
      return new AirtableApiError(response.status, { message: parsed2.error });
    }
    if (parsed2.error && typeof parsed2.error === "object") {
      const message = parsed2.error.message ?? `Airtable API ${response.status}`;
      return new AirtableApiError(response.status, {
        ...parsed2.error.type && { type: parsed2.error.type },
        message
      });
    }
  } catch {
  }
  const quoted = text22.length > MAX_ERROR_BODY2 ? `${text22.slice(0, MAX_ERROR_BODY2)}\u2026` : text22;
  return new AirtableApiError(response.status, {
    message: `Airtable API ${response.status}${quoted ? `: ${quoted}` : ""}`
  });
}
function compact(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== null && value !== "") out[key] = value;
  }
  return out;
}
function createAirtableClient(options) {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error("AIRTABLE_API_KEY is required");
  const limiter = options.limiter ?? createRateLimiter(options);
  const sleep = options.sleep ?? wait2;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  async function call(path, callOptions = {}) {
    const method = callOptions.method ?? "GET";
    const url = new URL(`${API_ROOT}/${path}`);
    for (const [key, value] of Object.entries(compact(callOptions.query ?? {}))) {
      url.searchParams.set(key, String(value));
    }
    const init = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...callOptions.body !== void 0 && { "Content-Type": "application/json" }
      },
      ...callOptions.body !== void 0 && { body: JSON.stringify(compact(callOptions.body)) }
    };
    for (let attempt = 0; ; attempt++) {
      if (callOptions.base !== void 0) await limiter.acquire(callOptions.base);
      const response = await options.fetch(url.toString(), init);
      if (attempt === 0 && response.status === 429) {
        await sleep(retryAfterMs2(response.headers.get("retry-after"), now()) ?? LOCKOUT_MS);
        continue;
      }
      if (attempt === 0 && response.status >= 500 && callOptions.idempotent === true) {
        await sleep(SERVER_ERROR_BACKOFF_MS * (0.5 + random()));
        continue;
      }
      if (!response.ok) throw await describeFailure2(response);
      const text22 = await response.text();
      return text22 === "" ? {} : JSON.parse(text22);
    }
  }
  const recordPath = (baseId, table, recordId) => [baseId, table, recordId].filter((segment) => segment !== void 0).map(encodeURIComponent).join("/");
  function getRecord(baseId, table, recordId, query = {}) {
    return call(recordPath(baseId, table, recordId), {
      query,
      base: baseId,
      idempotent: true
    });
  }
  function createRecord(baseId, table, body) {
    return call(recordPath(baseId, table), { method: "POST", body, base: baseId });
  }
  function updateRecord(baseId, table, recordId, body) {
    return call(recordPath(baseId, table, recordId), {
      method: "PATCH",
      body,
      base: baseId,
      idempotent: true
    });
  }
  function upsertRecords(baseId, table, body) {
    return call(
      recordPath(baseId, table),
      { method: "PATCH", body, base: baseId }
    );
  }
  function deleteRecord(baseId, table, recordId) {
    return call(recordPath(baseId, table, recordId), {
      method: "DELETE",
      base: baseId,
      idempotent: true
    });
  }
  async function listRecords(baseId, table, params, listOptions = {}) {
    const maxPages = listOptions.maxPages ?? MAX_LIST_PAGES;
    const wanted = params.maxRecords;
    const collected = [];
    let offset;
    for (let index = 0; index < maxPages; index++) {
      const page2 = await call(`${recordPath(baseId, table)}/listRecords`, {
        method: "POST",
        body: { ...params, pageSize: params.pageSize ?? MAX_PAGE_SIZE, offset },
        base: baseId,
        idempotent: true
      });
      collected.push(...page2.records ?? []);
      if (!page2.offset || wanted !== void 0 && collected.length >= wanted) break;
      offset = page2.offset;
    }
    return wanted === void 0 ? collected : collected.slice(0, wanted);
  }
  return { call, getRecord, createRecord, updateRecord, upsertRecords, deleteRecord, listRecords };
}
var TABLE_ID = /^tbl[A-Za-z0-9]+$/;
function recordUrl(baseId, table, recordId) {
  if (!TABLE_ID.test(table) || !baseId || !recordId) return void 0;
  return `https://airtable.com/${baseId}/${table}/${recordId}`;
}
function recordTitle(record) {
  for (const value of Object.values(record.fields ?? {})) {
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return record.id;
}
function recordOutput(record, baseId, table) {
  const url = recordUrl(baseId, table, record.id ?? "");
  return {
    id: record.id ?? "",
    createdTime: record.createdTime ?? "",
    fields: record.fields ?? {},
    ...url !== void 0 && { url }
  };
}
function recordToItem(record, scope) {
  const url = recordUrl(scope.baseId, scope.table, record.id);
  return {
    externalId: record.id,
    title: recordTitle(record),
    ...url !== void 0 && { url },
    updatedAt: scope.updatedAt ?? record.createdTime,
    data: {
      id: record.id,
      createdTime: record.createdTime,
      fields: record.fields ?? {}
    }
  };
}
function fieldReference(name) {
  if (/[{}]/.test(name)) throw new Error(`Field name "${name}" may not contain braces`);
  return `{${name}}`;
}
function sinceFormula(expression, since) {
  return `NOT(IS_BEFORE(${expression}, DATETIME_PARSE("${since}")))`;
}
function andFormulas(...formulas) {
  const present = formulas.filter((formula) => Boolean(formula && formula.trim()));
  return present.length > 1 ? `AND(${present.join(", ")})` : present[0] ?? "";
}
var SAMPLE_BASE_ID = "appLkNDICXNqxSDhG";
var SAMPLE_TABLE_ID = "tbltp8DGLhqbUmjK1";
var SAMPLE_RECORD = {
  id: "rec560UJdUtocSouk",
  createdTime: "2022-09-12T21:03:48.000Z",
  fields: { Name: "Union Square", Address: "333 Post St", Visited: true }
};
var SAMPLE_UPDATED_RECORD = {
  ...SAMPLE_RECORD,
  fields: { ...SAMPLE_RECORD.fields, Visited: false, "Last modified": "2022-09-13T08:15:02.000Z" }
};
var package_default = {
  name: "@vornrun/connector-airtable",
  version: "0.1.1",
  description: "Trigger workflows from new or updated Airtable records, and create, update, upsert, delete or read records from a step.",
  type: "module",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "airtable"
  },
  keywords: [
    "vorn",
    "connector",
    "airtable"
  ],
  bin: {
    "vorn-connector-airtable": "dist/index.js"
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
      "airtable",
      "records",
      "tables",
      "bases",
      "spreadsheet",
      "database"
    ],
    auth: "Paste an Airtable personal access token with data.records:read, data.records:write and schema.bases:read, granted access to the bases it should reach. There is no Airtable CLI to sign in with.",
    hosts: [
      "api.airtable.com"
    ]
  }
};
var FIRST_POLL_LOOKBACK_MS = 60 * 6e4;
var MAX_MERGE_FIELDS = 3;
var PLACEHOLDER_BASE_ID = "appXXXXXXXXXXXXXX";
var PLACEHOLDER_TABLE_ID = "tblXXXXXXXXXXXXXX";
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
function fieldsArg(value, key = "fields") {
  const object = parsed(value, key);
  if (!isRecord2(object)) throw new Error(`${key} must be a JSON object of cell values keyed by field name`);
  return object;
}
function recordsArg(value) {
  const raw = parsed(value, "records");
  const entries = Array.isArray(raw) ? raw : [raw];
  if (entries.length > MAX_BATCH_RECORDS) {
    throw new Error(`records may hold at most ${MAX_BATCH_RECORDS} entries per call, got ${entries.length}`);
  }
  return entries.map((entry, index) => {
    if (!isRecord2(entry)) throw new Error(`records[${index}] must be an object`);
    const fields = isRecord2(entry.fields) ? entry.fields : entry;
    return { fields };
  });
}
function namesArg(value, key) {
  const raw = Array.isArray(value) ? value : text2(value);
  if (raw === void 0) return [];
  const list = Array.isArray(raw) ? raw : raw.startsWith("[") ? parsed(raw, key) : raw.split(",");
  if (!Array.isArray(list) || list.some((entry) => typeof entry !== "string")) {
    throw new Error(`${key} must be a JSON array of field names or a comma-separated list`);
  }
  return list.map((entry) => entry.trim()).filter((entry) => entry !== "");
}
function sortArg(value) {
  if (value === void 0) return void 0;
  const raw = parsed(value, "sort");
  const entries = Array.isArray(raw) ? raw : [raw];
  if (!entries.every(isRecord2)) throw new Error("sort must be a JSON array of { field, direction } objects");
  return entries;
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
function flag(value) {
  return value === true || value === "true" ? true : void 0;
}
function modifiedAt(record, field) {
  const value = record.fields?.[field];
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return record.createdTime;
}
var BASE_ID_INPUT = {
  key: "baseId",
  label: "Base",
  required: true,
  description: "The base id, app\u2026, from the base URL or listBases.",
  builderHint: "The first path segment of every record route; the token must have been granted access to this base when it was created."
};
var TABLE_INPUT = {
  key: "table",
  label: "Table",
  required: true,
  description: "Table id (tbl\u2026) or table name.",
  builderHint: "Sent URL-encoded as the second path segment; a name works but only an id lets the connector build a record URL."
};
var RECORD_ID_INPUT = {
  key: "recordId",
  label: "Record",
  required: true,
  description: "The record id, rec\u2026",
  builderHint: "Sent URL-encoded as the last path segment; an unknown id answers 404 NOT_FOUND."
};
var TYPECAST_INPUT = {
  key: "typecast",
  label: "Typecast",
  type: "boolean",
  description: 'Let Airtable convert strings to the field\u2019s type, such as "3" into a number or a new option name into a select choice.',
  builderHint: 'Sent as typecast: true only when set; "automatic conversion is disabled by default to ensure data integrity".'
};
var RETURN_BY_ID_INPUT = {
  key: "returnFieldsByFieldId",
  label: "Return fields by id",
  type: "boolean",
  description: "Key the returned fields by field id (fld\u2026) instead of by name.",
  builderHint: "Sent as returnFieldsByFieldId: true only when set; field ids survive a rename, names do not."
};
var FIELDS_INPUT = (verb) => ({
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  description: `An object of cell values keyed by field name or id ${verb}, e.g. {"Name":"Union Square","Visited":true}.`,
  builderHint: "Sent as the fields object of the JSON body; a name Airtable does not know answers 422 UNKNOWN_FIELD_NAME, and a value of the wrong type 422 INVALID_VALUE_FOR_COLUMN unless typecast is set."
});
var RECORD_OUTPUTS = [
  { key: "id", description: "Record id, rec\u2026" },
  { key: "createdTime", description: "When the record was created, ISO 8601" },
  { key: "fields", description: "The cell values keyed by field name; empty cells are omitted" },
  { key: "url", description: "Where to open it, when the table was given by id" }
];
function createAirtableConnector(options = {}) {
  const env = options.env ?? process.env;
  const clock = options.now ?? Date.now;
  const limiter = createRateLimiter({
    now: clock,
    ...options.sleep && { sleep: options.sleep }
  });
  function client(context) {
    return createAirtableClient({
      apiKey: required(context.config, "apiKey", "AIRTABLE_API_KEY"),
      fetch: context.fetch,
      limiter,
      now: clock,
      ...options.sleep && { sleep: options.sleep },
      ...options.random && { random: options.random }
    });
  }
  function scope(config) {
    return {
      baseId: required(config, "baseId", "AIRTABLE_BASE_ID"),
      table: required(config, "table", "AIRTABLE_TABLE"),
      view: text2(config.view),
      filter: text2(config.filterByFormula)
    };
  }
  function watermarkOf(context) {
    return context.since ?? new Date(Date.parse(context.now()) - FIRST_POLL_LOOKBACK_MS).toISOString();
  }
  async function fetchNewRecords(context) {
    const { baseId: baseId2, table: table2, view, filter } = scope(context.config);
    const records = await client(context).listRecords(baseId2, table2, {
      filterByFormula: andFormulas(sinceFormula("CREATED_TIME()", watermarkOf(context)), filter),
      ...view && { view },
      pageSize: MAX_PAGE_SIZE
    });
    return records.sort((left, right) => left.createdTime.localeCompare(right.createdTime)).map((record) => recordToItem(record, { baseId: baseId2, table: table2 }));
  }
  async function fetchUpdatedRecords(context) {
    const { baseId: baseId2, table: table2, view, filter } = scope(context.config);
    const since = watermarkOf(context);
    const field = text2(context.config.lastModifiedField);
    if (field !== void 0) {
      const reference = fieldReference(field);
      const records2 = await client(context).listRecords(baseId2, table2, {
        filterByFormula: andFormulas(reference, sinceFormula(reference, since), filter),
        sort: [{ field, direction: "asc" }],
        ...view && { view },
        pageSize: MAX_PAGE_SIZE
      });
      return records2.map((record) => recordToItem(record, { baseId: baseId2, table: table2, updatedAt: modifiedAt(record, field) }));
    }
    const polledAt = context.now();
    const records = await client(context).listRecords(baseId2, table2, {
      filterByFormula: andFormulas(sinceFormula("LAST_MODIFIED_TIME()", since), filter),
      ...view && { view },
      pageSize: MAX_PAGE_SIZE
    });
    return records.map((record) => recordToItem(record, { baseId: baseId2, table: table2, updatedAt: polledAt }));
  }
  const sampleBase = text2(env.AIRTABLE_BASE_ID);
  const sampleTable = text2(env.AIRTABLE_TABLE);
  const sampleRecord = text2(env.AIRTABLE_RECORD_ID);
  const baseId = sampleBase ?? PLACEHOLDER_BASE_ID;
  const table = sampleTable ?? PLACEHOLDER_TABLE_ID;
  return defineConnector({
    id: "airtable",
    name: "Airtable",
    version: options.version ?? package_default.version,
    description: "Trigger workflows from new or updated Airtable records, and create, update, upsert, delete or read records and base schemas from a step.",
    // Airtable's stacked plates: the top rhombus and the two lower faces.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M12 1.5 23 6l-11 4.5L1 6z",
        "M1 8l10 4.5v11L1 19z",
        "M13 12.5l8.6-3.9L23 9.3v9.2L13 23z"
      ]
    },
    auth: { rung: "key", keys: ["apiKey"] },
    config: [
      {
        key: "apiKey",
        env: "AIRTABLE_API_KEY",
        label: "Personal access token",
        secret: true,
        required: true,
        description: "A personal access token from airtable.com/create/tokens with the scopes data.records:read, data.records:write and schema.bases:read, granted access to each base it should reach.",
        builderHint: "Sent as Authorization: Bearer on every call. Scopes are not enough: the token lists the bases it may touch, and one it was not granted answers 403 or 404. There is no Airtable CLI to borrow a login from."
      },
      {
        key: "baseId",
        env: "AIRTABLE_BASE_ID",
        label: "Base",
        required: true,
        description: "The base the triggers watch, app\u2026 from the base URL or listBases.",
        builderHint: "Only the triggers read it; every action takes its own baseId input."
      },
      {
        key: "table",
        env: "AIRTABLE_TABLE",
        label: "Table",
        required: true,
        description: "The table the triggers watch, by id (tbl\u2026) or by name.",
        builderHint: "A name is URL-encoded into the path; an id also lets each item carry a record URL."
      },
      {
        key: "view",
        env: "AIRTABLE_VIEW",
        label: "View",
        description: "A view name or id to watch. Records hidden by the view are skipped. Blank for the whole table.",
        builderHint: "Sent as view on the listRecords body; records come back in the view\u2019s order and its filters apply."
      },
      {
        key: "filterByFormula",
        env: "AIRTABLE_FILTER_BY_FORMULA",
        label: "Filter formula",
        description: 'An extra Airtable formula a record must satisfy, such as {Status} = "Open".',
        builderHint: 'ANDed with the time clause each poll sends: AND(NOT(IS_BEFORE(CREATED_TIME(), DATETIME_PARSE("\u2026"))), <formula>).'
      },
      {
        key: "lastModifiedField",
        env: "AIRTABLE_LAST_MODIFIED_FIELD",
        label: "Last modified field",
        description: 'The name of a "Last modified time" field in the table, for the updated-record trigger. Blank falls back to LAST_MODIFIED_TIME() and the poll time.',
        builderHint: "The list response has no modification time, so without this field the trigger stamps each record with the poll time and fires once per poll a record was touched in; with it the cell value is the item\u2019s updatedAt and the sort key."
      }
    ],
    triggers: [
      {
        type: "newRecord",
        label: "A record is created",
        description: "Fires once for each record created in the table since the last poll, oldest first.",
        dedupe: "timestamp",
        fetch: fetchNewRecords,
        defaultWorkflow: { name: "Airtable: new records", defaultCronFromMinutes: 5 },
        sample: [recordToItem(SAMPLE_RECORD, { baseId: SAMPLE_BASE_ID, table: SAMPLE_TABLE_ID })]
      },
      {
        type: "updatedRecord",
        label: "A record is updated",
        description: "Fires for each record modified since the last poll. Name a last-modified-time field to stamp items with the real time; without one the poll time stands in.",
        dedupe: "timestamp",
        fetch: fetchUpdatedRecords,
        defaultWorkflow: { name: "Airtable: updated records", defaultCronFromMinutes: 5 },
        sample: [
          recordToItem(SAMPLE_UPDATED_RECORD, {
            baseId: SAMPLE_BASE_ID,
            table: SAMPLE_TABLE_ID,
            updatedAt: modifiedAt(SAMPLE_UPDATED_RECORD, "Last modified")
          })
        ]
      }
    ],
    actions: [
      {
        type: "createRecord",
        label: "Create a record",
        description: "Add one record to a table.",
        // Two calls make two records; Airtable offers no idempotency key.
        idempotent: false,
        inputs: [BASE_ID_INPUT, TABLE_INPUT, FIELDS_INPUT("to set"), TYPECAST_INPUT, RETURN_BY_ID_INPUT],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const baseId2 = String(args.baseId);
          const table2 = String(args.table);
          const record = await client(context).createRecord(baseId2, table2, {
            fields: fieldsArg(args.fields),
            typecast: flag(args.typecast),
            returnFieldsByFieldId: flag(args.returnFieldsByFieldId)
          });
          return recordOutput(record, baseId2, table2);
        }
      },
      {
        type: "updateRecord",
        label: "Update a record",
        description: "Change the given fields of a record and leave the rest as they were.",
        // PATCH with the same values lands the same record twice.
        idempotent: true,
        inputs: [BASE_ID_INPUT, TABLE_INPUT, RECORD_ID_INPUT, FIELDS_INPUT("to change"), TYPECAST_INPUT, RETURN_BY_ID_INPUT],
        outputs: RECORD_OUTPUTS,
        async run(args, context) {
          const baseId2 = String(args.baseId);
          const table2 = String(args.table);
          const record = await client(context).updateRecord(baseId2, table2, String(args.recordId), {
            fields: fieldsArg(args.fields),
            typecast: flag(args.typecast),
            returnFieldsByFieldId: flag(args.returnFieldsByFieldId)
          });
          return recordOutput(record, baseId2, table2);
        }
      },
      {
        type: "upsertRecords",
        label: "Upsert records",
        description: "Create or update up to 10 records at once, matching each on the merge fields: no match creates, one match updates, several fail the call.",
        // A merge value that changes between runs creates rather than updates.
        idempotent: false,
        inputs: [
          BASE_ID_INPUT,
          TABLE_INPUT,
          {
            key: "records",
            label: "Records",
            type: "json",
            required: true,
            description: 'An array of up to 10 {"fields": {\u2026}} objects; a single object is taken as one record.',
            builderHint: "Sent as records on PATCH {baseId}/{table}; more than 10 is refused here rather than split, because a failure mid-batch is not reported per record."
          },
          {
            key: "fieldsToMergeOn",
            label: "Fields to merge on",
            required: true,
            description: "One to three field names or ids that identify a record, comma-separated or as a JSON array.",
            builderHint: "Sent as performUpsert.fieldsToMergeOn; they act as external ids and cannot be computed fields."
          },
          TYPECAST_INPUT
        ],
        outputs: [
          { key: "records", description: "Every record touched, as { id, createdTime, fields }" },
          { key: "createdRecords", description: "The ids of records that were created" },
          { key: "updatedRecords", description: "The ids of records that were updated" }
        ],
        async run(args, context) {
          const fieldsToMergeOn = namesArg(args.fieldsToMergeOn, "fieldsToMergeOn");
          if (fieldsToMergeOn.length < 1 || fieldsToMergeOn.length > MAX_MERGE_FIELDS) {
            throw new Error(`fieldsToMergeOn must name 1 to ${MAX_MERGE_FIELDS} fields, got ${fieldsToMergeOn.length}`);
          }
          const result = await client(context).upsertRecords(String(args.baseId), String(args.table), {
            performUpsert: { fieldsToMergeOn },
            records: recordsArg(args.records),
            typecast: flag(args.typecast)
          });
          return {
            records: result.records ?? [],
            createdRecords: result.createdRecords ?? [],
            updatedRecords: result.updatedRecords ?? []
          };
        }
      },
      {
        type: "deleteRecord",
        label: "Delete a record",
        description: "Delete one record. A second call for the same id answers 404.",
        idempotent: false,
        inputs: [BASE_ID_INPUT, TABLE_INPUT, RECORD_ID_INPUT],
        outputs: [
          { key: "id", description: "The id that was deleted" },
          { key: "deleted", type: "boolean", description: "True when Airtable confirmed the deletion" }
        ],
        async run(args, context) {
          const result = await client(context).deleteRecord(
            String(args.baseId),
            String(args.table),
            String(args.recordId)
          );
          return { id: result.id ?? String(args.recordId), deleted: result.deleted === true };
        }
      },
      {
        type: "getRecord",
        label: "Get a record",
        description: "Read one record by id. Empty cells are omitted from fields.",
        idempotent: true,
        inputs: [BASE_ID_INPUT, TABLE_INPUT, RECORD_ID_INPUT, RETURN_BY_ID_INPUT],
        outputs: RECORD_OUTPUTS,
        ...sampleBase && sampleTable && sampleRecord && { sample: { baseId: sampleBase, table: sampleTable, recordId: sampleRecord } },
        async run(args, context) {
          const baseId2 = String(args.baseId);
          const table2 = String(args.table);
          const record = await client(context).getRecord(baseId2, table2, String(args.recordId), {
            returnFieldsByFieldId: flag(args.returnFieldsByFieldId)
          });
          return recordOutput(record, baseId2, table2);
        }
      },
      {
        type: "listRecords",
        label: "List records",
        description: "List the records of a table, optionally filtered by a formula or a view, up to maxRecords across pages.",
        idempotent: true,
        inputs: [
          BASE_ID_INPUT,
          TABLE_INPUT,
          {
            key: "filterByFormula",
            label: "Filter formula",
            description: 'An Airtable formula; only records where it is truthy are returned, e.g. {Status} = "Open".',
            builderHint: "Sent in the JSON body of POST {baseId}/{table}/listRecords, so its length is not bound by the 16,000 character URL limit."
          },
          {
            key: "view",
            label: "View",
            description: "A view name or id; records come back in the view\u2019s order and hidden ones are skipped.",
            builderHint: "Sent as view; a name is matched exactly, spaces included."
          },
          {
            key: "maxRecords",
            label: "Maximum records",
            type: "number",
            description: "Total records to return across pages. Defaults to 100.",
            builderHint: "Sent as maxRecords and enforced here as well; at most ten pages of 100 are walked in one call."
          },
          {
            key: "pageSize",
            label: "Page size",
            type: "number",
            description: "Records per request, 1 to 100. Defaults to 100.",
            builderHint: "Sent as pageSize; a smaller page only costs more requests against the 5 per second limit."
          },
          {
            key: "fields",
            label: "Fields",
            description: "Field names or ids to include, comma-separated or as a JSON array. Blank returns every field.",
            builderHint: "Sent as the fields array; the primary field is not added on its own."
          },
          {
            key: "sort",
            label: "Sort",
            type: "json",
            description: 'An array of {"field": "Name", "direction": "asc"} objects; direction is asc or desc.',
            builderHint: "Sent as sort; it takes field names only, so CREATED_TIME() and other formulas cannot be sorted on."
          },
          RETURN_BY_ID_INPUT
        ],
        outputs: [
          { key: "records", description: "One entry per record: id, createdTime, fields, url" },
          { key: "count", type: "number", description: "How many records came back" }
        ],
        sample: { baseId, table, maxRecords: "5" },
        async run(args, context) {
          const base = String(args.baseId);
          const tableRef = String(args.table);
          const fields = namesArg(args.fields, "fields");
          const records = await client(context).listRecords(base, tableRef, {
            filterByFormula: text2(args.filterByFormula),
            view: text2(args.view),
            maxRecords: count(args.maxRecords, "maxRecords") ?? MAX_PAGE_SIZE,
            pageSize: count(args.pageSize, "pageSize", MAX_PAGE_SIZE),
            ...fields.length > 0 && { fields },
            sort: sortArg(args.sort),
            returnFieldsByFieldId: flag(args.returnFieldsByFieldId)
          });
          const output = records.map((record) => recordOutput(record, base, tableRef));
          return { records: output, count: output.length };
        }
      },
      {
        type: "listBases",
        label: "List bases",
        description: "The bases the token can reach, 1000 at a time, with the permission level it holds on each.",
        idempotent: true,
        inputs: [
          {
            key: "offset",
            label: "Offset",
            description: "The offset from an earlier answer, to fetch the next thousand bases.",
            builderHint: "Sent as the offset query parameter; present in the output only when another page exists."
          }
        ],
        outputs: [
          { key: "bases", description: "One entry per base: id, name, permissionLevel (none, read, comment, edit or create)" },
          { key: "offset", description: "Pass back to fetch the next page, when present" }
        ],
        sample: {},
        request: {
          url: `${API_ROOT}/meta/bases`,
          headers: { Authorization: "Bearer {{config.apiKey}}" },
          query: { offset: "{{args.offset}}" }
        },
        postReceive: [{ op: "pick", keys: ["bases", "offset"] }]
      },
      {
        type: "getBaseSchema",
        label: "Get a base schema",
        description: "The tables of a base with their fields and views.",
        idempotent: true,
        inputs: [
          {
            ...BASE_ID_INPUT,
            builderHint: "Sent as the path segment of GET meta/bases/{baseId}/tables; needs the schema.bases:read scope."
          }
        ],
        outputs: [
          {
            key: "tables",
            description: "One entry per table: id, name, primaryFieldId, fields [{ id, name, type, options }], views [{ id, name, type }]"
          }
        ],
        sample: { baseId },
        request: {
          url: `${API_ROOT}/meta/bases/{{args.baseId}}/tables`,
          headers: { Authorization: "Bearer {{config.apiKey}}" }
        },
        postReceive: [{ op: "pick", keys: ["tables"] }]
      }
    ]
  });
}
var connector = createAirtableConnector();
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

// airtable/vorn-connector-pack.js
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
