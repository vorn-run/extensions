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

// jira/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  API_PATH: () => API_PATH,
  DEFAULT_RATE_LIMIT_WAIT_MS: () => DEFAULT_RATE_LIMIT_WAIT_MS,
  DEFAULT_SEARCH_RESULTS: () => DEFAULT_SEARCH_RESULTS,
  DEFAULT_SERVER_ERROR_WAIT_MS: () => DEFAULT_SERVER_ERROR_WAIT_MS,
  FIRST_POLL_CREATED_MS: () => FIRST_POLL_CREATED_MS,
  FIRST_POLL_UPDATED_MS: () => FIRST_POLL_UPDATED_MS,
  JiraApiError: () => JiraApiError,
  MAX_PAGES: () => MAX_PAGES,
  MAX_SEARCH_RESULTS: () => MAX_SEARCH_RESULTS,
  OVERLAP_MS: () => OVERLAP_MS,
  PAGE_SIZE: () => PAGE_SIZE,
  PROJECT_PAGE_SIZE: () => PROJECT_PAGE_SIZE,
  SAMPLE_ISSUE: () => SAMPLE_ISSUE,
  SAMPLE_SITE: () => SAMPLE_SITE,
  SAMPLE_TRANSITIONED_ISSUE: () => SAMPLE_TRANSITIONED_ISSUE,
  SAMPLE_UPDATED_ISSUE: () => SAMPLE_UPDATED_ISSUE,
  TOKEN_HINT: () => TOKEN_HINT,
  TRIGGER_FIELDS: () => TRIGGER_FIELDS,
  adfText: () => adfText,
  andClauses: () => andClauses,
  assigneeId: () => assigneeId,
  basicAuth: () => basicAuth,
  boundedJql: () => boundedJql,
  browseUrl: () => browseUrl,
  connector: () => connector,
  count: () => count,
  createJiraClient: () => createJiraClient,
  createJiraConnector: () => createJiraConnector,
  default: () => index_default,
  describeFailure: () => describeFailure2,
  isoOf: () => isoOf,
  issueSummary: () => issueSummary,
  issueToItem: () => issueToItem,
  jqlDate: () => jqlDate,
  jsonObject: () => jsonObject,
  labelList: () => labelList,
  orderBy: () => orderBy,
  projectClause: () => projectClause,
  projectSummary: () => projectSummary,
  quote: () => quote2,
  readSettings: () => readSettings,
  retryAfterMs: () => retryAfterMs2,
  retryDelayMs: () => retryDelayMs,
  sinceClause: () => sinceClause,
  siteOrigin: () => siteOrigin,
  toAdf: () => toAdf,
  transitionSummary: () => transitionSummary,
  transitionedClause: () => transitionedClause,
  userSummary: () => userSummary
});
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
function isDocument(value) {
  return typeof value === "object" && value !== null && value.type === "doc";
}
function asDocument(value) {
  if (isDocument(value)) return value;
  if (typeof value !== "string" || !value.trim().startsWith("{")) return void 0;
  try {
    const parsed = JSON.parse(value);
    return isDocument(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function toAdf(value) {
  const ready = asDocument(value);
  if (ready) return ready;
  const text22 = String(value ?? "").replace(/\r\n?/g, "\n");
  const paragraphs = text22.split(/\n[ \t]*\n+/).map((paragraph) => paragraph.replace(/^\n+|\n+$/g, "")).filter((paragraph) => paragraph.trim() !== "");
  return {
    version: 1,
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph.split("\n").flatMap((line, index) => [
        ...index > 0 ? [{ type: "hardBreak" }] : [],
        ...line === "" ? [] : [{ type: "text", text: line }]
      ])
    }))
  };
}
var BLOCK_TYPES = /* @__PURE__ */ new Set(["paragraph", "heading", "blockquote", "codeBlock", "listItem", "tableRow", "panel", "rule"]);
function adfText(value) {
  if (value === void 0 || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);
  return textOf(value).replace(/\n{3,}/g, "\n\n").trim();
}
function textOf(node) {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "mention" || node.type === "emoji" || node.type === "status") {
    const attrs = node.attrs ?? {};
    return attrs.text ?? attrs.shortName ?? "";
  }
  const inner = (node.content ?? []).map(textOf).join("");
  return BLOCK_TYPES.has(node.type) ? `${inner}

` : inner;
}
var API_PATH = "/rest/api/3";
var DEFAULT_RATE_LIMIT_WAIT_MS = 2e3;
var DEFAULT_SERVER_ERROR_WAIT_MS = 1e3;
var JITTER_MIN = 0.7;
var JITTER_SPAN = 0.6;
var RETRYABLE_SERVER_STATUS = /* @__PURE__ */ new Set([500, 502, 503, 504]);
var MAX_ERROR_BODY2 = 300;
var TOKEN_HINT = "Create one at https://id.atlassian.com/manage-profile/security/api-tokens (Create API token, without scopes) and set JIRA_API_TOKEN on the connection.";
function siteOrigin(raw) {
  const value = String(raw ?? "").trim();
  if (value === "") throw new Error("JIRA_SITE_URL is required, such as https://example.atlassian.net");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`JIRA_SITE_URL is not a URL: "${value}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`JIRA_SITE_URL must be an http(s) URL, got "${value}"`);
  }
  return url.origin;
}
function basicAuth(email, apiToken) {
  return `Basic ${Buffer.from(`${email}:${apiToken}`, "utf8").toString("base64")}`;
}
function browseUrl(site, key) {
  return `${site}/browse/${encodeURIComponent(key)}`;
}
var JiraApiError = class extends Error {
  status;
  errorMessages;
  errors;
  rateLimitReason;
  constructor(status, statusText, body, rateLimitReason) {
    super(describeFailure2(status, statusText, body, rateLimitReason));
    this.name = "JiraApiError";
    this.status = status;
    const collection = collectionOf(body);
    this.errorMessages = collection.errorMessages ?? [];
    this.errors = collection.errors ?? {};
    this.rateLimitReason = rateLimitReason ?? void 0;
  }
};
function collectionOf(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return {};
  const raw = body;
  const errorMessages = Array.isArray(raw.errorMessages) ? raw.errorMessages.filter((entry) => typeof entry === "string") : void 0;
  const errors = typeof raw.errors === "object" && raw.errors !== null && !Array.isArray(raw.errors) ? Object.fromEntries(Object.entries(raw.errors).map(([key, value]) => [key, String(value)])) : void 0;
  return { ...errorMessages && { errorMessages }, ...errors && { errors } };
}
function describeFailure2(status, statusText, body, rateLimitReason) {
  const collection = collectionOf(body);
  const parts = [
    ...collection.errorMessages ?? [],
    ...Object.entries(collection.errors ?? {}).map(([field, message]) => `${field}: ${message}`)
  ];
  let detail = parts.join("; ");
  if (detail === "") {
    if (typeof body === "string" && body.trim() !== "") {
      const text22 = body.trim();
      detail = text22.length > MAX_ERROR_BODY2 ? `${text22.slice(0, MAX_ERROR_BODY2)}\u2026` : text22;
    } else {
      detail = statusText || "request failed";
    }
  }
  const reason = rateLimitReason ? ` (${rateLimitReason})` : "";
  return `${status}: ${detail}${reason}`;
}
function retryAfterMs2(header, now) {
  const trimmed = (header ?? "").trim();
  if (trimmed === "") return void 0;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - now);
}
function retryDelayMs(response, now) {
  const asked = retryAfterMs2(response.headers.get("retry-after"), now);
  if (asked !== void 0) return asked;
  if (response.status === 429) {
    const reset = Date.parse(response.headers.get("x-ratelimit-reset") ?? "");
    return Number.isNaN(reset) ? DEFAULT_RATE_LIMIT_WAIT_MS : Math.max(0, reset - now);
  }
  return DEFAULT_SERVER_ERROR_WAIT_MS;
}
var defaultSleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var defaultFetch = (input, init) => globalThis.fetch(input, init);
async function readBody2(response) {
  const text22 = await response.text();
  if (text22 === "") return { text: text22, json: void 0 };
  try {
    return { text: text22, json: JSON.parse(text22) };
  } catch {
    return { text: text22, json: void 0 };
  }
}
function createJiraClient(options) {
  const site = siteOrigin(options.siteUrl);
  const email = options.email.trim();
  const apiToken = options.apiToken.trim();
  if (email === "") throw new Error("JIRA_EMAIL is required: the email of the Atlassian account the token belongs to");
  if (apiToken === "") throw new Error(`JIRA_API_TOKEN is required. ${TOKEN_HINT}`);
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;
  const headers = {
    authorization: basicAuth(email, apiToken),
    accept: "application/json"
  };
  function jittered(ms) {
    return Math.round(ms * (JITTER_MIN + random() * JITTER_SPAN));
  }
  async function request(method, path, opts = {}) {
    const url = new URL(`${site}${API_PATH}/${path.replace(/^\//, "")}`);
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== void 0 && value !== "") url.searchParams.set(key, String(value));
    }
    const init = {
      method: method.toUpperCase(),
      headers: opts.body === void 0 ? headers : { ...headers, "content-type": "application/json" },
      ...opts.body !== void 0 && { body: JSON.stringify(opts.body) }
    };
    let retried = false;
    for (; ; ) {
      let response;
      try {
        response = await fetchImpl(url.toString(), init);
      } catch (error) {
        if (retried) throw error;
        retried = true;
        await sleep(jittered(DEFAULT_SERVER_ERROR_WAIT_MS));
        continue;
      }
      const rateLimited = response.status === 429;
      const serverErrored = RETRYABLE_SERVER_STATUS.has(response.status) && opts.idempotent !== false;
      if ((rateLimited || serverErrored) && !retried) {
        retried = true;
        await response.text().catch(() => "");
        await sleep(jittered(retryDelayMs(response, now())));
        continue;
      }
      const { text: text22, json } = await readBody2(response);
      if (!response.ok) {
        throw new JiraApiError(response.status, response.statusText, json ?? text22, response.headers.get("ratelimit-reason"));
      }
      if (json === void 0 && text22 !== "") {
        throw new Error(`${site} answered with something other than JSON; check JIRA_SITE_URL: ${text22.slice(0, 80)}`);
      }
      return json ?? {};
    }
  }
  return {
    site,
    request,
    get: (path, query) => request("GET", path, { query, idempotent: true })
  };
}
var TRIGGER_FIELDS = "summary,status,issuetype,priority,assignee,reporter,project,labels,created,updated,resolution";
function isoOf(value) {
  if (typeof value !== "string" || value.trim() === "") return void 0;
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : new Date(at).toISOString();
}
function named(value) {
  return typeof value === "object" && value !== null ? value : void 0;
}
function person(value) {
  const user = named(value);
  if (!user) return null;
  return { accountId: user.accountId ?? "", displayName: user.displayName ?? "" };
}
function issueSummary(issue, site) {
  const fields = issue.fields ?? {};
  const key = issue.key ?? "";
  const status = named(fields.status);
  const project = named(fields.project);
  return {
    id: issue.id ?? "",
    key,
    url: key ? browseUrl(site, key) : "",
    summary: typeof fields.summary === "string" ? fields.summary : "",
    status: status?.name ?? "",
    statusCategory: status?.statusCategory?.name ?? "",
    issueType: named(fields.issuetype)?.name ?? "",
    priority: named(fields.priority)?.name ?? "",
    assignee: person(fields.assignee),
    reporter: person(fields.reporter),
    project: { id: project?.id ?? "", key: project?.key ?? "", name: project?.name ?? "" },
    labels: Array.isArray(fields.labels) ? fields.labels : [],
    created: isoOf(fields.created) ?? "",
    updated: isoOf(fields.updated) ?? "",
    resolution: named(fields.resolution)?.name ?? null,
    descriptionText: adfText(fields.description)
  };
}
function titleOf(issue, kind, status) {
  const key = issue.key ?? issue.id ?? "";
  const summary = typeof issue.fields?.summary === "string" ? issue.fields.summary : "";
  if (kind === "updated") return `${key} updated: ${summary}`;
  if (kind === "transitioned") return `${key} is now ${status}: ${summary}`;
  return `${key}: ${summary}`;
}
function issueToItem(issue, site, kind) {
  const fields = issue.fields ?? {};
  const id = issue.id ?? issue.key ?? "";
  const status = named(fields.status)?.name ?? "";
  const stamp = kind === "created" ? fields.created : fields.updated;
  const updatedAt = isoOf(stamp);
  const assignee = person(fields.assignee);
  return {
    externalId: kind === "created" ? id : `${id}:${typeof stamp === "string" ? stamp : ""}`,
    title: titleOf(issue, kind, status),
    ...issue.key && { url: browseUrl(site, issue.key) },
    description: adfText(fields.description),
    status,
    ...Array.isArray(fields.labels) && { labels: fields.labels.filter((label) => typeof label === "string") },
    ...assignee?.displayName && { assignee: assignee.displayName },
    ...updatedAt && { updatedAt },
    data: { id: issue.id ?? "", key: issue.key ?? "", self: issue.self ?? "", fields }
  };
}
function transitionSummary(transition) {
  return {
    id: transition.id ?? "",
    name: transition.name ?? "",
    to: {
      id: transition.to?.id ?? "",
      name: transition.to?.name ?? "",
      statusCategory: transition.to?.statusCategory?.name ?? ""
    },
    hasScreen: transition.hasScreen === true,
    isAvailable: transition.isAvailable !== false
  };
}
function projectSummary(project, site) {
  return {
    id: project.id ?? "",
    key: project.key ?? "",
    name: project.name ?? "",
    projectTypeKey: project.projectTypeKey ?? "",
    simplified: project.simplified === true,
    style: project.style ?? "",
    url: project.key ? `${site}/browse/${encodeURIComponent(project.key)}` : ""
  };
}
function userSummary(user) {
  return {
    accountId: user.accountId ?? "",
    accountType: user.accountType ?? "",
    displayName: user.displayName ?? "",
    ...user.emailAddress && { emailAddress: user.emailAddress },
    active: user.active !== false,
    timeZone: user.timeZone ?? "",
    locale: user.locale ?? "",
    self: user.self ?? ""
  };
}
var SAMPLE_SITE = "https://example.atlassian.net";
var SAMPLE_ISSUE = {
  id: "10002",
  key: "EX-1",
  self: "https://example.atlassian.net/rest/api/3/issue/10002",
  fields: {
    summary: "Main order flow broken",
    status: { id: "10000", name: "To Do", statusCategory: { key: "new", name: "To Do" } },
    issuetype: { id: "10001", name: "Bug", subtask: false },
    priority: { id: "3", name: "Medium" },
    assignee: null,
    reporter: { accountId: "5b10a2844c20165700ede21g", displayName: "Mia Krystof" },
    project: { id: "10000", key: "EX", name: "Example" },
    labels: ["bugfix"],
    created: "2023-06-24T19:24:50.000+0000",
    updated: "2023-06-24T19:24:50.000+0000",
    resolution: null
  }
};
var SAMPLE_UPDATED_ISSUE = {
  ...SAMPLE_ISSUE,
  fields: { ...SAMPLE_ISSUE.fields, updated: "2023-06-25T08:10:00.000+0000" }
};
var SAMPLE_TRANSITIONED_ISSUE = {
  ...SAMPLE_ISSUE,
  fields: {
    ...SAMPLE_ISSUE.fields,
    status: { id: "10001", name: "Done", statusCategory: { key: "done", name: "Done" } },
    resolution: { name: "Done" },
    updated: "2023-06-26T14:00:00.000+0000"
  }
};
var PROJECT_KEY = /^[A-Za-z][A-Za-z0-9_]*$/;
function quote2(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function projectClause(key) {
  if (key === void 0) return void 0;
  if (!PROJECT_KEY.test(key)) throw new Error(`JIRA_PROJECT_KEY must be a project key such as "EX", got "${key}"`);
  return `project = ${key.toUpperCase()}`;
}
function andClauses(...clauses) {
  const present = clauses.map((clause) => clause?.trim()).filter((clause) => Boolean(clause));
  return present.map((clause, index) => index === 0 ? clause : `(${clause})`).join(" AND ");
}
var DATE_OPTIONS = {
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
};
function partsIn(timeZone) {
  try {
    return new Intl.DateTimeFormat("en-US", { ...DATE_OPTIONS, timeZone });
  } catch {
    return new Intl.DateTimeFormat("en-US", { ...DATE_OPTIONS, timeZone: "UTC" });
  }
}
function jqlDate(iso, timeZone) {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) throw new Error(`Not a timestamp: "${iso}"`);
  const read = {};
  for (const part of partsIn(timeZone).formatToParts(new Date(at))) read[part.type] = part.value;
  return `${read.year}-${read.month}-${read.day} ${read.hour}:${read.minute}`;
}
function sinceClause(field, date) {
  return `${field} >= ${quote2(date)}`;
}
function transitionedClause(status, date) {
  return `status CHANGED TO ${quote2(status)} AFTER ${quote2(date)}`;
}
function orderBy(jql, field) {
  return `${jql} ORDER BY ${field} ASC`;
}
var BARE_ORDER_BY = /^\s*order\s+by\b/i;
function boundedJql(jql) {
  const trimmed = jql.trim();
  if (trimmed === "") throw new Error("jql is required");
  return BARE_ORDER_BY.test(trimmed) ? `created >= "1970-01-01" ${trimmed}` : trimmed;
}
var package_default = {
  name: "@vornrun/connector-jira",
  version: "0.1.1",
  description: "Trigger workflows from issues created, updated or transitioned in Jira Cloud, and create, edit, transition, comment on, assign or search issues from a step.",
  type: "module",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "jira"
  },
  keywords: [
    "vorn",
    "connector",
    "jira"
  ],
  bin: {
    "vorn-connector-jira": "dist/index.js"
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
    category: "Development",
    keywords: [
      "jira",
      "atlassian",
      "issues",
      "tickets",
      "jql",
      "sprints",
      "bugs"
    ],
    auth: "Paste your Atlassian site URL, account email and an API token from id.atlassian.com/manage-profile/security/api-tokens. There is no Jira CLI to sign in with.",
    hosts: [
      "*.atlassian.net",
      "api.atlassian.com"
    ],
    hostsFrom: [
      "JIRA_SITE_URL"
    ]
  }
};
var PAGE_SIZE = 100;
var MAX_PAGES = 10;
var OVERLAP_MS = 2 * 6e4;
var FIRST_POLL_CREATED_MS = 24 * 36e5;
var FIRST_POLL_UPDATED_MS = 36e5;
var DEFAULT_SEARCH_RESULTS = 50;
var MAX_SEARCH_RESULTS = 5e3;
var PROJECT_PAGE_SIZE = 100;
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? void 0 : trimmed;
}
function readSettings(config) {
  const siteUrl = text2(config.siteUrl);
  const email = text2(config.email);
  const apiToken = text2(config.apiToken);
  if (siteUrl === void 0) throw new Error("JIRA_SITE_URL is required, such as https://example.atlassian.net");
  if (email === void 0) throw new Error("JIRA_EMAIL is required: the email of the Atlassian account the token belongs to");
  if (apiToken === void 0) throw new Error(`JIRA_API_TOKEN is required. ${TOKEN_HINT}`);
  const projectKey = text2(config.projectKey);
  const jql = text2(config.jql);
  const status = text2(config.status);
  return {
    siteUrl,
    email,
    apiToken,
    ...projectKey && { projectKey },
    ...jql && { jql },
    ...status && { status }
  };
}
function jsonObject(value, key) {
  if (value === void 0 || value === null || value === "") return void 0;
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${key} must be a JSON object`);
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${key} must be a JSON object`);
  }
  return parsed;
}
function labelList(value) {
  const raw = text2(value);
  if (raw === void 0) return void 0;
  const labels = raw.split(",").map((label) => label.trim()).filter((label) => label !== "");
  const spaced = labels.find((label) => /\s/.test(label));
  if (spaced) throw new Error(`labels cannot contain spaces, got "${spaced}"`);
  return labels;
}
function count(value, key, max) {
  if (value === void 0 || value === null || value === "") return void 0;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw new Error(`${key} must be a whole number from 1 to ${max}, got "${String(value)}"`);
  }
  return number;
}
function isFalse(value) {
  return value === false || /^(false|0|no)$/i.test(String(value ?? "").trim());
}
function assigneeId(value) {
  const raw = text2(value);
  return raw === void 0 || /^(null|none|unassigned)$/i.test(raw) ? null : raw;
}
var ISSUE_KEY_INPUT = {
  key: "issueKey",
  label: "Issue",
  required: true,
  description: "The issue key (EX-12) or id.",
  builderHint: "Sent URL-encoded as the {issueIdOrKey} path segment; a key that no longer matches is looked up case-insensitively and across moves by Jira itself, and an unknown one answers 404."
};
var DESCRIPTION_INPUT = {
  key: "description",
  label: "Description",
  description: "The description as plain text; blank lines start new paragraphs. An ADF document as JSON is sent as it is.",
  builderHint: 'Converted to Atlassian Document Format ({ version: 1, type: "doc", content: [paragraph\u2026] }) because v3 refuses plain text; a value that parses as JSON with type "doc" is passed through.'
};
var FIELDS_INPUT = (verb) => ({
  key: "fields",
  label: "Fields",
  type: "json",
  description: `A JSON object of issue fields ${verb}, keyed by field id, such as {"customfield_10000":"value","duedate":"2026-09-30"}.`,
  builderHint: "Merged over the named inputs into the request body's `fields`; a field the screen does not carry answers 400 with the field named in `errors`."
});
var ISSUE_OUTPUTS = [
  { key: "id", description: "The issue id" },
  { key: "key", description: "The issue key, such as EX-12" },
  { key: "url", description: "Where to open it: <site>/browse/<key>" }
];
var ISSUE_SUMMARY_OUTPUTS = [
  ...ISSUE_OUTPUTS,
  { key: "summary", description: "The summary line" },
  { key: "status", description: "Status name, such as In Progress" },
  { key: "statusCategory", description: "The status category: To Do, In Progress or Done" },
  { key: "issueType", description: "Issue type name" },
  { key: "priority", description: "Priority name" },
  { key: "assignee", description: "{ accountId, displayName } or null" },
  { key: "reporter", description: "{ accountId, displayName } or null" },
  { key: "project", description: "{ id, key, name }" },
  { key: "labels", description: "The labels" },
  { key: "created", description: "When it was created, ISO 8601" },
  { key: "updated", description: "When it last changed, ISO 8601" },
  { key: "resolution", description: "Resolution name, or null while open" },
  { key: "descriptionText", description: "The description flattened to plain text" }
];
function createJiraConnector(options = {}) {
  const env = options.env ?? process.env;
  const zones = /* @__PURE__ */ new Map();
  function clientFor(config, fetchImpl) {
    const settings = readSettings(config);
    return createJiraClient({
      siteUrl: settings.siteUrl,
      email: settings.email,
      apiToken: settings.apiToken,
      fetchImpl: options.fetchImpl ?? fetchImpl,
      ...options.sleep && { sleep: options.sleep },
      ...options.now && { now: options.now },
      ...options.random && { random: options.random }
    });
  }
  async function timeZoneOf(client, email) {
    const cacheKey = `${client.site}|${email}`;
    const cached = zones.get(cacheKey);
    if (cached !== void 0) return cached;
    const me = await client.get("myself");
    const zone = text2(me?.timeZone) ?? "UTC";
    zones.set(cacheKey, zone);
    return zone;
  }
  async function searchAll(client, jql, fields, wanted) {
    const issues = [];
    let nextPageToken;
    let isLast = true;
    for (let page2 = 0; page2 < MAX_PAGES; page2 += 1) {
      const body = await client.get("search/jql", {
        jql,
        fields,
        maxResults: Math.min(PAGE_SIZE, wanted - issues.length),
        nextPageToken
      });
      const found = Array.isArray(body?.issues) ? body.issues : [];
      issues.push(...found);
      nextPageToken = text2(body?.nextPageToken);
      isLast = body?.isLast === true || nextPageToken === void 0;
      if (isLast || found.length === 0 || issues.length >= wanted) break;
    }
    return { issues: issues.slice(0, wanted), isLast, ...nextPageToken && !isLast && { nextPageToken } };
  }
  async function fetchIssues(context, kind) {
    const settings = readSettings(context.config);
    if (kind === "transitioned" && settings.status === void 0) {
      throw new Error("JIRA_STATUS is required for the issueTransitioned trigger: the status name, such as Done");
    }
    const client = clientFor(context.config, context.fetch);
    const zone = await timeZoneOf(client, settings.email);
    const firstLookback = kind === "created" ? FIRST_POLL_CREATED_MS : FIRST_POLL_UPDATED_MS;
    const floor = context.since ? Date.parse(context.since) - OVERLAP_MS : Date.parse(context.now()) - firstLookback;
    const date = jqlDate(new Date(floor).toISOString(), zone);
    const field = kind === "created" ? "created" : "updated";
    const timeClause = kind === "transitioned" ? transitionedClause(settings.status, date) : sinceClause(field, date);
    const jql = orderBy(andClauses(projectClause(settings.projectKey), timeClause, settings.jql), field);
    const page2 = await searchAll(client, jql, TRIGGER_FIELDS, PAGE_SIZE * MAX_PAGES);
    return (page2.issues ?? []).map((issue) => issueToItem(issue, client.site, kind));
  }
  const sampleIssueKey = text2(env.JIRA_ISSUE_KEY);
  return defineConnector({
    id: "jira",
    name: "Jira",
    version: options.version ?? package_default.version,
    description: "Trigger workflows when a Jira Cloud issue is created, updated or moved to a status, and create, edit, transition, comment on, assign, read or search issues from a step.",
    // Jira's mark: three rotated tiles stacked up-left, the bottom one notched at its centre.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M16 9 23 16 16 23 9 16 10.75 14.25 12.5 16 16 12.5 14.25 10.75z",
        "M12 5 15.5 8.5 13.25 10.75 15 12.5 12.5 15 10.75 13.25 8.5 15.5 5 12 6.75 10.25 8.5 12 12 8.5 10.25 6.75z",
        "M8 1 11.5 4.5 9.25 6.75 11 8.5 8.5 11 6.75 9.25 4.5 11.5 1 8z"
      ]
    },
    auth: { rung: "key", keys: ["apiToken"] },
    config: [
      {
        key: "siteUrl",
        env: "JIRA_SITE_URL",
        label: "Site URL",
        required: true,
        description: "Your Jira Cloud site, such as https://example.atlassian.net.",
        builderHint: "Only the origin is kept: a trailing slash or a path is dropped and /rest/api/3 appended. A mistyped site answers 200 with an HTML login page, which the connector reports as a non-JSON answer."
      },
      {
        key: "email",
        env: "JIRA_EMAIL",
        label: "Account email",
        required: true,
        description: "The email address of the Atlassian account the API token belongs to.",
        builderHint: 'The user half of HTTP Basic auth: Authorization: Basic base64(email + ":" + apiToken) on every call.'
      },
      {
        key: "apiToken",
        env: "JIRA_API_TOKEN",
        label: "API token",
        secret: true,
        required: true,
        description: "An API token from https://id.atlassian.com/manage-profile/security/api-tokens, created without scopes. Every issue created or comment posted is attributed to this account.",
        builderHint: 'The password half of Basic auth. A token created "with scopes" only works against api.atlassian.com/ex/jira/{cloudId} and answers 401 on the site URL. A 401 is never retried: repeated failures trip a CAPTCHA that blocks the API until the person logs in through the browser.'
      },
      {
        key: "projectKey",
        env: "JIRA_PROJECT_KEY",
        label: "Project key",
        description: "Limit the triggers to one project, by key (EX). Blank watches every project the account can browse.",
        builderHint: "Adds `project = <KEY>` in front of every trigger's JQL; letters, digits and underscores only, so it cannot carry JQL of its own."
      },
      {
        key: "jql",
        env: "JIRA_JQL",
        label: "Extra JQL",
        description: "An extra JQL filter every trigger applies, such as issuetype = Bug AND priority in (High, Highest).",
        builderHint: "ANDed in parentheses after the time clause, so ORs inside it stay together; leave out ORDER BY, the trigger adds its own."
      },
      {
        key: "status",
        env: "JIRA_STATUS",
        label: "Status",
        description: "The status name the issueTransitioned trigger watches for, such as Done. Only that trigger reads it.",
        builderHint: 'Quoted into `status CHANGED TO "<status>" AFTER "<cursor>"`; the name is matched by Jira, not here.'
      }
    ],
    triggers: [
      {
        type: "newIssue",
        label: "An issue is created",
        description: "Fires once for each issue created since the last poll, oldest first, within the project and JQL filter from the settings.",
        dedupe: "timestamp",
        fetch: (context) => fetchIssues(context, "created"),
        defaultWorkflow: { name: "Jira: new issues", defaultCronFromMinutes: 5 },
        sample: [issueToItem(SAMPLE_ISSUE, SAMPLE_SITE, "created")]
      },
      {
        type: "issueUpdated",
        label: "An issue is updated",
        description: "Fires for each change to an issue since the last poll, keyed by issue and update time, so an issue edited twice fires twice.",
        dedupe: "timestamp",
        fetch: (context) => fetchIssues(context, "updated"),
        defaultWorkflow: { name: "Jira: updated issues", defaultCronFromMinutes: 5 },
        sample: [issueToItem(SAMPLE_UPDATED_ISSUE, SAMPLE_SITE, "updated")]
      },
      {
        type: "issueTransitioned",
        label: "An issue moves to a status",
        description: "Fires when an issue is transitioned into the status named in the settings. JQL records that the change happened, not when, so the issue's last update stands in as the time.",
        dedupe: "timestamp",
        fetch: (context) => fetchIssues(context, "transitioned"),
        defaultWorkflow: { name: "Jira: issues moved to a status", defaultCronFromMinutes: 5 },
        sample: [issueToItem(SAMPLE_TRANSITIONED_ISSUE, SAMPLE_SITE, "transitioned")]
      }
    ],
    actions: [
      {
        type: "createIssue",
        label: "Create an issue",
        description: "Create one issue in a project. The description is written as plain text and converted to Atlassian Document Format.",
        // Two calls make two issues; Jira offers no idempotency key.
        idempotent: false,
        inputs: [
          {
            key: "projectKey",
            label: "Project",
            required: true,
            description: "The project key, such as EX.",
            builderHint: "Sent as fields.project.key; the account needs Create issues in that project or the call answers 403."
          },
          {
            key: "issueType",
            label: "Issue type",
            required: true,
            description: "The issue type name: Bug, Task, Story, Epic or Subtask.",
            builderHint: "Sent as fields.issuetype.name and matched by Jira against the project's issue type scheme; an unknown name answers 400 naming issuetype in errors."
          },
          {
            key: "summary",
            label: "Summary",
            required: true,
            description: "The one-line summary.",
            builderHint: "Sent as fields.summary; required by every default screen."
          },
          DESCRIPTION_INPUT,
          {
            key: "assigneeAccountId",
            label: "Assignee account id",
            description: "The account id of the assignee, from getCurrentUser or the issue's assignee output.",
            builderHint: "Sent as fields.assignee.id; names and emails are not accepted here, only account ids."
          },
          {
            key: "labels",
            label: "Labels",
            description: "Comma-separated labels, such as bugfix,triaged. Labels cannot contain spaces.",
            builderHint: "Sent as the fields.labels array; a label with a space is refused before the call."
          },
          {
            key: "priority",
            label: "Priority",
            description: "The priority name: Highest, High, Medium, Low or Lowest.",
            builderHint: `Sent as fields.priority.name; the reference's own 400 example is "Field 'priority' is required" on a project whose screen demands it.`
          },
          {
            key: "parentKey",
            label: "Parent issue",
            description: "The parent issue key, for a subtask or a child of an epic.",
            builderHint: "Sent as fields.parent.key; a Subtask issue type needs one."
          },
          FIELDS_INPUT("to set as well")
        ],
        outputs: [...ISSUE_OUTPUTS, { key: "self", description: "The REST URL of the issue" }],
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const description = text2(args.description);
          const assignee = text2(args.assigneeAccountId);
          const labels = labelList(args.labels);
          const priority = text2(args.priority);
          const parent = text2(args.parentKey);
          const fields = {
            project: { key: String(args.projectKey).trim() },
            issuetype: { name: String(args.issueType).trim() },
            summary: String(args.summary),
            ...description && { description: toAdf(description) },
            ...assignee && { assignee: { id: assignee } },
            ...labels && labels.length > 0 && { labels },
            ...priority && { priority: { name: priority } },
            ...parent && { parent: { key: parent } },
            ...jsonObject(args.fields, "fields")
          };
          const issue = await client.request("POST", "issue", { body: { fields }, idempotent: false });
          const key = issue?.key ?? "";
          return { id: issue?.id ?? "", key, url: key ? browseUrl(client.site, key) : "", self: issue?.self ?? "" };
        }
      },
      {
        type: "updateIssue",
        label: "Update an issue",
        description: "Edit the summary, description or any fields of an issue; the rest stays as it was. Transitions are ignored here, use transitionIssue.",
        // Setting the same fields twice leaves the same issue.
        idempotent: true,
        inputs: [
          ISSUE_KEY_INPUT,
          {
            key: "summary",
            label: "Summary",
            description: "A new summary line.",
            builderHint: "Sent as fields.summary when set."
          },
          DESCRIPTION_INPUT,
          FIELDS_INPUT("to set"),
          {
            key: "update",
            label: "Update operations",
            type: "json",
            description: 'A JSON object of update operations, such as {"labels":[{"add":"triaged"}]} or {"components":[{"remove":{"name":"UI"}}]}.',
            builderHint: "Sent as the body's `update`; a field may appear in `fields` or `update`, not both, or Jira answers 400."
          },
          {
            key: "notifyUsers",
            label: "Notify users",
            type: "boolean",
            description: "Send the usual edit notifications. Defaults to true; false needs project administer permission or is ignored.",
            builderHint: "Sent as notifyUsers=false on the query only when set to false."
          }
        ],
        outputs: [...ISSUE_OUTPUTS, { key: "issue", description: "The issue after the edit, as Jira returns it" }],
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const issueKey = String(args.issueKey).trim();
          const summary = text2(args.summary);
          const description = text2(args.description);
          const extra = jsonObject(args.fields, "fields");
          const update = jsonObject(args.update, "update");
          if (summary === void 0 && description === void 0 && extra === void 0 && update === void 0) {
            throw new Error("updateIssue needs at least one of summary, description, fields or update");
          }
          const fields = {
            ...summary && { summary },
            ...description && { description: toAdf(description) },
            ...extra
          };
          const issue = await client.request("PUT", `issue/${encodeURIComponent(issueKey)}`, {
            query: { returnIssue: true, ...isFalse(args.notifyUsers) && { notifyUsers: false } },
            body: { ...Object.keys(fields).length > 0 && { fields }, ...update && { update } },
            idempotent: true
          });
          const key = issue?.key ?? issueKey;
          return { id: issue?.id ?? "", key, url: browseUrl(client.site, key), issue: issue ?? {} };
        }
      },
      {
        type: "transitionIssue",
        label: "Transition an issue",
        description: "Move an issue through a workflow transition, by transition id or name, optionally with a comment and screen fields.",
        // Once taken the transition is gone, so a second call answers 400.
        idempotent: false,
        inputs: [
          ISSUE_KEY_INPUT,
          {
            key: "transition",
            label: "Transition",
            required: true,
            description: "A transition id (31) or name (Done). A name is matched against the transitions the issue offers, then against their target statuses.",
            builderHint: "Digits are sent as transition.id as they are; anything else is resolved case-insensitively against GET issue/{key}/transitions by name, then by to.name. When that list names nothing the value is sent as the id and Jira's own answer stands; when it names transitions and none match, the error lists them."
          },
          {
            key: "comment",
            label: "Comment",
            description: "A plain-text comment to add with the transition.",
            builderHint: "Sent as update.comment[0].add.body in ADF, the documented way to comment on a transition."
          },
          {
            key: "fields",
            label: "Fields",
            type: "json",
            description: 'A JSON object of fields the transition screen asks for, such as {"resolution":{"name":"Done"}}.',
            builderHint: "Sent as the body's `fields`; only fields on the transition screen are accepted."
          }
        ],
        outputs: [
          { key: "key", description: "The issue key or id that was transitioned" },
          { key: "id", description: "The transition id taken" },
          { key: "name", description: "The transition name, when it was resolved" },
          { key: "to", description: "The status the issue moved to, when known" }
        ],
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const issueKey = String(args.issueKey).trim();
          const wanted = String(args.transition).trim();
          const path = `issue/${encodeURIComponent(issueKey)}/transitions`;
          const listed = await client.get(path);
          const transitions = Array.isArray(listed?.transitions) ? listed.transitions : [];
          const lower = wanted.toLowerCase();
          const chosen = /^\d+$/.test(wanted) ? transitions.find((transition) => transition.id === wanted) : transitions.find((transition) => transition.name?.toLowerCase() === lower) ?? transitions.find((transition) => transition.to?.name?.toLowerCase() === lower);
          if (!chosen && !/^\d+$/.test(wanted) && transitions.length > 0) {
            const names = transitions.map((transition) => `${transition.name ?? "?"} (${transition.id ?? "?"})`).join(", ");
            throw new Error(`${issueKey} offers no transition named "${wanted}"; it offers: ${names}`);
          }
          const id = chosen?.id ?? wanted;
          const comment = text2(args.comment);
          const fields = jsonObject(args.fields, "fields");
          await client.request("POST", path, {
            body: {
              transition: { id },
              ...comment && { update: { comment: [{ add: { body: toAdf(comment) } }] } },
              ...fields && { fields }
            },
            idempotent: false
          });
          return { key: issueKey, id, name: chosen?.name ?? "", to: chosen?.to?.name ?? "" };
        }
      },
      {
        type: "addComment",
        label: "Add a comment",
        description: "Post a comment on an issue. Plain text is converted to Atlassian Document Format.",
        // Two calls post two comments.
        idempotent: false,
        inputs: [
          ISSUE_KEY_INPUT,
          {
            key: "body",
            label: "Comment",
            required: true,
            description: "The comment as plain text; blank lines start new paragraphs. An ADF document as JSON is sent as it is.",
            builderHint: "Sent as `body` in ADF on POST issue/{key}/comment; the account needs Add comments on the project."
          }
        ],
        outputs: [
          { key: "id", description: "The comment id" },
          { key: "created", description: "When it was posted, ISO 8601" },
          { key: "updated", description: "When it last changed, ISO 8601" },
          { key: "author", description: "{ accountId, displayName } of the account that posted it" },
          { key: "self", description: "The REST URL of the comment" },
          { key: "url", description: "Where to open it: <site>/browse/<key>?focusedCommentId=<id>" }
        ],
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const issueKey = String(args.issueKey).trim();
          const comment = await client.request("POST", `issue/${encodeURIComponent(issueKey)}/comment`, {
            body: { body: toAdf(String(args.body)) },
            idempotent: false
          });
          const id = comment?.id ?? "";
          return {
            id,
            created: isoOf(comment?.created) ?? "",
            updated: isoOf(comment?.updated) ?? "",
            author: { accountId: comment?.author?.accountId ?? "", displayName: comment?.author?.displayName ?? "" },
            self: comment?.self ?? "",
            url: `${browseUrl(client.site, issueKey)}${id ? `?focusedCommentId=${encodeURIComponent(id)}` : ""}`
          };
        }
      },
      {
        type: "assignIssue",
        label: "Assign an issue",
        description: "Assign an issue to an account, or unassign it.",
        // The same assignee set twice is the same issue.
        idempotent: true,
        inputs: [
          ISSUE_KEY_INPUT,
          {
            key: "accountId",
            label: "Account id",
            description: "The assignee's account id. Blank or null unassigns; -1 assigns the project's default assignee.",
            builderHint: "Sent as { accountId } on PUT issue/{key}/assignee, with null for unassigned as the reference documents."
          }
        ],
        outputs: [
          { key: "key", description: "The issue key or id" },
          { key: "accountId", description: "The account id now assigned, or null" }
        ],
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const issueKey = String(args.issueKey).trim();
          const accountId = assigneeId(args.accountId);
          await client.request("PUT", `issue/${encodeURIComponent(issueKey)}/assignee`, {
            body: { accountId },
            idempotent: true
          });
          return { key: issueKey, accountId };
        }
      },
      {
        type: "getIssue",
        label: "Get an issue",
        description: "Read one issue by key or id, with its main fields flattened and the description as plain text.",
        idempotent: true,
        inputs: [
          ISSUE_KEY_INPUT,
          {
            key: "fields",
            label: "Fields",
            description: "Comma-separated field ids to return, such as summary,status,customfield_10000. Defaults to every navigable field.",
            builderHint: "Sent as the `fields` query parameter; *navigable is the default here because the API's own default is only `id`."
          }
        ],
        outputs: [...ISSUE_SUMMARY_OUTPUTS, { key: "issue", description: "The issue as Jira returns it, fields included" }],
        ...sampleIssueKey && { sample: { issueKey: sampleIssueKey } },
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const issueKey = String(args.issueKey).trim();
          const issue = await client.get(`issue/${encodeURIComponent(issueKey)}`, {
            fields: text2(args.fields) ?? "*navigable"
          });
          return { ...issueSummary(issue ?? {}, client.site), issue: issue ?? {} };
        }
      },
      {
        type: "searchIssues",
        label: "Search issues",
        description: "Run a JQL query and return the matching issues, paging until maxResults are collected.",
        idempotent: true,
        inputs: [
          {
            key: "jql",
            label: "JQL",
            required: true,
            description: 'A JQL expression, such as project = EX AND status = "In Progress" ORDER BY updated DESC.',
            builderHint: 'Sent as `jql` on GET search/jql, which needs a bounded query; a bare ORDER BY is prefixed with created >= "1970-01-01" so it is accepted.'
          },
          {
            key: "fields",
            label: "Fields",
            description: "Comma-separated field ids to return. Defaults to summary, status, issue type, priority, assignee, reporter, project, labels, created, updated and resolution.",
            builderHint: "Sent as `fields`; the API returns only `id` when it is left out, so the default list is always sent."
          },
          {
            key: "maxResults",
            label: "Maximum results",
            type: "number",
            description: "How many issues to return in total, 1 to 5000. Defaults to 50.",
            builderHint: "Pages of up to 100 are walked with nextPageToken until this many are collected or the last page arrives, at most ten pages per call."
          }
        ],
        outputs: [
          { key: "issues", description: "One entry per issue in the getIssue shape: id, key, url, summary, status, \u2026" },
          { key: "count", type: "number", description: "How many issues came back" },
          { key: "isLast", type: "boolean", description: "True when no further page exists" },
          { key: "nextPageToken", description: "The token for the next page, when the walk stopped before the end" }
        ],
        sample: { jql: "order by created DESC", maxResults: "5" },
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const jql = boundedJql(String(args.jql ?? ""));
          const fields = text2(args.fields) ?? TRIGGER_FIELDS;
          const wanted = count(args.maxResults, "maxResults", MAX_SEARCH_RESULTS) ?? DEFAULT_SEARCH_RESULTS;
          const page2 = await searchAll(client, jql, fields, wanted);
          const issues = (page2.issues ?? []).map((issue) => issueSummary(issue, client.site));
          return {
            issues,
            count: issues.length,
            isLast: page2.isLast === true,
            ...page2.nextPageToken && { nextPageToken: page2.nextPageToken }
          };
        }
      },
      {
        type: "listTransitions",
        label: "List transitions",
        description: "The workflow transitions an issue can take from its current status.",
        idempotent: true,
        inputs: [ISSUE_KEY_INPUT],
        outputs: [
          { key: "transitions", description: "One entry per transition: id, name, to { id, name, statusCategory }, hasScreen, isAvailable" },
          { key: "count", type: "number", description: "How many transitions the issue offers" }
        ],
        ...sampleIssueKey && { sample: { issueKey: sampleIssueKey } },
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const issueKey = String(args.issueKey).trim();
          const body = await client.get(`issue/${encodeURIComponent(issueKey)}/transitions`);
          const transitions = (Array.isArray(body?.transitions) ? body.transitions : []).map(transitionSummary);
          return { transitions, count: transitions.length };
        }
      },
      {
        type: "listProjects",
        label: "List projects",
        description: "The projects the account can browse, ordered by key, optionally filtered by a name or key fragment and by type.",
        idempotent: true,
        inputs: [
          {
            key: "query",
            label: "Query",
            description: "Return only projects whose key or name contains this text, case-insensitively.",
            builderHint: "Sent as `query` on GET project/search."
          },
          {
            key: "typeKey",
            label: "Project type",
            type: "select",
            options: [
              { value: "software", label: "Software" },
              { value: "business", label: "Business" },
              { value: "service_desk", label: "Service management" }
            ],
            description: "Limit to one project type. Blank returns every type.",
            builderHint: "Sent as `typeKey` when set; the API also accepts a comma-separated list."
          }
        ],
        outputs: [
          { key: "projects", description: "One entry per project: id, key, name, projectTypeKey, simplified, style, url" },
          { key: "count", type: "number", description: "How many projects came back" }
        ],
        sample: {},
        async run(args, context) {
          const client = clientFor(context.config, context.fetch);
          const projects = [];
          for (let page2 = 0; page2 < MAX_PAGES; page2 += 1) {
            const body = await client.get("project/search", {
              maxResults: PROJECT_PAGE_SIZE,
              orderBy: "key",
              startAt: projects.length,
              query: text2(args.query),
              typeKey: text2(args.typeKey)
            });
            const values = Array.isArray(body?.values) ? body.values : [];
            projects.push(...values);
            if (values.length === 0 || body?.isLast !== false) break;
          }
          return { projects: projects.map((project) => projectSummary(project, client.site)), count: projects.length };
        }
      },
      {
        type: "getCurrentUser",
        label: "Get the current user",
        description: "The account the API token belongs to, with its account id and time zone.",
        idempotent: true,
        inputs: [],
        outputs: [
          { key: "accountId", description: "The account id, as assignee fields take it" },
          { key: "accountType", description: "atlassian, app or customer" },
          { key: "displayName", description: "The display name" },
          { key: "emailAddress", description: "The email address, when the account does not hide it" },
          { key: "active", type: "boolean", description: "Whether the account is active" },
          { key: "timeZone", description: "The account's time zone, which JQL dates are read in" },
          { key: "locale", description: "The account's locale" },
          { key: "self", description: "The REST URL of the user" }
        ],
        sample: {},
        async run(_args, context) {
          const client = clientFor(context.config, context.fetch);
          return userSummary(await client.get("myself") ?? {});
        }
      }
    ],
    async preflight() {
      const missing = ["JIRA_SITE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"].filter((name) => text2(env[name]) === void 0);
      if (missing.length > 0) return { ok: false, message: `Set ${missing.join(", ")}. ${TOKEN_HINT}` };
      const client = clientFor({ siteUrl: env.JIRA_SITE_URL, email: env.JIRA_EMAIL, apiToken: env.JIRA_API_TOKEN });
      const me = await client.get("myself");
      return { ok: true, message: `Signed in to ${client.site} as ${me?.displayName ?? me?.accountId ?? "the token's account"}` };
    }
  });
}
var connector = createJiraConnector();
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

// jira/vorn-connector-pack.js
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
