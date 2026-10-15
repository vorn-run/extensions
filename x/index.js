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

// x/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  connector: () => connector,
  default: () => index_default
});
import { createHmac, randomBytes } from "crypto";
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
function percentEncode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
function oauthParams(credentials, nonce, timestamp) {
  return {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(timestamp),
    oauth_token: credentials.token,
    oauth_version: "1.0"
  };
}
function makeNonce(random = randomBytes) {
  return random(32).toString("base64").replace(/\W/g, "");
}
function byteOrder(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
function parameterString(params) {
  return params.map(([key, value]) => [percentEncode(key), percentEncode(value)]).sort(([a], [b]) => byteOrder(a, b)).map(([key, value]) => `${key}=${value}`).join("&");
}
function signatureBaseString(method, url, params) {
  const baseUrl = `${url.origin}${url.pathname}`;
  return `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(parameterString(params))}`;
}
function sign(credentials, input) {
  const url = new URL(input.url);
  const nonce = input.nonce ?? makeNonce();
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1e3);
  const oauth = oauthParams(credentials, nonce, timestamp);
  const params = [
    ...Array.from(url.searchParams.entries()),
    ...Object.entries(input.bodyParams ?? {}),
    ...Object.entries(oauth)
  ];
  const baseString = signatureBaseString(input.method, url, params);
  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");
  const header = "OAuth " + Object.entries({ ...oauth, oauth_signature: signature }).sort(([a], [b]) => byteOrder(a, b)).map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`).join(", ");
  return { header, baseString, signature };
}
var API_ROOT = "https://api.x.com/2";
var MAX_RATE_LIMIT_WAIT_MS = 6e4;
var SERVER_ERROR_RETRY_MS = 1e3;
var RETRYABLE_SERVER_STATUSES = /* @__PURE__ */ new Set([500, 502, 503, 504]);
var MAX_ERROR_BODY2 = 300;
var ACCESS_PROBLEMS = /* @__PURE__ */ new Set(["client-forbidden", "usage-capped"]);
var XApiError = class extends Error {
  status;
  title;
  detail;
  /** The last path segment of the problem `type`, such as `client-forbidden`. */
  problem;
  reason;
  constructor(status, message, body = {}) {
    super(message);
    this.name = "XApiError";
    this.status = status;
    this.title = body.title;
    this.detail = body.detail;
    this.problem = problemName(body.type);
    this.reason = body.reason;
  }
  /** Whether the plan or the credit balance, not a window, is what refused the call. */
  get accessDenied() {
    return this.status === 402 || this.problem !== void 0 && ACCESS_PROBLEMS.has(this.problem);
  }
};
function problemName(type) {
  if (!type || type === "about:blank") return void 0;
  const segment = type.split("/").filter(Boolean).pop();
  return segment || void 0;
}
async function readBody2(response) {
  const text22 = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text22);
    if (typeof parsed === "object" && parsed !== null) return { parsed, text: text22 };
  } catch {
  }
  return { parsed: {}, text: text22 };
}
function describeFailure2(status, parsed, text22) {
  const legacy = parsed.errors?.find((entry) => typeof entry?.message === "string");
  let message;
  if (parsed.title || parsed.detail) {
    message = `${status} ${parsed.title ?? "Error"}${parsed.detail ? `: ${parsed.detail}` : ""}`;
  } else if (legacy) {
    message = `${status}: ${legacy.message}${legacy.code !== void 0 ? ` (code ${legacy.code})` : ""}`;
  } else {
    const quoted = text22.length > MAX_ERROR_BODY2 ? `${text22.slice(0, MAX_ERROR_BODY2)}\u2026` : text22;
    message = `X API ${status}${quoted ? `: ${quoted}` : ""}`;
  }
  const problem = problemName(parsed.type);
  if (problem) message += ` [${problem}]`;
  if (status === 403 && parsed.reason) message += ` reason: ${parsed.reason}`;
  if (status === 401) {
    message += ". The four credentials or the signature are wrong: check the Keys and tokens tab of the app and regenerate the access token after setting Read and Write.";
  }
  if (status === 402 || problem && ACCESS_PROBLEMS.has(problem)) {
    message += ". The app's plan or credits do not cover this endpoint.";
  }
  return new XApiError(status, message, parsed);
}
var wait2 = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
function compact(params) {
  const out = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== "") out.push([key, String(value)]);
  }
  return out;
}
var POST_FIELDS = {
  "tweet.fields": "created_at,author_id,conversation_id,in_reply_to_user_id",
  expansions: "author_id",
  "user.fields": "username,name"
};
var USER_FIELDS = "id,username,name";
function createXClient(options) {
  const sleep = options.sleep ?? wait2;
  const now = options.now ?? Date.now;
  let fetchImpl = options.fetch;
  async function call(path, callOptions = {}) {
    const method = callOptions.method ?? "GET";
    const url = new URL(`${API_ROOT}${path}`);
    for (const [key, value] of compact(callOptions.query ?? {})) url.searchParams.set(key, value);
    const hasBody = callOptions.body !== void 0;
    for (let attempt = 0; ; attempt++) {
      const { header } = sign(options.credentials, {
        method,
        url: url.toString(),
        timestamp: Math.floor(now() / 1e3)
      });
      const response = await fetchImpl(url.toString(), {
        method,
        headers: { Authorization: header, ...hasBody && { "Content-Type": "application/json" } },
        ...hasBody && { body: JSON.stringify(callOptions.body) }
      });
      if (response.ok) {
        const text3 = await response.text();
        return text3 === "" ? {} : JSON.parse(text3);
      }
      const { parsed, text: text22 } = await readBody2(response);
      const failure2 = describeFailure2(response.status, parsed, text22);
      if (attempt === 0 && response.status === 429 && !failure2.accessDenied) {
        const resetAt = Number(response.headers.get("x-rate-limit-reset")) * 1e3;
        const pending = Number.isFinite(resetAt) && resetAt > 0 ? resetAt - now() : SERVER_ERROR_RETRY_MS;
        if (pending > MAX_RATE_LIMIT_WAIT_MS) {
          throw new XApiError(
            429,
            `${failure2.message}. The rate limit resets at ${new Date(resetAt).toISOString()}.`,
            parsed
          );
        }
        await sleep(Math.max(0, pending));
        continue;
      }
      if (attempt === 0 && RETRYABLE_SERVER_STATUSES.has(response.status)) {
        await sleep(SERVER_ERROR_RETRY_MS);
        continue;
      }
      throw failure2;
    }
  }
  let me;
  return {
    call,
    /** The host hands a fresh resilient fetch to every call; a memoised client takes the latest. */
    setFetch(next) {
      fetchImpl = next;
    },
    getMe: () => call("/users/me", { query: { "user.fields": USER_FIELDS } }),
    // Fetched once per process: the SDK keeps no store beyond the cursor, so a memo is the nearest thing to per connection.
    myId() {
      me ??= this.getMe().then((envelope) => envelope.data ?? {}).catch((error) => {
        me = void 0;
        throw error;
      });
      return me;
    },
    getPost: (id, query = POST_FIELDS) => call(`/tweets/${encodeURIComponent(id)}`, { query }),
    getUserByUsername: (username, query) => call(`/users/by/username/${encodeURIComponent(username)}`, { query }),
    mentions: (userId, query) => call(`/users/${encodeURIComponent(userId)}/mentions`, { query: { ...POST_FIELDS, ...query } }),
    searchRecent: (query) => call("/tweets/search/recent", { query: { ...POST_FIELDS, sort_order: "recency", ...query } }),
    createPost: (body) => call("/tweets", { method: "POST", body }),
    deletePost: (id) => call(`/tweets/${encodeURIComponent(id)}`, { method: "DELETE" })
  };
}
var TITLE_LIMIT = 80;
function postUrl(id, username) {
  return username ? `https://x.com/${username}/status/${id}` : `https://x.com/i/status/${id}`;
}
function joinAuthor(post, users) {
  const id = post.id ?? "";
  const author = users?.find((user) => user.id !== void 0 && user.id === post.author_id);
  const username = author?.username ?? "";
  return {
    id,
    text: post.text ?? "",
    createdAt: post.created_at ?? "",
    conversationId: post.conversation_id ?? "",
    inReplyToUserId: post.in_reply_to_user_id ?? null,
    author: { id: post.author_id ?? "", username, name: author?.name ?? "" },
    url: postUrl(id, username)
  };
}
function postToItem(record) {
  const firstLine = record.text.replace(/\s+/g, " ").trim();
  const excerpt = Array.from(firstLine).slice(0, TITLE_LIMIT).join("");
  return {
    externalId: record.id,
    title: `@${record.author.username}: ${excerpt}`,
    ...record.createdAt && { updatedAt: record.createdAt },
    url: record.url,
    data: record
  };
}
var SAMPLE_ITEM = {
  externalId: "1346889436626259968",
  title: "@xdevelopers: Hello world!",
  updatedAt: "2024-01-15T12:00:00.000Z",
  url: "https://x.com/xdevelopers/status/1346889436626259968",
  data: {
    id: "1346889436626259968",
    text: "Hello world!",
    createdAt: "2024-01-15T12:00:00.000Z",
    conversationId: "1346889436626259968",
    inReplyToUserId: null,
    author: { id: "2244994945", username: "xdevelopers", name: "X Developers" },
    url: "https://x.com/xdevelopers/status/1346889436626259968"
  }
};
var package_default = {
  name: "@vornrun/connector-x",
  version: "0.1.1",
  description: "Trigger workflows from new mentions or posts matching a search on X, and create, reply to, delete, read and search posts from a step.",
  type: "module",
  license: "MIT",
  author: "Javier Canizalez <javier-canizalez@outlook.com>",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "x"
  },
  keywords: [
    "vorn",
    "connector",
    "x",
    "twitter"
  ],
  bin: {
    "vorn-connector-x": "dist/index.js"
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
    category: "Social",
    keywords: [
      "x",
      "twitter",
      "posts",
      "tweets",
      "mentions",
      "social"
    ],
    auth: "Paste the four OAuth 1.0a credentials of an X developer app with Read and Write permission; there is no X CLI to borrow a login from.",
    hosts: [
      "api.x.com",
      "api.twitter.com",
      "upload.twitter.com"
    ]
  }
};
var MAX_POST_LENGTH = 280;
var MENTIONS_MIN_RESULTS = 5;
var SEARCH_MIN_RESULTS = 10;
var MAX_RESULTS = 100;
var DEFAULT_SEARCH_RESULTS = 10;
var MAX_QUERY_LENGTH = 512;
var USERNAME = /^[A-Za-z0-9_]{1,15}$/;
var CONSOLE_URL = "https://developer.x.com/en/portal/dashboard";
var ACCESS_NOTE = "Metered per request and per post read; see the README for the price and the rate limit of each call.";
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || void 0;
}
function required(config, key, env) {
  const value = text2(config[key]);
  if (value === void 0) throw new Error(`${env} is required`);
  return value;
}
function postText(value) {
  const body = String(value ?? "");
  const length = Array.from(body).length;
  if (body.trim() === "") throw new Error("Post text is required");
  if (length > MAX_POST_LENGTH) {
    throw new Error(`Post text is ${length} characters; the limit is ${MAX_POST_LENGTH} for non-Premium accounts`);
  }
  return body;
}
function pageSize(value, floor, fallback) {
  const raw = text2(value);
  if (raw === void 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) throw new Error(`maxResults must be a whole number between ${floor} and ${MAX_RESULTS}`);
  if (parsed > MAX_RESULTS) throw new Error(`maxResults must be at most ${MAX_RESULTS}`);
  return Math.max(floor, parsed);
}
function searchQuery(value) {
  const query = text2(value);
  if (query === void 0) throw new Error("query is required");
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`query is ${query.length} characters; recent search accepts at most ${MAX_QUERY_LENGTH}`);
  }
  return query;
}
function handle(value) {
  const username = text2(value)?.replace(/^@/, "");
  if (username === void 0 || !USERNAME.test(username)) {
    throw new Error("username must be 1 to 15 letters, digits or underscores, without the @");
  }
  return username;
}
function postId(value, key) {
  const id = text2(value);
  if (id === void 0) throw new Error(`${key} is required`);
  return id;
}
function postsOf(envelope) {
  const posts = Array.isArray(envelope.data) ? envelope.data : [];
  return posts.map((post) => joinAuthor(post, envelope.includes?.users));
}
function createdOutput(envelope) {
  const id = envelope.data?.id ?? "";
  return { id, url: id ? postUrl(id) : "", text: envelope.data?.text ?? "" };
}
function createXConnector(options = {}) {
  const clock = options.now ?? Date.now;
  const clients = /* @__PURE__ */ new Map();
  function client(context) {
    const credentials = {
      consumerKey: required(context.config, "apiKey", "X_API_KEY"),
      consumerSecret: required(context.config, "apiSecret", "X_API_SECRET"),
      token: required(context.config, "accessToken", "X_ACCESS_TOKEN"),
      tokenSecret: required(context.config, "accessTokenSecret", "X_ACCESS_TOKEN_SECRET")
    };
    const key = Object.values(credentials).join("\n");
    const cached = clients.get(key);
    if (cached) {
      cached.setFetch(context.fetch);
      return cached;
    }
    const created = createXClient({
      credentials,
      fetch: context.fetch,
      now: clock,
      ...options.sleep && { sleep: options.sleep }
    });
    clients.set(key, created);
    return created;
  }
  function pageQuery(context, floor) {
    return {
      since_id: context.lastItemId,
      max_results: Math.min(MAX_RESULTS, Math.max(floor, context.limit ?? MAX_RESULTS))
    };
  }
  async function fetchMentions(context) {
    const api = client(context);
    const me = await api.myId();
    if (!me.id) throw new Error("GET /2/users/me returned no id for the connected account");
    const page2 = await api.mentions(me.id, pageQuery(context, MENTIONS_MIN_RESULTS));
    return postsOf(page2).map(postToItem);
  }
  async function fetchSearch(context) {
    const query = searchQuery(context.config.query);
    const page2 = await client(context).searchRecent({ query, ...pageQuery(context, SEARCH_MIN_RESULTS) });
    return postsOf(page2).map(postToItem);
  }
  return defineConnector({
    id: "x",
    name: "X",
    version: options.version ?? package_default.version,
    description: "Trigger workflows from new mentions or posts matching a search on X, and create, reply to, delete, read and search posts from a step.",
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M0 1.2H7.6L24 22.8H16.6Z M4.3 3.4H6.6L19.7 20.6H17.4Z M18.9 1.2H22.7L14.72 10.57L12.93 8.22Z M10.77 15.21L8.97 12.87L0.5 22.8H4.3Z"
      ]
    },
    auth: { rung: "key", keys: ["apiKey", "apiSecret", "accessToken", "accessTokenSecret"] },
    config: [
      {
        key: "apiKey",
        label: "API key",
        env: "X_API_KEY",
        required: true,
        secret: true,
        description: "The app's API Key (OAuth 1.0a consumer key).",
        builderHint: `${CONSOLE_URL}: Projects & Apps, the app, Keys and tokens. Shown once at creation; regenerate from the same tab.`
      },
      {
        key: "apiSecret",
        label: "API key secret",
        env: "X_API_SECRET",
        required: true,
        secret: true,
        description: "The app's API Key Secret (consumer secret).",
        builderHint: "Same tab as the API key; half of the HMAC-SHA1 signing key."
      },
      {
        key: "accessToken",
        label: "Access token",
        env: "X_ACCESS_TOKEN",
        required: true,
        secret: true,
        description: "The Access Token generated for your own account under Keys and tokens.",
        builderHint: "Set the app permission to Read and Write before generating it: a token made earlier stays read-only."
      },
      {
        key: "accessTokenSecret",
        label: "Access token secret",
        env: "X_ACCESS_TOKEN_SECRET",
        required: true,
        secret: true,
        description: "The Access Token Secret shown with the access token.",
        builderHint: "Regenerated together with the access token; the other half of the signing key."
      },
      {
        key: "query",
        label: "Search query",
        env: "X_SEARCH_QUERY",
        description: 'Recent-search query the "new search result" trigger polls, such as `from:xdevelopers -is:retweet`.',
        builderHint: "Only needed by newSearchResult; 1 to 512 characters of recent-search syntax, last 7 days only."
      }
    ],
    triggers: [
      {
        type: "newMention",
        label: "New mention",
        description: `A post mentions the connected account. Polls the mentions timeline with since_id; a burst above ${MAX_RESULTS} mentions between polls loses the oldest. Access: 300 requests per 15 minutes per user, billed per post read (an Owned Read when the account owns the app). ${ACCESS_NOTE}`,
        dedupe: "lastItem",
        fetch: fetchMentions,
        sample: [SAMPLE_ITEM],
        defaultWorkflow: { name: "X: new mentions", defaultCronFromMinutes: 5 }
      },
      {
        type: "newSearchResult",
        label: "New search result",
        description: `A post from the last 7 days matches the search query with since_id; a burst above ${MAX_RESULTS} matches between polls loses the oldest. Access: 300 requests per 15 minutes per user, billed per post returned; recent search is the read that used to need a paid tier. ${ACCESS_NOTE}`,
        dedupe: "lastItem",
        fetch: fetchSearch,
        sample: [SAMPLE_ITEM],
        defaultWorkflow: { name: "X: search results", defaultCronFromMinutes: 5 }
      }
    ],
    actions: [
      {
        type: "createPost",
        label: "Create post",
        description: `Publish a post of up to ${MAX_POST_LENGTH} characters, optionally as a reply or a quote. Needs Read and Write permission.`,
        idempotent: false,
        inputs: [
          {
            key: "text",
            label: "Text",
            required: true,
            description: `The post, up to ${MAX_POST_LENGTH} characters for non-Premium accounts.`,
            builderHint: "Counted in code points before sending; the API may still weigh a text longer and answer 403."
          },
          {
            key: "inReplyToPostId",
            label: "In reply to post id",
            description: "Id of the post to reply to, sent as reply.in_reply_to_tweet_id."
          },
          {
            key: "quotePostId",
            label: "Quote post id",
            description: "Id of the post to quote, sent as quote_tweet_id; the docs say quoting needs an Enterprise plan."
          }
        ],
        outputs: [
          { key: "id", type: "string", description: "The new post id" },
          { key: "url", type: "string", description: "https://x.com/i/status/{id}" },
          { key: "text", type: "string", description: "The text as X stored it" }
        ],
        async run(args, context) {
          const body = { text: postText(args.text) };
          const replyTo = text2(args.inReplyToPostId);
          const quote2 = text2(args.quotePostId);
          if (replyTo) body.reply = { in_reply_to_tweet_id: replyTo };
          if (quote2) body.quote_tweet_id = quote2;
          return createdOutput(await client(context).createPost(body));
        }
      },
      {
        type: "replyToPost",
        label: "Reply to post",
        description: `Reply to a post with up to ${MAX_POST_LENGTH} characters. Needs Read and Write permission.`,
        idempotent: false,
        inputs: [
          { key: "postId", label: "Post id", required: true, description: "The post being replied to." },
          {
            key: "text",
            label: "Text",
            required: true,
            description: `The reply, up to ${MAX_POST_LENGTH} characters for non-Premium accounts.`
          }
        ],
        outputs: [
          { key: "id", type: "string", description: "The new post id" },
          { key: "url", type: "string", description: "https://x.com/i/status/{id}" },
          { key: "text", type: "string", description: "The text as X stored it" }
        ],
        async run(args, context) {
          const body = { text: postText(args.text), reply: { in_reply_to_tweet_id: postId(args.postId, "postId") } };
          return createdOutput(await client(context).createPost(body));
        }
      },
      {
        type: "deletePost",
        label: "Delete post",
        description: "Delete one of the connected account's own posts. Needs Read and Write permission.",
        idempotent: false,
        inputs: [{ key: "postId", label: "Post id", required: true, description: "The post to delete." }],
        outputs: [{ key: "deleted", type: "boolean", description: "Whether X reports the post deleted" }],
        async run(args, context) {
          const answer = await client(context).deletePost(postId(args.postId, "postId"));
          return { deleted: answer.data?.deleted === true };
        }
      },
      {
        type: "getMe",
        label: "Get me",
        description: `The connected account. Access: 75 requests per 15 minutes per user, one user read. ${ACCESS_NOTE}`,
        idempotent: true,
        inputs: [],
        outputs: [
          { key: "id", type: "string", description: "The account id" },
          { key: "username", type: "string", description: "The handle without @" },
          { key: "name", type: "string", description: "The display name" },
          { key: "url", type: "string", description: "https://x.com/{username}" }
        ],
        sample: {},
        async run(_args, context) {
          const user = (await client(context).getMe()).data ?? {};
          const username = user.username ?? "";
          return { id: user.id ?? "", username, name: user.name ?? "", url: username ? `https://x.com/${username}` : "" };
        }
      },
      {
        type: "getPost",
        label: "Get post",
        description: `A post by id with its author and public metrics. Access: 900 requests per 15 minutes per user, one post read plus one user read. ${ACCESS_NOTE}`,
        idempotent: true,
        inputs: [{ key: "postId", label: "Post id", required: true, description: "The post to read." }],
        outputs: [
          { key: "id", type: "string", description: "The post id" },
          { key: "text", type: "string", description: "The post text" },
          { key: "createdAt", type: "string", description: "ISO 8601 creation instant" },
          { key: "authorId", type: "string", description: "The author id" },
          { key: "authorUsername", type: "string", description: "The author handle, when included" },
          { key: "conversationId", type: "string", description: "The conversation (thread root) id" },
          { key: "url", type: "string", description: "The post page" },
          { key: "metrics", description: "public_metrics as JSON: like, reply, repost, quote, bookmark and impression counts" },
          { key: "raw", description: "The full answer as JSON" }
        ],
        sample: { postId: "20" },
        async run(args, context) {
          const answer = await client(context).getPost(postId(args.postId, "postId"), {
            "tweet.fields": "created_at,author_id,conversation_id,public_metrics",
            expansions: "author_id",
            "user.fields": "username,name"
          });
          const post = answer.data ?? {};
          const record = joinAuthor(post, answer.includes?.users);
          return {
            id: record.id,
            text: record.text,
            createdAt: record.createdAt,
            authorId: record.author.id,
            authorUsername: record.author.username,
            conversationId: record.conversationId,
            url: record.url,
            metrics: post.public_metrics ?? {},
            raw: answer
          };
        }
      },
      {
        type: "getUserByUsername",
        label: "Get user by username",
        description: `A user by handle. Access: 900 requests per 15 minutes per user, one user read. ${ACCESS_NOTE}`,
        idempotent: true,
        inputs: [
          {
            key: "username",
            label: "Username",
            required: true,
            description: "The handle without @ (1 to 15 letters, digits or underscores); a leading @ is stripped."
          }
        ],
        outputs: [
          { key: "id", type: "string", description: "The user id" },
          { key: "username", type: "string", description: "The handle" },
          { key: "name", type: "string", description: "The display name" },
          { key: "description", type: "string", description: "The profile bio" },
          { key: "createdAt", type: "string", description: "ISO 8601 account creation instant" },
          { key: "followers", type: "number", description: "public_metrics.followers_count" },
          { key: "following", type: "number", description: "public_metrics.following_count" },
          { key: "posts", type: "number", description: "public_metrics.tweet_count" },
          { key: "url", type: "string", description: "https://x.com/{username}" },
          { key: "raw", description: "The full answer as JSON" }
        ],
        sample: { username: "x" },
        async run(args, context) {
          const answer = await client(context).getUserByUsername(handle(args.username), {
            "user.fields": `${USER_FIELDS},description,public_metrics,created_at`
          });
          const user = answer.data ?? {};
          const metrics = user.public_metrics ?? {};
          const username = user.username ?? "";
          return {
            id: user.id ?? "",
            username,
            name: user.name ?? "",
            description: user.description ?? "",
            createdAt: user.created_at ?? "",
            followers: metrics.followers_count ?? 0,
            following: metrics.following_count ?? 0,
            posts: metrics.tweet_count ?? 0,
            url: username ? `https://x.com/${username}` : "",
            raw: answer
          };
        }
      },
      {
        type: "searchRecentPosts",
        label: "Search recent posts",
        description: `Posts from the last 7 days matching a query, newest first. Access: 300 requests per 15 minutes per user, billed per post returned; this is the read that used to need a paid tier. ${ACCESS_NOTE}`,
        idempotent: true,
        inputs: [
          {
            key: "query",
            label: "Query",
            required: true,
            description: `Recent-search query, 1 to ${MAX_QUERY_LENGTH} characters, such as from:xdevelopers -is:retweet.`
          },
          {
            key: "maxResults",
            label: "Max results",
            type: "number",
            description: `${SEARCH_MIN_RESULTS} to ${MAX_RESULTS}, default ${DEFAULT_SEARCH_RESULTS}; a smaller value is raised to ${SEARCH_MIN_RESULTS}.`
          },
          { key: "sinceId", label: "Since id", description: "Only posts with an id greater than this one." }
        ],
        outputs: [
          { key: "posts", description: "JSON array of posts: id, text, createdAt, conversationId, inReplyToUserId, author, url" },
          { key: "count", type: "number", description: "meta.result_count" },
          { key: "newestId", type: "string", description: "meta.newest_id" },
          { key: "nextToken", type: "string", description: "meta.next_token, for the page after this one" }
        ],
        sample: { query: "from:xdevelopers -is:retweet", maxResults: "10" },
        async run(args, context) {
          const answer = await client(context).searchRecent({
            query: searchQuery(args.query),
            max_results: pageSize(args.maxResults, SEARCH_MIN_RESULTS, DEFAULT_SEARCH_RESULTS),
            since_id: text2(args.sinceId)
          });
          return {
            posts: postsOf(answer),
            count: answer.meta?.result_count ?? 0,
            newestId: answer.meta?.newest_id ?? "",
            nextToken: answer.meta?.next_token ?? ""
          };
        }
      }
    ]
  });
}
var connector = createXConnector();
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

// x/vorn-connector-pack.js
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
