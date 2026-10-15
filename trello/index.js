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
  const base2 = policy.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const max = policy.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  return Math.min(max, base2 * 2 ** attempt);
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
  const base2 = isRecord(value2) ? value2 : {};
  return {
    ...base2,
    [head]: rest.length === 0 ? next : withValueAt(base2[head], rest.join("."), next)
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

// trello/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  API_ROOT: () => API_ROOT,
  CARD_FIELDS: () => CARD_FIELDS,
  DEFAULT_WITHIN_HOURS: () => DEFAULT_WITHIN_HOURS,
  FIRST_POLL_LOOKBACK_MS: () => FIRST_POLL_LOOKBACK_MS,
  MAX_ACTION_LIMIT: () => MAX_ACTION_LIMIT,
  MAX_ACTION_PAGES: () => MAX_ACTION_PAGES,
  RATE_LIMIT_WINDOW_MS: () => RATE_LIMIT_WINDOW_MS,
  SAMPLE_COMMENT_ACTION: () => SAMPLE_COMMENT_ACTION,
  SAMPLE_CREATE_ACTION: () => SAMPLE_CREATE_ACTION,
  SAMPLE_DUE_CARD: () => SAMPLE_DUE_CARD,
  SAMPLE_ID: () => SAMPLE_ID,
  SAMPLE_MOVE_ACTION: () => SAMPLE_MOVE_ACTION,
  TrelloApiError: () => TrelloApiError,
  actionParts: () => actionParts,
  alreadyLabelled: () => alreadyLabelled,
  cardOutput: () => cardOutput,
  cardUrl: () => cardUrl,
  commentItem: () => commentItem,
  connector: () => connector,
  count: () => count,
  createTrelloClient: () => createTrelloClient,
  createTrelloConnector: () => createTrelloConnector,
  createdItem: () => createdItem,
  default: () => index_default,
  dueSoonItem: () => dueSoonItem,
  dueWithin: () => dueWithin,
  listArg: () => listArg,
  movedItem: () => movedItem,
  movedLists: () => movedLists,
  rateLimitWaitMs: () => rateLimitWaitMs,
  retryAfterMs: () => retryAfterMs2,
  searchCards: () => searchCards,
  text: () => text2,
  trelloPreflight: () => trelloPreflight
});
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var API_ROOT = "https://api.trello.com/1";
var MAX_ACTION_LIMIT = 1e3;
var MAX_ACTION_PAGES = 5;
var RATE_LIMIT_WINDOW_MS = 1e4;
var MAX_ERROR_BODY2 = 300;
var TrelloApiError = class extends Error {
  status;
  body;
  constructor(status, body) {
    super(body ? `${status}: ${body}` : String(status));
    this.name = "TrelloApiError";
    this.status = status;
    this.body = body;
  }
};
var wait2 = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
function retryAfterMs2(header, now) {
  const trimmed = (header ?? "").trim();
  if (trimmed === "") return void 0;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - now);
}
function exhaustedWindowMs(headers) {
  let longest;
  for (const scope of ["api-key", "api-token"]) {
    const remaining = Number(headers.get(`x-rate-limit-${scope}-remaining`));
    const interval = Number(headers.get(`x-rate-limit-${scope}-interval-ms`));
    if (headers.get(`x-rate-limit-${scope}-remaining`) === null || remaining > 0) continue;
    if (!Number.isFinite(interval) || interval <= 0) continue;
    if (longest === void 0 || interval > longest) longest = interval;
  }
  return longest;
}
function rateLimitWaitMs(headers, now) {
  return retryAfterMs2(headers.get("retry-after"), now) ?? exhaustedWindowMs(headers) ?? RATE_LIMIT_WINDOW_MS;
}
async function describeFailure2(response) {
  const text22 = (await response.text().catch(() => "")).trim();
  const quoted = text22.length > MAX_ERROR_BODY2 ? `${text22.slice(0, MAX_ERROR_BODY2)}\u2026` : text22;
  return new TrelloApiError(response.status, quoted);
}
function compact(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== null && value !== "") out[key] = value;
  }
  return out;
}
function createTrelloClient(options) {
  const apiKey = options.apiKey.trim();
  const token = options.token.trim();
  if (!apiKey) throw new Error("TRELLO_API_KEY is required");
  if (!token) throw new Error("TRELLO_TOKEN is required");
  const sleep = options.sleep ?? wait2;
  const now = options.now ?? Date.now;
  async function call(path, callOptions = {}) {
    const url = new URL(`${API_ROOT}/${path}`);
    for (const [key, value] of Object.entries(compact(callOptions.query ?? {}))) {
      url.searchParams.set(key, String(value));
    }
    url.searchParams.set("key", apiKey);
    url.searchParams.set("token", token);
    const init = { method: callOptions.method ?? "GET" };
    for (let attempt = 0; ; attempt++) {
      const response = await options.fetch(url.toString(), init);
      if (attempt === 0 && response.status === 429) {
        await sleep(rateLimitWaitMs(response.headers, now()));
        continue;
      }
      if (!response.ok) throw await describeFailure2(response);
      const text22 = await response.text();
      return text22 === "" ? {} : JSON.parse(text22);
    }
  }
  const segment = (id) => encodeURIComponent(id);
  function boardActions(boardId, params) {
    return call(`boards/${segment(boardId)}/actions`, {
      query: {
        ...params,
        memberCreator: "true",
        member: "false",
        fields: "id,type,date,data",
        memberCreator_fields: "fullName,username"
      }
    }).then((body) => Array.isArray(body) ? body : []);
  }
  function boardCards(boardId, fields) {
    return call(`boards/${segment(boardId)}/cards`, { query: { fields } }).then(
      (body) => Array.isArray(body) ? body : []
    );
  }
  function createCard(query) {
    return call("cards", { method: "POST", query });
  }
  function addComment(cardId, text22) {
    return call(`cards/${segment(cardId)}/actions/comments`, { method: "POST", query: { text: text22 } });
  }
  function addLabel(cardId, labelId) {
    return call(`cards/${segment(cardId)}/idLabels`, { method: "POST", query: { value: labelId } });
  }
  function search(query) {
    return call("search", { query });
  }
  function me() {
    return call("members/me", { query: { fields: "id,username,fullName" } });
  }
  return { call, boardActions, boardCards, createCard, addComment, addLabel, search, me };
}
var SAMPLE_ID = "5abbe4b7ddc1b351ef961414";
var CARD_URL = "https://trello.com/c/";
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function ref(value) {
  return isRecord2(value) ? value : void 0;
}
function textOf(value) {
  return typeof value === "string" && value !== "" ? value : void 0;
}
function cardUrl(card) {
  if (card === void 0) return void 0;
  return card.shortUrl ?? (card.shortLink ? `${CARD_URL}${card.shortLink}` : void 0);
}
function actionParts(action) {
  const data = isRecord2(action.data) ? action.data : {};
  const member = isRecord2(action.memberCreator) ? action.memberCreator : {};
  return {
    data,
    card: ref(data.card),
    board: ref(data.board),
    list: ref(data.list),
    text: textOf(data.text),
    memberName: textOf(member.fullName) ?? textOf(member.username)
  };
}
function base(action, title, card) {
  const url = cardUrl(card);
  return {
    externalId: action.id,
    title,
    ...url && { url },
    ...action.date && { updatedAt: action.date }
  };
}
function createdItem(action) {
  const { card } = actionParts(action);
  return {
    ...base(action, `Card created: ${card?.name ?? card?.id ?? action.id}`, card),
    data: { ...action }
  };
}
function movedLists(action) {
  const { data, list } = actionParts(action);
  const old = isRecord2(data.old) ? data.old : {};
  const before = ref(data.listBefore) ?? (typeof old.idList === "string" ? { id: old.idList } : void 0);
  const after = ref(data.listAfter) ?? list;
  return { before, after };
}
function movedItem(action) {
  const { card, board } = actionParts(action);
  const { before, after } = movedLists(action);
  const from = before?.name ?? before?.id ?? "?";
  const to = after?.name ?? after?.id ?? "?";
  return {
    ...base(action, `Card moved: ${card?.name ?? card?.id ?? action.id} (${from} \u2192 ${to})`, card),
    data: {
      id: action.id,
      type: action.type,
      date: action.date,
      card,
      listBefore: before,
      listAfter: after,
      board,
      memberCreator: action.memberCreator
    }
  };
}
function commentItem(action) {
  const { card, text: text22, memberName } = actionParts(action);
  const who = memberName ?? "Someone";
  const on = card?.name ?? card?.id ?? "a card";
  return {
    ...base(action, text22 ? `${who} commented on ${on}: ${text22}` : `${who} commented on ${on}`, card),
    ...text22 && { description: text22 },
    data: { ...action }
  };
}
function dueSoonItem(card) {
  const due = String(card.due);
  const url = cardUrl(card);
  return {
    externalId: `${card.id}:${due}`,
    title: `Due ${due}: ${card.name ?? card.id}`,
    ...url && { url },
    data: { ...card }
  };
}
function dueWithin(cards, now, withinHours) {
  const start = Date.parse(now);
  const end = start + withinHours * 36e5;
  return cards.filter((card) => {
    if (typeof card.due !== "string" || card.dueComplete === true) return false;
    const at = Date.parse(card.due);
    return !Number.isNaN(at) && at >= start && at <= end;
  });
}
var SAMPLE_CREATE_ACTION = {
  id: SAMPLE_ID,
  idMemberCreator: SAMPLE_ID,
  type: "createCard",
  date: "2020-03-09T19:41:51.396Z",
  data: {
    card: { id: SAMPLE_ID, name: "Bowie", idShort: 7, shortLink: "3CsPkqOF" },
    list: { id: SAMPLE_ID, name: "Amazing" },
    board: { id: SAMPLE_ID, name: "Mullets", shortLink: "3CsPkqOF" }
  },
  memberCreator: { id: SAMPLE_ID, fullName: "Bob Loblaw", username: "bobloblaw" }
};
var SAMPLE_MOVE_ACTION = {
  id: "5abbe4b7ddc1b351ef961415",
  idMemberCreator: SAMPLE_ID,
  type: "updateCard",
  date: "2020-03-09T19:45:00.000Z",
  data: {
    card: { id: SAMPLE_ID, name: "Bowie", idShort: 7, shortLink: "3CsPkqOF" },
    listBefore: { id: SAMPLE_ID, name: "Amazing" },
    listAfter: { id: "5abbe4b7ddc1b351ef961416", name: "Done" },
    old: { idList: SAMPLE_ID },
    board: { id: SAMPLE_ID, name: "Mullets", shortLink: "3CsPkqOF" }
  },
  memberCreator: { id: SAMPLE_ID, fullName: "Bob Loblaw", username: "bobloblaw" }
};
var SAMPLE_COMMENT_ACTION = {
  id: SAMPLE_ID,
  idMemberCreator: SAMPLE_ID,
  type: "commentCard",
  date: "2020-03-09T19:41:51.396Z",
  data: {
    text: "Can never go wrong with bowie",
    card: { id: SAMPLE_ID, name: "Bowie", idShort: 7, shortLink: "3CsPkqOF" },
    board: { id: SAMPLE_ID, name: "Mullets", shortLink: "3CsPkqOF" },
    list: { id: SAMPLE_ID, name: "Amazing" }
  },
  memberCreator: { id: SAMPLE_ID, fullName: "Bob Loblaw (Trello)", username: "bobloblaw" }
};
var SAMPLE_DUE_CARD = {
  id: SAMPLE_ID,
  name: "\u{1F44B} What? Why? How?",
  due: "2019-09-18T12:00:00.000Z",
  dueComplete: false,
  closed: false,
  idBoard: SAMPLE_ID,
  idList: SAMPLE_ID,
  idMembers: [SAMPLE_ID],
  labels: [{ id: SAMPLE_ID, idBoard: SAMPLE_ID, name: "Overdue", color: "yellow" }],
  dateLastActivity: "2019-09-16T16:19:17.156Z",
  shortUrl: "https://trello.com/c/H0TZyzbK",
  url: "https://trello.com/c/H0TZyzbK/4-%F0%9F%91%8B-what-why-how"
};
var package_default = {
  name: "@vornrun/connector-trello",
  version: "0.1.1",
  description: "Trigger workflows from cards created, moved, commented on or due soon on a Trello board, and create, update, move, comment on, label, archive, read and search cards from a step.",
  type: "module",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "trello"
  },
  keywords: [
    "vorn",
    "connector",
    "trello"
  ],
  bin: {
    "vorn-connector-trello": "dist/index.js"
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
      "trello",
      "cards",
      "boards",
      "lists",
      "kanban",
      "tasks"
    ],
    auth: "Paste a Power-Up API key from trello.com/power-ups/admin and the member token its authorization page grants for read and write. There is no Trello CLI to sign in with.",
    hosts: [
      "api.trello.com"
    ]
  }
};
var FIRST_POLL_LOOKBACK_MS = 24 * 36e5;
var DEFAULT_WITHIN_HOURS = 24;
var CARD_FIELDS = "id,name,desc,closed,due,start,dueComplete,dateLastActivity,idBoard,idList,idLabels,idMembers,idShort,labels,pos,shortLink,shortUrl,url,badges,cover";
var DUE_CARD_FIELDS = "id,name,due,dueComplete,closed,idList,idBoard,shortUrl,url,dateLastActivity,idMembers,labels";
var SEARCH_CARD_FIELDS = "id,name,desc,closed,due,dueComplete,idBoard,idList,labels,shortUrl,url,dateLastActivity";
var CARD_KEYS = CARD_FIELDS.split(",");
var ACTION_KEYS = ["id", "idMemberCreator", "type", "date", "data", "memberCreator"];
var AUTH_QUERY = { key: "{{config.apiKey}}", token: "{{config.token}}" };
var ADMIN_URL = "https://trello.com/power-ups/admin";
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || void 0;
}
function required(config, key, env) {
  const value = text2(config[key]);
  if (value === void 0) throw new Error(`${env} is required`);
  return value;
}
function isRecord22(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function listArg(value) {
  const raw = text2(value);
  if (raw === void 0) return void 0;
  const entries = raw.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
  return entries.length > 0 ? entries.join(",") : void 0;
}
function count(value, key, max) {
  if (value === void 0 || value === "") return void 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || max !== void 0 && number > max) {
    const bound = max === void 0 ? "above 0" : `from 1 to ${max}`;
    throw new Error(`${key} must be a number ${bound}, got "${String(value)}"`);
  }
  return number;
}
function flag(value) {
  if (value === true || value === "true") return "true";
  if (value === false || value === "false") return "false";
  return void 0;
}
function pickKeys(value, keys) {
  const out = {};
  if (!isRecord22(value)) return out;
  for (const key of keys) if (key in value) out[key] = value[key];
  return out;
}
function cardOutput(value) {
  return pickKeys(value, CARD_KEYS);
}
function searchCards(value) {
  if (Array.isArray(value)) return value.filter((entry) => isRecord22(entry) && "idList" in entry);
  if (isRecord22(value) && Array.isArray(value.cards)) return value.cards.filter(isRecord22);
  return [];
}
function alreadyLabelled(error) {
  return error instanceof TrelloApiError && error.status === 400 && /already/i.test(error.body);
}
async function trelloPreflight(options) {
  const apiKey = text2(options.apiKey);
  const token = text2(options.token);
  if (apiKey === void 0 || token === void 0) {
    return {
      ok: false,
      message: `Set TRELLO_API_KEY and TRELLO_TOKEN: generate an API key at ${ADMIN_URL}, then open its Token link to grant a read and write token.`
    };
  }
  try {
    const me = await createTrelloClient({ apiKey, token, fetch: options.fetch ?? fetch }).me();
    return { ok: true, message: `Signed in as ${me.fullName ?? me.username ?? me.id ?? "a Trello member"}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `Trello refused the key and token (${reason}); grant a new token from the API key's Token link at ${ADMIN_URL}.`
    };
  }
}
var CARD_ID_INPUT = {
  key: "cardId",
  label: "Card",
  required: true,
  description: "The card id (24 hex characters) or the short link from its URL, trello.com/c/<shortLink>.",
  builderHint: 'Sent URL-encoded as the path segment of /cards/{id}; an unknown id answers 400 with a plain-text body such as "invalid id", or 404.'
};
var POSITION_INPUT = {
  key: "position",
  label: "Position",
  description: "top, bottom, or a positive number for the card\u2019s place in the list.",
  builderHint: 'Sent as pos; the reference allows "top, bottom, or a positive float".'
};
var BOARD_ID_INPUT = {
  key: "boardId",
  label: "Board",
  required: true,
  description: "The board id or the short link from its URL, trello.com/b/<shortLink>/\u2026.",
  builderHint: "Sent URL-encoded as the path segment of /boards/{id}; the API accepts the short link in place of the id."
};
var CARD_OUTPUTS = [
  { key: "id", description: "Card id" },
  { key: "name", description: "Card name" },
  { key: "desc", description: "Card description, Markdown" },
  { key: "closed", type: "boolean", description: "True when the card is archived" },
  { key: "due", description: "Due date, ISO 8601, or null" },
  { key: "dueComplete", type: "boolean", description: "Whether the due date is marked complete" },
  { key: "idBoard", description: "The board the card is on" },
  { key: "idList", description: "The list the card is in" },
  { key: "idLabels", description: "Label ids on the card" },
  { key: "idMembers", description: "Member ids on the card" },
  { key: "labels", description: "Labels on the card: id, name, color" },
  { key: "pos", type: "number", description: "Position within the list" },
  { key: "shortLink", description: "The short link in the card URL" },
  { key: "shortUrl", description: "https://trello.com/c/<shortLink>" },
  { key: "url", description: "The full card URL" },
  { key: "dateLastActivity", description: "When the card last changed, ISO 8601" }
];
function createTrelloConnector(options = {}) {
  const env = options.env ?? process.env;
  function client(context) {
    return createTrelloClient({
      apiKey: required(context.config, "apiKey", "TRELLO_API_KEY"),
      token: required(context.config, "token", "TRELLO_TOKEN"),
      fetch: context.fetch,
      ...options.sleep && { sleep: options.sleep }
    });
  }
  function watermarkOf(context) {
    return context.since ?? new Date(Date.parse(context.now()) - FIRST_POLL_LOOKBACK_MS).toISOString();
  }
  async function fetchActions(context, filter) {
    const boardId = required(context.config, "boardId", "TRELLO_BOARD_ID");
    const since = watermarkOf(context);
    const api = client(context);
    const collected = [];
    let before;
    for (let page2 = 0; page2 < MAX_ACTION_PAGES; page2++) {
      const batch = await api.boardActions(boardId, { filter, since, before, limit: MAX_ACTION_LIMIT });
      collected.push(...batch);
      const oldest = batch[batch.length - 1]?.date;
      if (batch.length < MAX_ACTION_LIMIT || oldest === void 0) break;
      before = oldest;
    }
    return collected.reverse();
  }
  async function fetchCreated(context) {
    return (await fetchActions(context, "createCard")).map(createdItem);
  }
  async function fetchMoved(context) {
    const toListId = text2(context.config.toListId);
    const actions = await fetchActions(context, "updateCard:idList");
    return actions.filter((action) => toListId === void 0 || movedLists(action).after?.id === toListId).map(movedItem);
  }
  async function fetchComments(context) {
    return (await fetchActions(context, "commentCard")).map(commentItem);
  }
  async function fetchDueSoon(context) {
    const boardId = required(context.config, "boardId", "TRELLO_BOARD_ID");
    const withinHours = count(context.config.withinHours, "TRELLO_WITHIN_HOURS") ?? DEFAULT_WITHIN_HOURS;
    const cards = await client(context).boardCards(boardId, DUE_CARD_FIELDS);
    return dueWithin(cards, context.now(), withinHours).sort((left, right) => String(left.due).localeCompare(String(right.due))).map(dueSoonItem);
  }
  async function createCard(args, context) {
    const card = await client(context).createCard({
      idList: String(args.listId),
      name: String(args.name),
      desc: text2(args.description),
      due: text2(args.due),
      idLabels: listArg(args.labelIds),
      idMembers: listArg(args.memberIds),
      pos: text2(args.position)
    });
    return cardOutput(card);
  }
  async function addComment(args, context) {
    const action = await client(context).addComment(String(args.cardId), String(args.text));
    return pickKeys(action, ACTION_KEYS);
  }
  async function addLabel(args, context) {
    const labelId = String(args.labelId);
    try {
      const result = await client(context).addLabel(String(args.cardId), labelId);
      return { labelIds: Array.isArray(result) ? result : [], alreadyPresent: false };
    } catch (error) {
      if (!alreadyLabelled(error)) throw error;
      return { labelIds: [labelId], alreadyPresent: true };
    }
  }
  async function search(args, context) {
    const result = await client(context).search({
      query: String(args.query),
      idBoards: listArg(args.boardIds),
      cards_limit: count(args.limit, "limit", 1e3),
      partial: flag(args.partial),
      modelTypes: "cards",
      card_list: "true",
      card_board: "true",
      card_fields: SEARCH_CARD_FIELDS
    });
    const cards = searchCards(result);
    return { cards, count: cards.length };
  }
  const sampleBoard = text2(env.TRELLO_BOARD_ID) ?? SAMPLE_ID;
  const sampleList = text2(env.TRELLO_LIST_ID) ?? SAMPLE_ID;
  const sampleCard = text2(env.TRELLO_CARD_ID) ?? SAMPLE_ID;
  const throwawayCard = text2(env.TRELLO_ARCHIVE_CARD_ID);
  return defineConnector({
    id: "trello",
    name: "Trello",
    version: options.version ?? package_default.version,
    description: "Trigger workflows from cards created, moved, commented on or due soon on a Trello board, and create, update, move, comment on, label, archive, read and search cards from a step.",
    // Trello's tile: a rounded square with two list columns cut out, the left one reaching lower than the right.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm1.5 3.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1h-3zm8 0a1 1 0 0 0-1 1V12a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-3z"
      ]
    },
    auth: { rung: "key", keys: ["apiKey", "token"] },
    config: [
      {
        key: "apiKey",
        env: "TRELLO_API_KEY",
        label: "API key",
        secret: true,
        required: true,
        description: `The Power-Up API key: create a Power-Up at ${ADMIN_URL}, open its API Key tab and generate a key.`,
        builderHint: "Sent as the key query parameter on every call, never as a header. The guide calls keys public, but one is only useful with the token it authorized, so it is kept secret too. There is no Trello CLI to borrow a login from."
      },
      {
        key: "token",
        env: "TRELLO_TOKEN",
        label: "Token",
        secret: true,
        required: true,
        description: "The member token the API key\u2019s Token link grants: approve read and write access with expiration never, then copy the token shown.",
        builderHint: 'Sent as the token query parameter on every call. The link is /1/authorize?expiration=never&scope=read,write&response_type=token&key=<apiKey>. A revoked or wrong token answers 401 with the text "invalid token".'
      },
      {
        key: "boardId",
        env: "TRELLO_BOARD_ID",
        label: "Board",
        required: true,
        description: "The board the triggers watch, by id or by the short link from its URL (trello.com/b/<shortLink>/\u2026).",
        builderHint: "Only the triggers read it; every action takes its own ids. listBoards returns the ids of every board the token can see."
      },
      {
        key: "toListId",
        env: "TRELLO_TO_LIST_ID",
        label: "Destination list",
        description: "For the card-moved trigger: only fire when a card lands in this list. Blank fires on every move.",
        builderHint: "Compared with data.listAfter.id of each updateCard:idList action; listLists returns the ids of a board\u2019s lists."
      },
      {
        key: "withinHours",
        env: "TRELLO_WITHIN_HOURS",
        label: "Due within hours",
        default: String(DEFAULT_WITHIN_HOURS),
        description: "For the card-due-soon trigger: how many hours ahead a due date must fall to fire.",
        builderHint: "Applied here, not by the API: the board\u2019s open cards are read and kept when due is between now and now plus this many hours and dueComplete is false."
      }
    ],
    preflight: () => trelloPreflight({
      apiKey: env.TRELLO_API_KEY,
      token: env.TRELLO_TOKEN,
      ...options.fetch && { fetch: options.fetch }
    }),
    triggers: [
      {
        type: "cardCreated",
        label: "A card is created",
        description: "Fires once for each card created on the board since the last poll, oldest first.",
        dedupe: "timestamp",
        fetch: fetchCreated,
        defaultWorkflow: { name: "Trello: new cards", defaultCronFromMinutes: 5 },
        sample: [createdItem(SAMPLE_CREATE_ACTION)]
      },
      {
        type: "cardMoved",
        label: "A card moves to another list",
        description: "Fires once for each card moved between lists on the board, with the list before and after. Set a destination list to fire only on arrivals there.",
        dedupe: "timestamp",
        fetch: fetchMoved,
        defaultWorkflow: { name: "Trello: moved cards", defaultCronFromMinutes: 5 },
        sample: [movedItem(SAMPLE_MOVE_ACTION)]
      },
      {
        type: "commentAdded",
        label: "A comment is added",
        description: "Fires once for each comment added to a card on the board since the last poll.",
        dedupe: "timestamp",
        fetch: fetchComments,
        defaultWorkflow: { name: "Trello: new comments", defaultCronFromMinutes: 5 },
        sample: [commentItem(SAMPLE_COMMENT_ACTION)]
      },
      {
        type: "cardDueSoon",
        label: "A card is due soon",
        description: "Fires once per due date for each open card on the board whose due date falls within the configured hours and is not marked complete. A changed due date fires again.",
        dedupe: "timestamp",
        fetch: fetchDueSoon,
        defaultWorkflow: { name: "Trello: cards due soon", defaultCronFromMinutes: 30 },
        sample: [dueSoonItem(SAMPLE_DUE_CARD)]
      }
    ],
    actions: [
      {
        type: "createCard",
        label: "Create a card",
        description: "Add a card to a list.",
        // Two calls make two cards; Trello offers no idempotency key.
        idempotent: false,
        inputs: [
          {
            key: "listId",
            label: "List",
            required: true,
            description: "The id of the list the card should be created in.",
            builderHint: "Sent as idList on POST /cards; listLists returns the ids of a board\u2019s lists."
          },
          {
            key: "name",
            label: "Name",
            required: true,
            description: "The name for the card.",
            builderHint: "Sent as name; the API allows it empty, the connector does not."
          },
          {
            key: "description",
            label: "Description",
            description: "The description for the card, Markdown.",
            builderHint: "Sent as desc, only when given."
          },
          {
            key: "due",
            label: "Due date",
            description: "A due date for the card, ISO 8601 such as 2026-09-18T12:00:00.000Z.",
            builderHint: 'Sent as due; "The API expects a ISO 8601 date format".'
          },
          {
            key: "labelIds",
            label: "Label ids",
            description: "Comma-separated ids of labels to add to the card.",
            builderHint: "Sent as idLabels, comma-separated as the reference wants; whitespace around commas is removed."
          },
          {
            key: "memberIds",
            label: "Member ids",
            description: "Comma-separated ids of members to add to the card.",
            builderHint: "Sent as idMembers, comma-separated; whitespace around commas is removed."
          },
          POSITION_INPUT
        ],
        outputs: CARD_OUTPUTS,
        run: createCard
      },
      {
        type: "updateCard",
        label: "Update a card",
        description: "Change the name, description, due date, due-complete flag or archived state of a card; only the inputs given are sent.",
        // A repeat sets the same values, so a retry lands the same card.
        idempotent: true,
        inputs: [
          CARD_ID_INPUT,
          {
            key: "name",
            label: "Name",
            description: "The new name for the card.",
            builderHint: "Sent as name on PUT /cards/{id}, only when given."
          },
          {
            key: "description",
            label: "Description",
            description: "The new description for the card.",
            builderHint: "Sent as desc, only when given."
          },
          {
            key: "due",
            label: "Due date",
            description: "When the card is due, ISO 8601, or the word null to clear it.",
            builderHint: 'Sent as due; the reference documents "null" as the value that clears the date.'
          },
          {
            key: "dueComplete",
            label: "Due complete",
            type: "boolean",
            description: "Whether the due date is marked complete.",
            builderHint: "Sent as dueComplete=true or false, only when given."
          },
          {
            key: "closed",
            label: "Archived",
            type: "boolean",
            description: "True archives the card, false restores it.",
            builderHint: "Sent as closed=true or false, only when given."
          }
        ],
        outputs: CARD_OUTPUTS,
        request: {
          method: "PUT",
          url: `${API_ROOT}/cards/{{args.cardId}}`,
          query: {
            ...AUTH_QUERY,
            name: "{{args.name}}",
            desc: "{{args.description}}",
            due: "{{args.due}}",
            dueComplete: "{{args.dueComplete}}",
            closed: "{{args.closed}}"
          }
        },
        postReceive: [{ op: "pick", keys: CARD_KEYS }]
      },
      {
        type: "moveCard",
        label: "Move a card",
        description: "Move a card to a list, optionally at a position or onto another board.",
        idempotent: true,
        inputs: [
          CARD_ID_INPUT,
          {
            key: "listId",
            label: "List",
            required: true,
            description: "The id of the list the card should be in.",
            builderHint: "Sent as idList on PUT /cards/{id}."
          },
          POSITION_INPUT,
          {
            key: "boardId",
            label: "Board",
            description: "The id of the board the card should be on, for a move across boards.",
            builderHint: "Sent as idBoard, only when given; the list must belong to that board."
          }
        ],
        outputs: CARD_OUTPUTS,
        request: {
          method: "PUT",
          url: `${API_ROOT}/cards/{{args.cardId}}`,
          query: { ...AUTH_QUERY, idList: "{{args.listId}}", pos: "{{args.position}}", idBoard: "{{args.boardId}}" }
        },
        postReceive: [{ op: "pick", keys: CARD_KEYS }]
      },
      {
        type: "addComment",
        label: "Add a comment",
        description: "Comment on a card.",
        // Two calls make two comments.
        idempotent: false,
        inputs: [
          CARD_ID_INPUT,
          {
            key: "text",
            label: "Text",
            required: true,
            description: "The comment, Markdown.",
            builderHint: "Sent as text on POST /cards/{id}/actions/comments."
          }
        ],
        outputs: [
          { key: "id", description: "The comment action id" },
          { key: "type", description: "commentCard" },
          { key: "date", description: "When the comment was posted, ISO 8601" },
          { key: "data", description: "text, card { id, name, shortLink }, board and list" },
          { key: "memberCreator", description: "Who commented: id, fullName, username" }
        ],
        run: addComment
      },
      {
        type: "addLabel",
        label: "Add a label to a card",
        description: "Put a label on a card. A label already on the card is reported as present rather than as a failure.",
        idempotent: true,
        inputs: [
          CARD_ID_INPUT,
          {
            key: "labelId",
            label: "Label",
            required: true,
            description: "The id of the label to add.",
            builderHint: "Sent as value on POST /cards/{id}/idLabels; a repeat answers 400 saying the label is already on the card, which the action treats as success."
          }
        ],
        outputs: [
          { key: "labelIds", description: "The card\u2019s label ids as the API returned them" },
          { key: "alreadyPresent", type: "boolean", description: "True when the label was on the card before the call" }
        ],
        run: addLabel
      },
      {
        type: "archiveCard",
        label: "Archive a card",
        description: "Archive a card. A second call leaves it archived.",
        idempotent: true,
        inputs: [CARD_ID_INPUT],
        outputs: CARD_OUTPUTS,
        ...throwawayCard && { sample: { cardId: throwawayCard } },
        request: {
          method: "PUT",
          url: `${API_ROOT}/cards/{{args.cardId}}`,
          query: { ...AUTH_QUERY, closed: "true" }
        },
        postReceive: [{ op: "pick", keys: CARD_KEYS }]
      },
      {
        type: "getCard",
        label: "Get a card",
        description: "Read one card with its list and board.",
        idempotent: true,
        inputs: [CARD_ID_INPUT],
        outputs: [
          ...CARD_OUTPUTS,
          { key: "list", description: "The list the card is in: id, name" },
          { key: "board", description: "The board the card is on: id, name, shortUrl" }
        ],
        sample: { cardId: sampleCard },
        request: {
          url: `${API_ROOT}/cards/{{args.cardId}}`,
          query: { ...AUTH_QUERY, fields: "all", list: "true", board: "true", board_fields: "name,shortUrl" }
        },
        postReceive: [{ op: "pick", keys: [...CARD_KEYS, "list", "board"] }]
      },
      {
        type: "listBoards",
        label: "List boards",
        description: "The boards the token\u2019s member belongs to, open ones by default.",
        idempotent: true,
        inputs: [
          {
            key: "filter",
            label: "Filter",
            description: "all, or a comma-separated list of closed, members, open, organization, public, starred. Defaults to open.",
            builderHint: "Sent as filter on GET /members/me/boards; this route is under /members/, whose budget is 100 requests per 900 seconds."
          }
        ],
        outputs: [{ key: "items", description: "One entry per board: id, name, desc, closed, idOrganization, url, shortUrl, dateLastActivity" }],
        sample: {},
        request: {
          url: `${API_ROOT}/members/me/boards`,
          query: {
            ...AUTH_QUERY,
            filter: "{{args.filter}}",
            fields: "id,name,desc,closed,idOrganization,url,shortUrl,dateLastActivity"
          }
        }
      },
      {
        type: "listLists",
        label: "List lists on a board",
        description: "The lists of a board, open ones by default.",
        idempotent: true,
        inputs: [
          BOARD_ID_INPUT,
          {
            key: "filter",
            label: "Filter",
            description: "all, closed, none or open. Defaults to open.",
            builderHint: "Sent as filter on GET /boards/{id}/lists."
          }
        ],
        outputs: [{ key: "items", description: "One entry per list: id, name, closed, idBoard, pos" }],
        sample: { boardId: sampleBoard },
        request: {
          url: `${API_ROOT}/boards/{{args.boardId}}/lists`,
          query: { ...AUTH_QUERY, filter: "{{args.filter}}", fields: "id,name,closed,idBoard,pos" }
        }
      },
      {
        type: "listCards",
        label: "List cards in a list",
        description: "The open cards of a list.",
        idempotent: true,
        inputs: [
          {
            key: "listId",
            label: "List",
            required: true,
            description: "The id of the list.",
            builderHint: "Sent URL-encoded as the path segment of GET /lists/{id}/cards; the answer is one unpaged array."
          }
        ],
        outputs: [{ key: "items", description: "One entry per card, in the card shape getCard returns" }],
        sample: { listId: sampleList },
        request: {
          url: `${API_ROOT}/lists/{{args.listId}}/cards`,
          query: { ...AUTH_QUERY, fields: CARD_FIELDS }
        }
      },
      {
        type: "searchCards",
        label: "Search cards",
        description: "Find cards matching a query across the member\u2019s boards or the given ones.",
        idempotent: true,
        inputs: [
          {
            key: "query",
            label: "Query",
            required: true,
            description: "The search query, 1 to 16384 characters; Trello\u2019s search operators such as due:week and label:red work here.",
            builderHint: "Sent as query on GET /search with modelTypes=cards."
          },
          {
            key: "boardIds",
            label: "Board ids",
            description: "mine, or a comma-separated list of board ids to search in. Blank searches every board the member can see.",
            builderHint: "Sent as idBoards, comma-separated; whitespace around commas is removed."
          },
          {
            key: "limit",
            label: "Limit",
            type: "number",
            description: "The maximum number of cards to return, 1 to 1000. Defaults to 10.",
            builderHint: "Sent as cards_limit; cards_page is not exposed, so one call reads one page."
          },
          {
            key: "partial",
            label: "Partial",
            type: "boolean",
            description: "Match content that starts with any of the words in the query.",
            builderHint: "Sent as partial=true only when set."
          }
        ],
        outputs: [
          { key: "cards", description: "The matching cards with their list and board" },
          { key: "count", type: "number", description: "How many cards came back" }
        ],
        sample: { query: "test" },
        run: search
      }
    ]
  });
}
var connector = createTrelloConnector();
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

// trello/vorn-connector-pack.js
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
