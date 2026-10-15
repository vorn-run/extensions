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

// ollama/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  CONNECTION_RETRY_WAIT_MS: () => CONNECTION_RETRY_WAIT_MS,
  DEFAULT_BASE_URL: () => DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS: () => DEFAULT_TIMEOUT_MS,
  LONG_TIMEOUT_MS: () => LONG_TIMEOUT_MS,
  OllamaApiError: () => OllamaApiError,
  SAMPLE_MODEL_NAME: () => SAMPLE_MODEL_NAME,
  connector: () => connector,
  createOllamaClient: () => createOllamaClient,
  createOllamaConnector: () => createOllamaConnector,
  default: () => index_default,
  describeFailure: () => describeFailure2,
  normalizeBaseUrl: () => normalizeBaseUrl
});
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var DEFAULT_BASE_URL = "http://localhost:11434";
var LONG_TIMEOUT_MS = 10 * 6e4;
var DEFAULT_TIMEOUT_MS = 3e4;
var CONNECTION_RETRY_WAIT_MS = 2e3;
var MAX_ERROR_BODY2 = 300;
var MODEL_NOT_FOUND = /^model '([^']*)' not found$/;
function normalizeBaseUrl(raw) {
  let url = String(raw ?? "").trim();
  if (url === "") return DEFAULT_BASE_URL;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, "");
  url = url.replace(/\/api$/i, "");
  return url.replace(/\/+$/, "");
}
var OllamaApiError = class extends Error {
  status;
  detail;
  constructor(status, body) {
    const detail = errorMessage(body);
    super(`${describeFailure2(detail)} (HTTP ${status})`);
    this.name = "OllamaApiError";
    this.status = status;
    this.detail = detail;
  }
};
function errorMessage(body) {
  const error = body?.error;
  if (typeof error === "string" && error.trim() !== "") return error.trim();
  const raw = typeof body === "string" ? body : body === void 0 ? "" : JSON.stringify(body);
  const trimmed = raw.trim();
  if (trimmed === "") return "no body";
  return trimmed.length > MAX_ERROR_BODY2 ? `${trimmed.slice(0, MAX_ERROR_BODY2)}\u2026` : trimmed;
}
function describeFailure2(detail) {
  const missing = MODEL_NOT_FOUND.exec(detail);
  return missing ? `Model '${missing[1]}' is not present on the server; pull it first` : detail;
}
function isConnectionRefused(error) {
  let current = error;
  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth += 1) {
    const candidate = current;
    if (candidate.code === "ECONNREFUSED") return true;
    if (Array.isArray(candidate.errors) && candidate.errors.some(isConnectionRefused)) return true;
    current = candidate.cause;
  }
  return false;
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
function createOllamaClient(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const sleep = options.sleep ?? defaultSleep;
  const apiKey = String(options.apiKey ?? "").trim();
  const headers = {
    accept: "application/json",
    ...apiKey !== "" && { authorization: `Bearer ${apiKey}` }
  };
  async function send(url, init, timeoutMs, route) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
      return await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`Ollama did not answer ${route} within ${Math.round(timeoutMs / 1e3)}s`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  async function request(method, path, opts = {}) {
    const url = `${baseUrl}/api/${path.replace(/^\//, "")}`;
    const route = `${method.toUpperCase()} /api/${path.replace(/^\//, "")}`;
    const init = {
      method: method.toUpperCase(),
      headers: opts.body === void 0 ? headers : { ...headers, "content-type": "application/json" },
      ...opts.body !== void 0 && { body: JSON.stringify(opts.body) }
    };
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let response;
    try {
      response = await send(url, init, timeoutMs, route);
    } catch (error) {
      if (!isConnectionRefused(error)) throw error;
      await sleep(CONNECTION_RETRY_WAIT_MS);
      try {
        response = await send(url, init, timeoutMs, route);
      } catch (again) {
        if (!isConnectionRefused(again)) throw again;
        throw new Error(`Ollama did not answer at ${baseUrl}; the server may be starting or not running`);
      }
    }
    const body = await readBody2(response);
    if (!response.ok) throw new OllamaApiError(response.status, body);
    return body;
  }
  return {
    baseUrl,
    request,
    get: (path) => request("GET", path),
    post: (path, body, timeoutMs) => request("POST", path, { body, ...timeoutMs !== void 0 && { timeoutMs } })
  };
}
var SAMPLE_MODEL = {
  name: "qwen2.5-coder:7b",
  model: "qwen2.5-coder:7b",
  modified_at: "2026-08-02T16:07:41.209152383-06:00",
  size: 4683087561,
  digest: "dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364",
  details: {
    parent_model: "",
    format: "gguf",
    family: "qwen2",
    families: ["qwen2"],
    parameter_size: "7.6B",
    quantization_level: "Q4_K_M"
  }
};
var SAMPLE_RUNNING_MODEL = {
  name: "qwen2.5-coder:7b",
  model: "qwen2.5-coder:7b",
  size: 4740716952,
  size_vram: 4740716952,
  digest: "dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364",
  details: SAMPLE_MODEL.details,
  expires_at: "2026-09-10T07:31:16.885215-06:00",
  context_length: 4096
};
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? void 0 : trimmed;
}
function flag(value) {
  return value === true || /^(true|1|yes)$/i.test(String(value ?? "").trim());
}
function textOrJsonArray(value) {
  if (Array.isArray(value)) return value;
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
function jsonObject(value, key) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error(`${key} must be a JSON object`);
  return value;
}
function messagesArg(value, system) {
  const parsed = typeof value === "object" && value !== null && !Array.isArray(value) ? [] : textOrJsonArray(value);
  const turns = typeof parsed === "string" ? [{ role: "user", content: parsed }] : parsed.filter((turn) => typeof turn === "object" && turn !== null && !Array.isArray(turn));
  if (system !== void 0 && turns[0]?.role !== "system") return [{ role: "system", content: system }, ...turns];
  return turns;
}
function formatArg(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value;
  const raw = text2(value);
  if (raw === void 0) return void 0;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return raw;
}
function keepAliveArg(value) {
  const raw = text2(value);
  if (raw === void 0) return void 0;
  return /^-?\d+$/.test(raw) ? Number(raw) : raw;
}
function isoOf(value) {
  const at = Date.parse(String(value ?? ""));
  return Number.isNaN(at) ? void 0 : new Date(at).toISOString();
}
function gigabytes(bytes) {
  return `${((bytes ?? 0) / 1e9).toFixed(1)} GB`;
}
function libraryUrl(model) {
  const name = model.name ?? model.model ?? "";
  if (name === "" || name.includes("/") || text2(model.remote_host) !== void 0) return void 0;
  return `https://ollama.com/library/${encodeURIComponent(name.split(":")[0])}`;
}
function modelToItem(model) {
  const name = model.name ?? model.model ?? "";
  const digest = model.digest ?? "";
  const family = text2(model.details?.family);
  const size = text2(model.details?.parameter_size);
  const detail = [family, size].filter((part) => part !== void 0).join(", ");
  const url = libraryUrl(model);
  const updatedAt = isoOf(model.modified_at);
  return {
    externalId: `${name}@${digest}`,
    title: detail ? `${name} (${detail})` : name,
    ...url && { url },
    ...updatedAt && { updatedAt },
    data: {
      name,
      digest,
      size: model.size ?? 0,
      modified_at: model.modified_at ?? null,
      family: family ?? null,
      parameter_size: size ?? null,
      details: model.details ?? {}
    }
  };
}
function runningToItem(model) {
  const name = model.name ?? model.model ?? "";
  const expires = model.expires_at ?? "";
  const updatedAt = isoOf(model.expires_at);
  return {
    externalId: `${name}@${expires}`,
    title: `${name} loaded (${gigabytes(model.size_vram ?? model.size)} in VRAM, context ${model.context_length ?? 0})`,
    ...updatedAt && { updatedAt },
    data: {
      name,
      digest: model.digest ?? "",
      size: model.size ?? 0,
      size_vram: model.size_vram ?? 0,
      expires_at: model.expires_at ?? null,
      context_length: model.context_length ?? 0,
      details: model.details ?? {}
    }
  };
}
var package_default = {
  name: "@vornrun/connector-ollama",
  version: "0.1.1",
  description: "Trigger workflows when a local Ollama model is added, updated or loaded into memory, and chat, generate, embed, and list, show, pull, copy or delete models from a step.",
  type: "module",
  license: "MIT",
  author: "Javier Canizalez <javier-canizalez@outlook.com>",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "ollama"
  },
  keywords: [
    "vorn",
    "connector",
    "ollama",
    "llm"
  ],
  bin: {
    "vorn-connector-ollama": "dist/index.js"
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
      "ollama",
      "llm",
      "local models",
      "chat",
      "generate",
      "embeddings",
      "qwen",
      "llama",
      "gemma"
    ],
    auth: "Nothing to sign in with: Ollama serves http://localhost:11434 without credentials. Set OLLAMA_HOST for another server and OLLAMA_API_KEY for a hosted one.",
    hosts: [
      "localhost"
    ],
    hostsFrom: [
      "OLLAMA_HOST"
    ]
  }
};
var SAMPLE_MODEL_NAME = "qwen2.5-coder:7b";
var MODEL_INPUT = {
  key: "model",
  label: "Model",
  required: true,
  description: `The model name in model:tag form; the tag defaults to latest. listModels returns what is present.`,
  builderHint: `A name that is not on the server answers 404 and is reported as "not present; pull it first"; nothing is pulled on the caller's behalf.`
};
var SYSTEM_INPUT = {
  key: "system",
  label: "System prompt",
  description: "Instructions for the model, kept apart from the conversation.",
  builderHint: "On chat it is prepended as a system turn unless the messages already start with one; on generate it is sent as system."
};
var FORMAT_INPUT = {
  key: "format",
  label: "Format",
  description: "json for any valid JSON, or a JSON schema object the answer must match.",
  builderHint: "Sent as format untouched. With a schema, also describe it in the prompt so the model grounds its answer; the reply is text, so parse content yourself."
};
var OPTIONS_INPUT = {
  key: "options",
  label: "Options",
  type: "json",
  description: 'Runtime options such as { "temperature": 0.2, "num_predict": 256 }.',
  builderHint: "Passed through as options: temperature, num_predict, seed, top_k, top_p, min_p, stop, num_ctx and any other Modelfile parameter."
};
var KEEP_ALIVE_INPUT = {
  key: "keepAlive",
  label: "Keep alive",
  description: "How long the model stays loaded after the reply, such as 10m; 0 unloads it at once.",
  builderHint: "Sent as keep_alive. A duration string or a number of seconds; a negative number keeps it loaded until the server stops."
};
var TIMING_OUTPUTS = [
  { key: "evalCount", type: "number", description: "Tokens generated in the reply" },
  { key: "promptEvalCount", type: "number", description: "Prompt tokens evaluated" },
  { key: "totalDuration", type: "number", description: "Whole call in nanoseconds" },
  { key: "loadDuration", type: "number", description: "Loading the model, in nanoseconds" },
  { key: "promptEvalDuration", type: "number", description: "Evaluating the prompt, in nanoseconds" },
  { key: "evalDuration", type: "number", description: "Generating the reply, in nanoseconds" },
  { key: "model", description: "The model that answered" },
  { key: "raw", description: "The whole response as the server returned it" }
];
function timings(body) {
  return {
    doneReason: body.done_reason ?? null,
    evalCount: body.eval_count ?? 0,
    promptEvalCount: body.prompt_eval_count ?? 0,
    totalDuration: body.total_duration ?? 0,
    loadDuration: body.load_duration ?? 0,
    promptEvalDuration: body.prompt_eval_duration ?? 0,
    evalDuration: body.eval_duration ?? 0,
    model: body.model ?? null,
    raw: body
  };
}
function createOllamaConnector(options = {}) {
  const env = options.env ?? process.env;
  function clientFor(config, fetchImpl) {
    return createOllamaClient({
      baseUrl: normalizeBaseUrl(config.baseUrl),
      ...text2(env.OLLAMA_API_KEY) && { apiKey: text2(env.OLLAMA_API_KEY) },
      fetchImpl: options.fetchImpl ?? fetchImpl,
      ...options.sleep && { sleep: options.sleep }
    });
  }
  function requiredArg(args, key) {
    const value = text2(args[key]);
    if (value === void 0) throw new Error(`${key} is required`);
    return value;
  }
  async function fetchModels(context) {
    const body = await clientFor(context.config, context.fetch).get("tags");
    return (Array.isArray(body?.models) ? body.models : []).filter((model) => text2(model?.name ?? model?.model) !== void 0).sort((left, right) => String(left.modified_at ?? "").localeCompare(String(right.modified_at ?? ""))).map(modelToItem);
  }
  async function fetchRunningModels(context) {
    const body = await clientFor(context.config, context.fetch).get("ps");
    return (Array.isArray(body?.models) ? body.models : []).filter((model) => text2(model?.name ?? model?.model) !== void 0).sort((left, right) => String(left.expires_at ?? "").localeCompare(String(right.expires_at ?? ""))).map(runningToItem);
  }
  return defineConnector({
    id: "ollama",
    name: "Ollama",
    version: options.version ?? package_default.version,
    description: "Trigger workflows when a local Ollama model is added, updated or loaded into memory, and chat, generate, embed, and list, show, pull, copy or delete models from a step.",
    // The llama's face as the spec draws it: a rounded head, two tall ears, and the eyes and muzzle
    // punched through by reversed winding, since the icon carries path data only and no fill-rule.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        [
          "M9 8H15A5 5 0 0 1 20 13V17A5 5 0 0 1 15 22H9A5 5 0 0 1 4 17V13A5 5 0 0 1 9 8Z",
          "M6 3.5A1.5 1.5 0 0 1 7.5 2A1.5 1.5 0 0 1 9 3.5V10H6Z",
          "M15 3.5A1.5 1.5 0 0 1 16.5 2A1.5 1.5 0 0 1 18 3.5V10H15Z",
          "M8.3 14A1.2 1.2 0 0 0 10.7 14A1.2 1.2 0 0 0 8.3 14Z",
          "M13.3 14A1.2 1.2 0 0 0 15.7 14A1.2 1.2 0 0 0 13.3 14Z",
          "M11.25 17.5A1.25 1.25 0 0 0 10 18.75A1.25 1.25 0 0 0 11.25 20H12.75A1.25 1.25 0 0 0 14 18.75A1.25 1.25 0 0 0 12.75 17.5Z"
        ].join("")
      ]
    },
    auth: { rung: "none" },
    config: [
      {
        key: "baseUrl",
        env: "OLLAMA_HOST",
        label: "Server URL",
        default: DEFAULT_BASE_URL,
        description: `The server origin, ${DEFAULT_BASE_URL} by default. A trailing / or /api is stripped and a bare host:port gets http://.`,
        builderHint: "The same variable the ollama CLI reads. A hosted or proxied server that wants a key takes it from OLLAMA_API_KEY in the environment, sent as Authorization: Bearer; the SDK refuses a secret field on a connector that needs no sign-in, so there is no config field for it."
      }
    ],
    async preflight() {
      const client = clientFor({ baseUrl: env.OLLAMA_HOST });
      try {
        const body = await client.get("version");
        return { ok: true, message: `Ollama ${body?.version ?? "unknown version"} answered at ${client.baseUrl}` };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    },
    triggers: [
      {
        type: "modelChanged",
        label: "A model was added or updated",
        description: "Fires once per model build from GET /api/tags: a new name, or a pull that changed a digest. The first poll delivers every model present.",
        defaultWorkflow: { name: "Ollama: added or updated models", defaultCronFromMinutes: 15 },
        dedupe: "timestamp",
        sample: [modelToItem(SAMPLE_MODEL)],
        fetch: fetchModels
      },
      {
        type: "modelLoaded",
        label: "A model was loaded into memory",
        description: "Fires when a model appears in GET /api/ps with an expiry not yet seen. Every request extends the expiry, so a busy model fires again on each poll; poll slowly.",
        defaultWorkflow: { name: "Ollama: loaded models", defaultCronFromMinutes: 5 },
        dedupe: "timestamp",
        sample: [runningToItem(SAMPLE_RUNNING_MODEL)],
        fetch: fetchRunningModels
      }
    ],
    actions: [
      {
        type: "chat",
        label: "Chat",
        description: "Generate the next assistant message of a conversation with POST /api/chat. Every call runs a generation.",
        idempotent: false,
        inputs: [
          MODEL_INPUT,
          {
            key: "messages",
            label: "Messages",
            required: true,
            description: 'A single user text, or a JSON array of { "role", "content" } with role system, user, assistant or tool.',
            builderHint: 'Text becomes [{ role: "user", content: text }]; a value starting with [ is parsed as the array and passed through, so images and tool_calls on a turn survive.'
          },
          SYSTEM_INPUT,
          FORMAT_INPUT,
          OPTIONS_INPUT,
          KEEP_ALIVE_INPUT
        ],
        outputs: [
          { key: "content", description: "The assistant message text" },
          { key: "thinking", description: "The thinking text when the model produced one, else null" },
          { key: "toolCalls", description: "The tool_calls array when the model made any, else null" },
          { key: "doneReason", description: "stop, length or load" },
          ...TIMING_OUTPUTS
        ],
        async run(args, context) {
          const system = text2(args.system);
          const format = formatArg(args.format);
          const modelOptions = jsonObject(args.options, "options");
          const keepAlive = keepAliveArg(args.keepAlive);
          const body = await clientFor(context.config, context.fetch).post(
            "chat",
            {
              model: requiredArg(args, "model"),
              messages: messagesArg(args.messages, system),
              ...format !== void 0 && { format },
              ...modelOptions && { options: modelOptions },
              ...keepAlive !== void 0 && { keep_alive: keepAlive },
              stream: false
            },
            LONG_TIMEOUT_MS
          );
          const reply = body ?? {};
          return {
            content: reply.message?.content ?? "",
            thinking: reply.message?.thinking ?? null,
            toolCalls: reply.message?.tool_calls ?? null,
            ...timings(reply)
          };
        }
      },
      {
        type: "generate",
        label: "Generate a completion",
        description: "Generate a response for a prompt with POST /api/generate. Every call runs a generation.",
        idempotent: false,
        inputs: [
          MODEL_INPUT,
          {
            key: "prompt",
            label: "Prompt",
            required: true,
            description: "Text for the model to generate a response from.",
            builderHint: "Sent as prompt. Use chat for a conversation with roles; this is the raw completion endpoint."
          },
          SYSTEM_INPUT,
          FORMAT_INPUT,
          OPTIONS_INPUT,
          KEEP_ALIVE_INPUT
        ],
        outputs: [
          { key: "response", description: "The generated text" },
          { key: "thinking", description: "The thinking text when the model produced one, else null" },
          { key: "doneReason", description: "stop, length or load" },
          ...TIMING_OUTPUTS
        ],
        async run(args, context) {
          const system = text2(args.system);
          const format = formatArg(args.format);
          const modelOptions = jsonObject(args.options, "options");
          const keepAlive = keepAliveArg(args.keepAlive);
          const body = await clientFor(context.config, context.fetch).post(
            "generate",
            {
              model: requiredArg(args, "model"),
              prompt: requiredArg(args, "prompt"),
              ...system && { system },
              ...format !== void 0 && { format },
              ...modelOptions && { options: modelOptions },
              ...keepAlive !== void 0 && { keep_alive: keepAlive },
              stream: false
            },
            LONG_TIMEOUT_MS
          );
          const reply = body ?? {};
          return { response: reply.response ?? "", thinking: reply.thinking ?? null, ...timings(reply) };
        }
      },
      {
        type: "embed",
        label: "Generate embeddings",
        description: "Turn text into embedding vectors with POST /api/embed. The same input and model give the same vectors.",
        idempotent: true,
        sample: { model: SAMPLE_MODEL_NAME, input: "hello" },
        inputs: [
          {
            ...MODEL_INPUT,
            builderHint: `${MODEL_INPUT.builderHint} A runner that does not serve embeddings answers 501; showModel lists embedding under capabilities when it does.`
          },
          {
            key: "input",
            label: "Input",
            required: true,
            description: "Text, or a JSON array of texts, to embed in one call.",
            builderHint: "A value starting with [ is parsed as the array; one vector comes back per entry, in order."
          },
          {
            key: "truncate",
            label: "Truncate",
            type: "boolean",
            description: "Truncate an input that exceeds the context window instead of failing. The server default is true.",
            builderHint: "Sent as truncate only when set; false makes an oversized input an error."
          }
        ],
        outputs: [
          { key: "embeddings", description: "One number array per input, in input order" },
          { key: "count", type: "number", description: "How many vectors" },
          { key: "model", description: "The model used" },
          { key: "promptEvalCount", type: "number", description: "Input tokens processed" },
          { key: "totalDuration", type: "number", description: "Whole call in nanoseconds" },
          { key: "loadDuration", type: "number", description: "Loading the model, in nanoseconds" },
          { key: "raw", description: "The whole response as the server returned it" }
        ],
        async run(args, context) {
          const truncate = text2(args.truncate);
          const body = await clientFor(context.config, context.fetch).post("embed", {
            model: requiredArg(args, "model"),
            input: textOrJsonArray(args.input),
            ...truncate !== void 0 && { truncate: flag(truncate) }
          });
          const embeddings = Array.isArray(body?.embeddings) ? body.embeddings : [];
          return {
            embeddings,
            count: embeddings.length,
            model: body?.model ?? null,
            promptEvalCount: body?.prompt_eval_count ?? 0,
            totalDuration: body?.total_duration ?? 0,
            loadDuration: body?.load_duration ?? 0,
            raw: body ?? {}
          };
        }
      },
      {
        type: "listModels",
        label: "List models",
        description: "List the models on the server with GET /api/tags.",
        idempotent: true,
        sample: {},
        outputs: [
          { key: "models", description: "Array of { name, model, modified_at, size, digest, details }" },
          { key: "count", type: "number", description: "How many models" },
          { key: "raw", description: "The whole response as the server returned it" }
        ],
        async run(_args, context) {
          const body = await clientFor(context.config, context.fetch).get("tags");
          const models = Array.isArray(body?.models) ? body.models : [];
          return { models, count: models.length, raw: body ?? {} };
        }
      },
      {
        type: "showModel",
        label: "Show a model",
        description: "Read a model\u2019s details, capabilities, parameters, template and license with POST /api/show.",
        idempotent: true,
        sample: { model: SAMPLE_MODEL_NAME },
        inputs: [
          MODEL_INPUT,
          {
            key: "verbose",
            label: "Verbose",
            type: "boolean",
            description: "Include the large fields, such as the full tokenizer, in modelInfo.",
            builderHint: "Sent as verbose only when true; the reply can run to megabytes."
          }
        ],
        outputs: [
          { key: "model", description: "The model name asked for; the reply carries none" },
          { key: "details", description: "{ parent_model, format, family, families, parameter_size, quantization_level }" },
          { key: "capabilities", description: "Array such as completion, tools, vision, embedding" },
          { key: "modifiedAt", description: "When the model was last modified, ISO 8601" },
          { key: "parameters", description: "Model parameter settings as text" },
          { key: "template", description: "The prompt template" },
          { key: "license", description: "The license text" },
          { key: "modelInfo", description: "Additional model metadata" },
          { key: "raw", description: "The whole response as the server returned it" }
        ],
        async run(args, context) {
          const model = requiredArg(args, "model");
          const body = await clientFor(context.config, context.fetch).post("show", {
            model,
            ...flag(args.verbose) && { verbose: true }
          });
          return {
            model,
            details: body?.details ?? {},
            capabilities: Array.isArray(body?.capabilities) ? body.capabilities : [],
            modifiedAt: body?.modified_at ?? null,
            parameters: body?.parameters ?? "",
            template: body?.template ?? "",
            license: body?.license ?? "",
            modelInfo: body?.model_info ?? {},
            raw: body ?? {}
          };
        }
      },
      {
        type: "listRunningModels",
        label: "List running models",
        description: "List the models loaded into memory with GET /api/ps.",
        idempotent: true,
        sample: {},
        outputs: [
          { key: "models", description: "Array of { name, model, size, digest, details, expires_at, size_vram, context_length }" },
          { key: "count", type: "number", description: "How many models are loaded" },
          { key: "raw", description: "The whole response as the server returned it" }
        ],
        async run(_args, context) {
          const body = await clientFor(context.config, context.fetch).get("ps");
          const models = Array.isArray(body?.models) ? body.models : [];
          return { models, count: models.length, raw: body ?? {} };
        }
      },
      {
        type: "version",
        label: "Get the server version",
        description: "Read the server version with GET /api/version. The live check probes this.",
        idempotent: true,
        sample: {},
        outputs: [{ key: "version", description: "The server version, such as 0.12.6" }],
        async run(_args, context) {
          const body = await clientFor(context.config, context.fetch).get("version");
          return { version: body?.version ?? null };
        }
      },
      {
        type: "pullModel",
        label: "Pull a model",
        description: "Download a model from the library with POST /api/pull. Downloads, so it is slow and not repeatable in a live check.",
        idempotent: false,
        inputs: [
          { ...MODEL_INPUT, builderHint: "A library name such as gemma3, or user/model for a shared one. A cancelled pull resumes where it left off." },
          {
            key: "insecure",
            label: "Insecure",
            type: "boolean",
            description: "Allow downloading over an insecure connection.",
            builderHint: "Sent as insecure only when true; only for a library you run yourself during development."
          }
        ],
        outputs: [
          { key: "status", description: "The final status, success when the model is present" },
          { key: "raw", description: "The whole response as the server returned it" }
        ],
        async run(args, context) {
          const body = await clientFor(context.config, context.fetch).post(
            "pull",
            { model: requiredArg(args, "model"), ...flag(args.insecure) && { insecure: true }, stream: false },
            LONG_TIMEOUT_MS
          );
          return { status: body?.status ?? null, raw: body ?? {} };
        }
      },
      {
        type: "deleteModel",
        label: "Delete a model",
        description: "Delete a model and its data with DELETE /api/delete. A second call answers 404.",
        idempotent: false,
        inputs: [{ ...MODEL_INPUT, builderHint: "Deleting a tag another name was copied from leaves the copy in place; layers are shared." }],
        outputs: [
          { key: "deleted", type: "boolean", description: "True once the server answered 200" },
          { key: "model", description: "The model that was deleted" }
        ],
        async run(args, context) {
          const model = requiredArg(args, "model");
          await clientFor(context.config, context.fetch).request("DELETE", "delete", { body: { model } });
          return { deleted: true, model };
        }
      },
      {
        type: "copyModel",
        label: "Copy a model",
        description: "Create a new name for an existing model with POST /api/copy. Creates a tag, so it is not repeatable.",
        idempotent: false,
        inputs: [
          {
            key: "source",
            label: "Source",
            required: true,
            description: "Existing model name to copy from.",
            builderHint: "A missing source answers 404 and is reported as not present."
          },
          {
            key: "destination",
            label: "Destination",
            required: true,
            description: "New model name to create.",
            builderHint: "model:tag form; an existing name is overwritten."
          }
        ],
        outputs: [
          { key: "copied", type: "boolean", description: "True once the server answered 200" },
          { key: "source", description: "The name copied from" },
          { key: "destination", description: "The name created" }
        ],
        async run(args, context) {
          const source = requiredArg(args, "source");
          const destination = requiredArg(args, "destination");
          await clientFor(context.config, context.fetch).post("copy", { source, destination });
          return { copied: true, source, destination };
        }
      }
    ]
  });
}
var connector = createOllamaConnector();
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

// ollama/vorn-connector-pack.js
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
