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

// discord/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  API_ROOT: () => API_ROOT,
  DiscordApiError: () => DiscordApiError,
  compareSnowflakes: () => compareSnowflakes,
  connector: () => discordConnector,
  createDiscordClient: () => createDiscordClient,
  createDiscordConnector: () => createDiscordConnector,
  default: () => index_default,
  discordConnector: () => discordConnector,
  normalizeToken: () => normalizeToken,
  snowflakeFrom: () => snowflakeFrom,
  snowflakeTime: () => snowflakeTime
});
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var API_ROOT = "https://discord.com/api/v10";
var USER_AGENT_URL = "https://github.com/vorn-run/extensions";
var DISCORD_EPOCH = 1420070400000n;
var RATE_LIMIT_RETRIES = 2;
var MIN_RATE_LIMIT_WAIT_MS = 1e3;
var MAX_WAIT_MS = 6e4;
var SERVER_ERROR_WAIT_MS = 1e3;
var MAX_ERROR_BODY2 = 300;
function normalizeToken(raw) {
  const token = String(raw ?? "").trim().replace(/^bot\b\s*/i, "").trim();
  if (token === "") {
    throw new Error(
      "DISCORD_BOT_TOKEN is required. Create one at https://discord.com/developers/applications: open the application, Bot tab, Reset Token."
    );
  }
  return token;
}
function userAgent(version2) {
  return `DiscordBot (${USER_AGENT_URL}, ${version2})`;
}
function snowflakeTime(id) {
  return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
}
function snowflakeFrom(ms) {
  const since = BigInt(Math.max(0, Math.floor(ms))) - DISCORD_EPOCH;
  return String((since < 0n ? 0n : since) << 22n);
}
function compareSnowflakes(left, right) {
  const a = BigInt(left);
  const b = BigInt(right);
  return a === b ? 0 : a < b ? -1 : 1;
}
function maxSnowflake(ids) {
  let newest;
  for (const id of ids) {
    if (newest === void 0 || compareSnowflakes(id, newest) > 0) newest = id;
  }
  return newest;
}
function firstFieldError(errors, path = []) {
  if (typeof errors !== "object" || errors === null) return void 0;
  const record = errors;
  const own = record._errors;
  if (Array.isArray(own)) {
    const first = own.find((entry) => typeof entry === "object" && entry !== null);
    if (first) {
      const message = String(first.message ?? first.code ?? "").trim();
      if (message !== "") return path.length > 0 ? `${path.join(".")}: ${message}` : message;
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === "_errors") continue;
    const found = firstFieldError(value, [...path, key]);
    if (found !== void 0) return found;
  }
  return void 0;
}
var DiscordApiError = class extends Error {
  status;
  code;
  bucket;
  scope;
  constructor(status, body, detail = {}) {
    super(describeFailure2(status, body, detail.note));
    this.name = "DiscordApiError";
    this.status = status;
    this.code = typeof body?.code === "number" ? body.code : void 0;
    this.bucket = detail.bucket;
    this.scope = detail.scope;
  }
};
function describeFailure2(status, body, note) {
  const error = typeof body === "object" && body !== null ? body : {};
  const code = typeof error.code === "number" ? ` ${error.code}` : "";
  let message = typeof error.message === "string" && error.message !== "" ? error.message : "";
  if (message === "") {
    const raw = typeof body === "string" ? body : body === void 0 ? "" : JSON.stringify(body);
    message = raw.length > MAX_ERROR_BODY2 ? `${raw.slice(0, MAX_ERROR_BODY2)}\u2026` : raw;
  }
  const field = firstFieldError(error.errors);
  const tail = field !== void 0 ? ` (${field})` : "";
  return `${status}${code}: ${message || "no body"}${tail}${note ? ` ${note}` : ""}`;
}
function routeKey(method, path) {
  return `${method.toUpperCase()} ${path.replace(/\/\d{5,}/g, "/:id")}`;
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
function seconds(value) {
  const parsed = Number(value);
  return value === null || value === void 0 || value === "" || !Number.isFinite(parsed) ? void 0 : parsed;
}
function createDiscordClient(options) {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const sleep = options.sleep ?? defaultSleep;
  const warn = options.warn ?? ((message) => console.warn(message));
  const now = options.now ?? (() => Date.now());
  const headers = {
    authorization: `Bot ${options.token}`,
    "user-agent": userAgent(options.version)
  };
  const buckets = /* @__PURE__ */ new Map();
  const bucketOf = /* @__PURE__ */ new Map();
  async function pause(ms, why) {
    const wait2 = Math.min(MAX_WAIT_MS, Math.max(0, ms));
    warn(`Discord: ${why}; waiting ${(wait2 / 1e3).toFixed(1)}s.`);
    await sleep(wait2);
  }
  async function waitForBucket(route) {
    const key = bucketOf.get(route) ?? route;
    const state = buckets.get(key);
    if (!state || state.remaining > 0) return;
    const left = state.resetAt - now();
    if (left <= 0) return;
    await pause(left, `rate limit bucket ${key} is exhausted`);
  }
  function remember(route, response) {
    const bucket = response.headers.get("x-ratelimit-bucket") ?? route;
    bucketOf.set(route, bucket);
    const remaining = seconds(response.headers.get("x-ratelimit-remaining"));
    const resetAfter = seconds(response.headers.get("x-ratelimit-reset-after"));
    if (remaining === void 0 || resetAfter === void 0) return;
    buckets.set(bucket, { remaining, resetAt: now() + resetAfter * 1e3 });
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
    const route = routeKey(method, path);
    let rateLimited = 0;
    let serverErrors = 0;
    for (; ; ) {
      await waitForBucket(route);
      const response = await fetchImpl(url.toString(), init);
      remember(route, response);
      const body = await readBody2(response);
      if (response.ok) return body;
      if (response.status === 429) {
        const bucket = response.headers.get("x-ratelimit-bucket") ?? route;
        const scope = response.headers.get("x-ratelimit-scope") ?? void 0;
        const asked = seconds(response.headers.get("retry-after")) ?? seconds(body?.retry_after) ?? MIN_RATE_LIMIT_WAIT_MS / 1e3;
        if (rateLimited >= RATE_LIMIT_RETRIES) {
          throw new DiscordApiError(429, body, {
            bucket,
            ...scope && { scope },
            note: `(rate limited ${rateLimited + 1} times on bucket ${bucket}${scope ? `, scope ${scope}` : ""})`
          });
        }
        rateLimited += 1;
        await pause(
          Math.max(MIN_RATE_LIMIT_WAIT_MS, asked * 1e3),
          `${method.toUpperCase()} /${path} was rate limited on bucket ${bucket}${scope ? ` (${scope})` : ""}`
        );
        continue;
      }
      if (response.status >= 500 && serverErrors === 0) {
        serverErrors += 1;
        await pause(SERVER_ERROR_WAIT_MS, `${method.toUpperCase()} /${path} answered ${response.status}`);
        continue;
      }
      throw new DiscordApiError(response.status, body);
    }
  }
  return {
    request,
    get: (path, query) => request("GET", path, { query })
  };
}
var TITLE_LIMIT = 120;
var DEFAULT_MESSAGE_TYPE = 0;
var REPLY_MESSAGE_TYPE = 19;
function truncate(text22) {
  return text22.length > TITLE_LIMIT ? `${text22.slice(0, TITLE_LIMIT - 1)}\u2026` : text22;
}
function userLabel(user) {
  return user?.username || user?.global_name || user?.id || "unknown";
}
function keepsMessage(message, filter) {
  const type = message.type ?? DEFAULT_MESSAGE_TYPE;
  const human = type === DEFAULT_MESSAGE_TYPE || type === REPLY_MESSAGE_TYPE;
  if (!human && !filter.includeSystem) return false;
  if (filter.includeBots) return true;
  if (message.author?.bot === true) return false;
  return filter.selfId === void 0 || message.author?.id !== filter.selfId;
}
function messageUrl(guildId, channelId, messageId) {
  return `https://discord.com/channels/${guildId ?? "@me"}/${channelId}/${messageId}`;
}
function messageToItem(message, guildId) {
  const content = (message.content ?? "").trim();
  const firstLine = content.split("\n")[0]?.trim() ?? "";
  const author = userLabel(message.author);
  return {
    externalId: message.id,
    title: truncate(firstLine ? `${author}: ${firstLine}` : `${author}: message ${message.id}`),
    url: messageUrl(guildId, message.channel_id, message.id),
    description: content,
    ...message.author?.username && { assignee: message.author.username },
    updatedAt: message.timestamp,
    data: {
      id: message.id,
      channel_id: message.channel_id,
      guild_id: guildId ?? null,
      type: message.type ?? DEFAULT_MESSAGE_TYPE,
      content: message.content ?? "",
      timestamp: message.timestamp,
      edited_timestamp: message.edited_timestamp ?? null,
      author: message.author ? {
        id: message.author.id,
        username: message.author.username ?? "",
        global_name: message.author.global_name ?? null,
        bot: message.author.bot === true
      } : null,
      attachments: message.attachments ?? [],
      embeds: message.embeds ?? [],
      mention_everyone: message.mention_everyone === true,
      pinned: message.pinned === true,
      message_reference: message.message_reference ?? null,
      thread: message.thread ?? null
    }
  };
}
function memberToItem(member, guildId) {
  const user = member.user;
  const id = user?.id ?? "";
  return {
    externalId: id,
    title: `${userLabel(user)} joined`,
    url: `https://discord.com/users/${id}`,
    ...member.nick && { description: member.nick },
    updatedAt: member.joined_at,
    data: {
      user: user ? {
        id: user.id,
        username: user.username ?? "",
        global_name: user.global_name ?? null,
        bot: user.bot === true
      } : null,
      nick: member.nick ?? null,
      roles: member.roles ?? [],
      joined_at: member.joined_at,
      premium_since: member.premium_since ?? null,
      pending: member.pending === true,
      guild_id: guildId
    }
  };
}
function threadCreatedAt(thread) {
  const stamped = thread.thread_metadata?.create_timestamp;
  if (stamped) return stamped;
  return new Date(snowflakeTime(thread.id)).toISOString();
}
function threadToItem(thread, guildId) {
  const name = thread.name || thread.id;
  const metadata = thread.thread_metadata ?? {};
  return {
    externalId: thread.id,
    title: truncate(`Thread: ${name}`),
    url: `https://discord.com/channels/${thread.guild_id ?? guildId}/${thread.id}`,
    updatedAt: threadCreatedAt(thread),
    data: {
      id: thread.id,
      type: thread.type ?? null,
      guild_id: thread.guild_id ?? guildId,
      parent_id: thread.parent_id ?? null,
      owner_id: thread.owner_id ?? null,
      name,
      message_count: thread.message_count ?? null,
      member_count: thread.member_count ?? null,
      thread_metadata: {
        archived: metadata.archived === true,
        auto_archive_duration: metadata.auto_archive_duration ?? null,
        archive_timestamp: metadata.archive_timestamp ?? null,
        locked: metadata.locked === true,
        create_timestamp: metadata.create_timestamp ?? null
      }
    }
  };
}
function channelOutput(channel) {
  return {
    id: channel.id,
    name: channel.name ?? null,
    type: channel.type ?? null,
    guildId: channel.guild_id ?? null,
    parentId: channel.parent_id ?? null,
    topic: channel.topic ?? null,
    nsfw: channel.nsfw === true,
    lastMessageId: channel.last_message_id ?? null,
    rateLimitPerUser: channel.rate_limit_per_user ?? null,
    threadMetadata: channel.thread_metadata ?? null,
    messageCount: channel.message_count ?? null,
    memberCount: channel.member_count ?? null
  };
}
function channelSummary(channel) {
  return {
    id: channel.id,
    name: channel.name ?? null,
    type: channel.type ?? null,
    parentId: channel.parent_id ?? null,
    position: channel.position ?? null,
    topic: channel.topic ?? null,
    nsfw: channel.nsfw === true
  };
}
function memberOutput(member) {
  return {
    userId: member.user?.id ?? null,
    username: member.user?.username ?? null,
    globalName: member.user?.global_name ?? null,
    nick: member.nick ?? null,
    roles: member.roles ?? [],
    joinedAt: member.joined_at ?? null,
    premiumSince: member.premium_since ?? null,
    pending: member.pending === true,
    communicationDisabledUntil: member.communication_disabled_until ?? null,
    isBot: member.user?.bot === true
  };
}
var SAMPLE_GUILD = "197038439483310086";
var SAMPLE_CHANNEL = "41771983423143937";
var SAMPLE_USER = {
  id: "80351110224678912",
  username: "wumpus",
  global_name: "Wumpus",
  bot: false
};
var SAMPLE_MESSAGE = {
  id: "1412345678901234567",
  channel_id: SAMPLE_CHANNEL,
  type: 0,
  content: "Deploy finished for build 418",
  timestamp: "2026-09-04T18:41:02.123000+00:00",
  edited_timestamp: null,
  author: SAMPLE_USER,
  attachments: [],
  embeds: [],
  mention_everyone: false,
  pinned: false,
  message_reference: null,
  thread: null
};
var SAMPLE_MEMBER = {
  user: SAMPLE_USER,
  nick: null,
  roles: [],
  joined_at: "2026-09-04T18:30:00.000000+00:00",
  premium_since: null,
  pending: false
};
var SAMPLE_THREAD = {
  id: "1412345678901234567",
  type: 11,
  guild_id: SAMPLE_GUILD,
  parent_id: SAMPLE_CHANNEL,
  owner_id: SAMPLE_USER.id,
  name: "Build 418 rollout",
  message_count: 1,
  member_count: 2,
  thread_metadata: {
    archived: false,
    auto_archive_duration: 1440,
    archive_timestamp: "2026-09-04T18:45:10.000000+00:00",
    locked: false,
    create_timestamp: "2026-09-04T18:45:10.000000+00:00"
  }
};
var SAMPLE_MESSAGE_ITEM = messageToItem(SAMPLE_MESSAGE, SAMPLE_GUILD);
var SAMPLE_MEMBER_ITEM = memberToItem(SAMPLE_MEMBER, SAMPLE_GUILD);
var SAMPLE_THREAD_ITEM = threadToItem(SAMPLE_THREAD, SAMPLE_GUILD);
var MESSAGE_PAGE_SIZE = 100;
var MEMBER_PAGE_SIZE = 1e3;
var MAX_CONTENT_LENGTH = 2e3;
var MAX_EMBEDS = 10;
var MAX_THREAD_NAME_LENGTH = 100;
var AUTO_ARCHIVE_DURATIONS = [60, 1440, 4320, 10080];
var DEFAULT_AUTO_ARCHIVE = 1440;
var DEFAULT_LOOKBACK_MINUTES = 60;
var DEFAULT_MAX_PAGES = 5;
var THREAD_EXISTS = 160004;
var MEMBERS_INTENT_NOTE = "Listing guild members needs the Server Members intent: enable it under Privileged Gateway Intents on the Bot page at https://discord.com/developers/applications.";
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? void 0 : trimmed;
}
function flag(value) {
  return /^(true|1|yes)$/i.test(String(value ?? "").trim());
}
function integer(value, env, fallback, min) {
  const raw = text2(value);
  if (raw === void 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${env} must be a whole number of at least ${min}, got "${raw}"`);
  }
  return parsed;
}
function readSettings(config) {
  const channel = text2(config.channel);
  const guild = text2(config.guild);
  return {
    token: normalizeToken(config.botToken),
    ...channel && { channel },
    ...guild && { guild },
    includeBots: flag(config.includeBots),
    includeSystem: flag(config.includeSystem),
    lookbackMinutes: integer(config.lookbackMinutes, "DISCORD_LOOKBACK_MINUTES", DEFAULT_LOOKBACK_MINUTES, 0),
    maxPages: integer(config.maxPages, "DISCORD_MAX_PAGES", DEFAULT_MAX_PAGES, 1)
  };
}
function required(value, key, env) {
  const found = text2(value);
  if (!found) throw new Error(`${key} is required: set ${env} on the connection`);
  return found;
}
function boundaryOf(context, lookbackMinutes) {
  if (context.since) return Date.parse(context.since);
  return Date.parse(context.now()) - lookbackMinutes * 6e4;
}
function embedList(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const list = Array.isArray(value) ? value : [value];
  if (list.length > MAX_EMBEDS) {
    throw new Error(`embeds may hold at most ${MAX_EMBEDS} embeds, got ${list.length}`);
  }
  for (const embed of list) {
    if (typeof embed !== "object" || embed === null || Array.isArray(embed)) {
      throw new Error("embeds must be a JSON array of embed objects");
    }
  }
  return list;
}
function sendableContent(value, key = "content") {
  const body = text2(value);
  if (body === void 0) return void 0;
  if (body.length > MAX_CONTENT_LENGTH) {
    throw new Error(
      `${key} is ${body.length} characters; Discord refuses more than ${MAX_CONTENT_LENGTH}. Shorten it or split it across steps.`
    );
  }
  return body;
}
function threadName(value) {
  const name = text2(value);
  if (!name) throw new Error("name is required");
  if (name.length > MAX_THREAD_NAME_LENGTH) {
    throw new Error(`name is ${name.length} characters; a thread name holds at most ${MAX_THREAD_NAME_LENGTH}`);
  }
  return name;
}
function autoArchiveDuration(value) {
  if (value === void 0 || value === null || value === "") return DEFAULT_AUTO_ARCHIVE;
  const minutes = Number(value);
  if (!AUTO_ARCHIVE_DURATIONS.includes(minutes)) {
    throw new Error(`autoArchiveDuration must be one of ${AUTO_ARCHIVE_DURATIONS.join(", ")}, got "${String(value)}"`);
  }
  return minutes;
}
function emojiSegment(value) {
  const emoji = text2(value);
  if (!emoji) throw new Error("emoji is required");
  const custom = /^<a?:([^:>]+):(\d+)>$/.exec(emoji);
  return encodeURIComponent(custom ? `${custom[1]}:${custom[2]}` : emoji);
}
function createDiscordConnector(options = {}) {
  const version2 = options.version ?? "0.0.0";
  const warn = options.warn ?? ((message) => console.warn(message));
  const env = options.env ?? process.env;
  function fromEnv(value) {
    const raw = text2(value);
    if (raw === void 0) return void 0;
    const match = /^\$([A-Z][A-Z0-9_]*)$/.exec(raw);
    return match ? text2(env[match[1]]) : raw;
  }
  function clientFor(config, fetchImpl) {
    return createDiscordClient({
      token: normalizeToken(config.botToken),
      version: version2,
      fetchImpl: options.fetchImpl ?? fetchImpl,
      ...options.sleep && { sleep: options.sleep },
      warn
    });
  }
  const selfIds = /* @__PURE__ */ new Map();
  function selfId(token, client) {
    let pending = selfIds.get(token);
    if (!pending) {
      pending = client.get("users/@me").then((me) => String(me?.id ?? ""));
      pending.catch(() => selfIds.delete(token));
      selfIds.set(token, pending);
    }
    return pending;
  }
  const guildIds = /* @__PURE__ */ new Map();
  function guildIdOf(channel, client) {
    let pending = guildIds.get(channel);
    if (!pending) {
      pending = client.get(`channels/${encodeURIComponent(channel)}`).then((found) => {
        const id = found?.guild_id;
        return typeof id === "string" && id !== "" ? id : void 0;
      });
      pending.catch(() => guildIds.delete(channel));
      guildIds.set(channel, pending);
    }
    return pending;
  }
  async function fetchMessages(context) {
    const settings = readSettings(context.config);
    const channel = required(settings.channel, "channel", "DISCORD_CHANNEL_ID");
    const client = clientFor(context.config, context.fetch);
    const path = `channels/${encodeURIComponent(channel)}/messages`;
    const filter = {
      includeBots: settings.includeBots,
      includeSystem: settings.includeSystem,
      ...!settings.includeBots && { selfId: await selfId(settings.token, client) }
    };
    const guildId = await guildIdOf(channel, client);
    const collected = /* @__PURE__ */ new Map();
    let after = snowflakeFrom(boundaryOf(context, settings.lookbackMinutes));
    for (let page2 = 0; page2 < settings.maxPages; page2 += 1) {
      const messages = await client.get(path, { after, limit: MESSAGE_PAGE_SIZE });
      const batch = Array.isArray(messages) ? messages : [];
      for (const message of batch) if (message?.id) collected.set(message.id, message);
      const newest = maxSnowflake(batch.map((message) => message.id));
      if (batch.length < MESSAGE_PAGE_SIZE || newest === void 0) break;
      after = newest;
    }
    return [...collected.values()].filter((message) => keepsMessage(message, filter)).sort((left, right) => compareSnowflakes(left.id, right.id)).map((message) => messageToItem(message, guildId));
  }
  async function fetchMembers(context) {
    const settings = readSettings(context.config);
    const guild = required(settings.guild, "guild", "DISCORD_GUILD_ID");
    const client = clientFor(context.config, context.fetch);
    const path = `guilds/${encodeURIComponent(guild)}/members`;
    const boundary = boundaryOf(context, settings.lookbackMinutes);
    const joined = /* @__PURE__ */ new Map();
    let after;
    let page2 = 0;
    for (; ; ) {
      let members;
      try {
        members = await client.get(path, { limit: MEMBER_PAGE_SIZE, after });
      } catch (error) {
        if (error instanceof DiscordApiError && error.status === 403) {
          throw new Error(`${error.message}. ${MEMBERS_INTENT_NOTE}`, { cause: error });
        }
        throw error;
      }
      const batch = Array.isArray(members) ? members : [];
      for (const member of batch) {
        if (member.user?.id && Date.parse(member.joined_at) >= boundary) joined.set(member.user.id, member);
      }
      page2 += 1;
      const last = maxSnowflake(batch.map((member) => member.user?.id ?? "").filter(Boolean));
      if (batch.length < MEMBER_PAGE_SIZE || last === void 0) break;
      if (page2 >= settings.maxPages) {
        warn(
          `Discord: guild ${guild} has more than ${settings.maxPages * MEMBER_PAGE_SIZE} members; raise DISCORD_MAX_PAGES to walk them all.`
        );
        break;
      }
      after = last;
    }
    return [...joined.values()].sort((left, right) => left.joined_at.localeCompare(right.joined_at)).map((member) => memberToItem(member, guild));
  }
  async function fetchThreads(context) {
    const settings = readSettings(context.config);
    const guild = required(settings.guild, "guild", "DISCORD_GUILD_ID");
    const client = clientFor(context.config, context.fetch);
    const boundary = boundaryOf(context, settings.lookbackMinutes);
    const body = await client.get(
      `guilds/${encodeURIComponent(guild)}/threads/active`
    );
    const threads = Array.isArray(body?.threads) ? body.threads : [];
    return threads.filter((thread) => typeof thread?.id === "string").filter((thread) => settings.channel === void 0 || thread.parent_id === settings.channel).filter((thread) => Date.parse(threadCreatedAt(thread)) >= boundary).sort((left, right) => threadCreatedAt(left).localeCompare(threadCreatedAt(right))).map((thread) => threadToItem(thread, guild));
  }
  function channelArg(args) {
    const channel = fromEnv(args.channel);
    if (!channel) throw new Error("channel is required");
    return channel;
  }
  function idArg(args, key) {
    const id = fromEnv(args[key]);
    if (!id) throw new Error(`${key} is required`);
    return id;
  }
  return defineConnector({
    id: "discord",
    name: "Discord",
    version: version2,
    description: "Trigger workflows from new Discord messages, members and threads, and send messages, reply in threads, react, pin or read channels and members from a step.",
    auth: { rung: "key", keys: ["botToken"] },
    // Clyde, Discord's controller-shaped face, with the eyes punched through by the evenodd rule.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"
      ]
    },
    config: [
      {
        key: "botToken",
        env: "DISCORD_BOT_TOKEN",
        label: "Bot token",
        secret: true,
        required: true,
        description: "From https://discord.com/developers/applications: open the application, Bot tab, Reset Token, and paste the token it shows once. Sent as `Authorization: Bot <token>`.",
        builderHint: 'A bot token, not an OAuth2 Bearer token. Reading message text needs the Message Content intent and listing members the Server Members intent, both under Privileged Gateway Intents on the same Bot page. A pasted "Bot " prefix is stripped.'
      },
      {
        key: "channel",
        env: "DISCORD_CHANNEL_ID",
        label: "Channel",
        description: "Channel or thread id (Developer Mode \u2192 right-click \u2192 Copy Channel ID). Required by the message trigger; narrows the thread trigger to one parent channel.",
        builderHint: "A snowflake, so keep it a string. A thread is a channel: point a second connection at the thread id to watch its replies."
      },
      {
        key: "guild",
        env: "DISCORD_GUILD_ID",
        label: "Server",
        description: "Guild (server) id. Required by the member and thread triggers.",
        builderHint: "Also a snowflake. Right-click the server name with Developer Mode on to copy it."
      },
      {
        key: "includeBots",
        env: "DISCORD_INCLUDE_BOTS",
        label: "Include bot messages",
        default: "false",
        description: "Deliver messages whose author is a bot, including this one\u2019s. Off by default so a workflow that posts into the channel it watches does not loop."
      },
      {
        key: "includeSystem",
        env: "DISCORD_INCLUDE_SYSTEM",
        label: "Include system messages",
        default: "false",
        description: "Deliver joins, pins, boosts, thread notices and other messages nobody typed."
      },
      {
        key: "lookbackMinutes",
        env: "DISCORD_LOOKBACK_MINUTES",
        label: "First poll look-back (minutes)",
        default: String(DEFAULT_LOOKBACK_MINUTES),
        description: "How far back the very first poll looks. Later polls continue from where the last one stopped."
      },
      {
        key: "maxPages",
        env: "DISCORD_MAX_PAGES",
        label: "Pages per poll",
        default: String(DEFAULT_MAX_PAGES),
        description: "Pages of 100 messages or 1000 members one poll walks before leaving the rest for the next."
      }
    ],
    async preflight() {
      const token = text2(env.DISCORD_BOT_TOKEN);
      if (!token) {
        return {
          ok: false,
          message: "Set DISCORD_BOT_TOKEN: create one at https://discord.com/developers/applications under the Bot tab with Reset Token."
        };
      }
      const client = createDiscordClient({ token: normalizeToken(token), version: version2, ...options.fetchImpl && { fetchImpl: options.fetchImpl }, warn });
      const me = await client.get("users/@me");
      return { ok: true, message: `Signed in as ${userLabel(me)} (${me?.id ?? "unknown id"})` };
    },
    triggers: [
      {
        type: "messageInChannel",
        label: "A message is posted in a channel",
        description: "Fires once per new message in the channel or thread. Bot and system messages are skipped unless the connection includes them. Reading the text needs the Message Content intent.",
        defaultWorkflow: { name: "Discord: messages", defaultCronFromMinutes: 1 },
        dedupe: "timestamp",
        sample: [SAMPLE_MESSAGE_ITEM],
        fetch: fetchMessages
      },
      {
        type: "memberJoined",
        label: "A member joins the server",
        description: "Fires once per member who joined the guild since the last poll. Needs the Server Members intent.",
        defaultWorkflow: { name: "Discord: new members", defaultCronFromMinutes: 5 },
        dedupe: "timestamp",
        sample: [SAMPLE_MEMBER_ITEM],
        fetch: fetchMembers
      },
      {
        type: "threadCreated",
        label: "A thread is created",
        description: "Fires once per active thread created since the last poll, in every channel of the guild or only under the configured channel.",
        defaultWorkflow: { name: "Discord: new threads", defaultCronFromMinutes: 5 },
        dedupe: "timestamp",
        sample: [SAMPLE_THREAD_ITEM],
        fetch: fetchThreads
      }
    ],
    actions: [
      {
        type: "sendMessage",
        label: "Send a message",
        description: "Post a message to a channel or thread, optionally as a reply and with embeds.",
        idempotent: false,
        inputs: [
          {
            key: "channel",
            label: "Channel",
            required: true,
            description: "Channel or thread id.",
            builderHint: "Defaults to nothing: a step names the channel it posts to, which is often {{trigger.item.channel_id}}."
          },
          {
            key: "content",
            label: "Message",
            description: "Text, up to 2000 characters. Required unless embeds are given.",
            builderHint: "Markdown as Discord renders it; mentions are <@userId>."
          },
          {
            key: "embeds",
            label: "Embeds",
            type: "json",
            description: "A JSON array of up to 10 embed objects (title, description, url, color, fields, footer, image, thumbnail, author, timestamp).",
            builderHint: "Needs the Embed Links permission to render. One object is taken as a single embed."
          },
          {
            key: "replyTo",
            label: "Reply to",
            description: "Message id to reply to, from {{trigger.item.id}}.",
            builderHint: "Sent as message_reference with fail_if_not_exists false, so a deleted target posts a plain message rather than failing."
          }
        ],
        outputs: [
          { key: "id", description: "Id of the message" },
          { key: "channelId", description: "The channel it landed in" },
          { key: "content", description: "The text as stored" },
          { key: "timestamp", description: "When Discord received it" },
          { key: "url", description: "Link to the message" }
        ],
        async run(args, context) {
          const channel = channelArg(args);
          const content = sendableContent(args.content);
          const embeds = embedList(args.embeds);
          if (content === void 0 && embeds === void 0) {
            throw new Error("content or embeds is required: Discord cannot send an empty message");
          }
          const replyTo = text2(args.replyTo);
          const client = clientFor(context.config, context.fetch);
          const sent = await client.request("POST", `channels/${encodeURIComponent(channel)}/messages`, {
            body: {
              ...content !== void 0 && { content },
              ...embeds !== void 0 && { embeds },
              ...replyTo && { message_reference: { message_id: replyTo, fail_if_not_exists: false } }
            }
          });
          const id = sent?.id ?? null;
          const channelId = sent?.channel_id ?? channel;
          return {
            id,
            channelId,
            content: sent?.content ?? content ?? "",
            timestamp: sent?.timestamp ?? null,
            url: id ? messageUrl(await guildIdOf(channelId, client), channelId, id) : null
          };
        }
      },
      {
        type: "createThread",
        label: "Reply in a thread",
        description: "Start a thread from a message, or use the one it already has, and post a reply in it.",
        idempotent: false,
        inputs: [
          { key: "channel", label: "Channel", required: true, description: "The parent channel id." },
          {
            key: "message",
            label: "Message",
            required: true,
            description: "The message to thread from, from {{trigger.item.id}}.",
            builderHint: "A thread shares its id with the source message, so a thread that already exists is found by this id."
          },
          {
            key: "name",
            label: "Thread name",
            required: true,
            description: "Thread name, 1 to 100 characters. Ignored when the thread already exists."
          },
          {
            key: "content",
            label: "Reply",
            required: true,
            description: "The reply to post in the thread, up to 2000 characters."
          },
          {
            key: "autoArchiveDuration",
            label: "Auto-archive after",
            type: "select",
            options: [
              { value: "60", label: "1 hour" },
              { value: "1440", label: "1 day" },
              { value: "4320", label: "3 days" },
              { value: "10080", label: "1 week" }
            ],
            description: "Minutes of inactivity before the thread archives: 60, 1440, 4320 or 10080. Defaults to 1440.",
            builderHint: "Discord accepts only these four values; anything else is refused before the call."
          }
        ],
        outputs: [
          { key: "threadId", description: "Id of the thread, the same as the source message" },
          { key: "threadName", description: "Name of the thread" },
          { key: "created", type: "boolean", description: "Whether this call made the thread" },
          { key: "messageId", description: "Id of the reply posted in the thread" },
          { key: "url", description: "Link to the reply" }
        ],
        async run(args, context) {
          const channel = channelArg(args);
          const message = idArg(args, "message");
          const name = threadName(args.name);
          const content = sendableContent(args.content);
          if (content === void 0) throw new Error("content is required");
          const minutes = autoArchiveDuration(args.autoArchiveDuration);
          const client = clientFor(context.config, context.fetch);
          let threadId = message;
          let threadLabel = name;
          let created = false;
          try {
            const thread = await client.request(
              "POST",
              `channels/${encodeURIComponent(channel)}/messages/${encodeURIComponent(message)}/threads`,
              { body: { name, auto_archive_duration: minutes } }
            );
            threadId = thread?.id ?? message;
            threadLabel = thread?.name ?? name;
            created = true;
          } catch (error) {
            if (!(error instanceof DiscordApiError) || error.code !== THREAD_EXISTS) throw error;
          }
          const posted = await client.request("POST", `channels/${encodeURIComponent(threadId)}/messages`, {
            body: { content }
          });
          const messageId = posted?.id ?? null;
          return {
            threadId,
            threadName: threadLabel,
            created,
            messageId,
            url: messageId ? messageUrl(await guildIdOf(channel, client), threadId, messageId) : null
          };
        }
      },
      {
        type: "addReaction",
        label: "Add a reaction",
        description: "React to a message with a Unicode or custom emoji.",
        idempotent: false,
        inputs: [
          { key: "channel", label: "Channel", required: true, description: "Channel or thread id." },
          { key: "message", label: "Message", required: true, description: "Message id." },
          {
            key: "emoji",
            label: "Emoji",
            required: true,
            description: "A Unicode emoji such as \u{1F44D}, or name:id for a custom one.",
            builderHint: "URL-encoded into the path; a pasted <:name:id> is reduced to name:id. Needs Read Message History and Add Reactions."
          }
        ],
        outputs: [{ key: "ok", type: "boolean", description: "True once Discord answered 204" }],
        async run(args, context) {
          const channel = channelArg(args);
          const message = idArg(args, "message");
          const emoji = emojiSegment(args.emoji);
          await clientFor(context.config, context.fetch).request(
            "PUT",
            `channels/${encodeURIComponent(channel)}/messages/${encodeURIComponent(message)}/reactions/${emoji}/@me`
          );
          return { ok: true };
        }
      },
      {
        type: "pinMessage",
        label: "Pin a message",
        description: "Pin a message in its channel. Pinning one already pinned is a no-op.",
        idempotent: true,
        inputs: [
          { key: "channel", label: "Channel", required: true, description: "Channel or thread id." },
          {
            key: "message",
            label: "Message",
            required: true,
            description: "Message id.",
            builderHint: "Needs the Pin Messages permission; a channel holds at most 250 pins and Discord answers 30003 past that."
          }
        ],
        outputs: [{ key: "ok", type: "boolean", description: "True once Discord answered 204" }],
        async run(args, context) {
          const channel = channelArg(args);
          const message = idArg(args, "message");
          await clientFor(context.config, context.fetch).request(
            "PUT",
            `channels/${encodeURIComponent(channel)}/messages/pins/${encodeURIComponent(message)}`
          );
          return { ok: true };
        }
      },
      {
        type: "listChannels",
        label: "List channels",
        description: "The channels of a guild, sorted by position. Threads are not included.",
        idempotent: true,
        inputs: [
          { key: "guild", label: "Server", required: true, description: "Guild (server) id." },
          {
            key: "type",
            label: "Channel type",
            type: "number",
            description: "Keep only this type: 0 text, 2 voice, 4 category, 5 announcement, 13 stage, 15 forum, 16 media.",
            builderHint: "Discord\u2019s channel type numbers; blank keeps every type."
          }
        ],
        outputs: [
          {
            key: "channels",
            description: "One entry per channel: id, name, type, parentId, position, topic, nsfw"
          }
        ],
        sample: { guild: "$DISCORD_GUILD_ID" },
        async run(args, context) {
          const guild = idArg(args, "guild");
          const wanted = typeof args.type === "number" ? args.type : void 0;
          const channels = await clientFor(context.config, context.fetch).get(
            `guilds/${encodeURIComponent(guild)}/channels`
          );
          const list = Array.isArray(channels) ? channels : [];
          return {
            channels: list.filter((channel) => wanted === void 0 || channel.type === wanted).sort((left, right) => (left.position ?? 0) - (right.position ?? 0)).map(channelSummary)
          };
        }
      },
      {
        type: "getChannel",
        label: "Get a channel",
        description: "Read one channel or thread by id.",
        idempotent: true,
        inputs: [{ key: "channel", label: "Channel", required: true, description: "Channel or thread id." }],
        outputs: [
          { key: "id", description: "Channel id" },
          { key: "name", description: "Channel name" },
          { key: "type", type: "number", description: "Channel type number" },
          { key: "guildId", description: "Guild the channel belongs to, or null for a DM" },
          { key: "parentId", description: "Category or parent channel id, or null" },
          { key: "topic", description: "Channel topic, or null" },
          { key: "nsfw", type: "boolean", description: "Whether the channel is age-restricted" },
          { key: "lastMessageId", description: "Id of the newest message, or null" },
          { key: "rateLimitPerUser", type: "number", description: "Slowmode seconds, or null" },
          { key: "threadMetadata", description: "Thread metadata for a thread, or null" },
          { key: "messageCount", type: "number", description: "Messages in a thread, or null" },
          { key: "memberCount", type: "number", description: "Members of a thread, or null" }
        ],
        sample: { channel: "$DISCORD_CHANNEL_ID" },
        async run(args, context) {
          const channel = channelArg(args);
          const found = await clientFor(context.config, context.fetch).get(
            `channels/${encodeURIComponent(channel)}`
          );
          return channelOutput({ ...found ?? {}, id: found?.id ?? channel });
        }
      },
      {
        type: "getGuildMember",
        label: "Get a server member",
        description: "Read one member of a guild, with their nickname, roles and join date.",
        idempotent: true,
        inputs: [
          { key: "guild", label: "Server", required: true, description: "Guild (server) id." },
          {
            key: "user",
            label: "User",
            required: true,
            description: "User id, from {{trigger.item.author.id}}.",
            builderHint: "Needs no privileged intent, unlike listing members. 10007 Unknown Member when the user is not in the guild."
          }
        ],
        outputs: [
          { key: "userId", description: "User id" },
          { key: "username", description: "Account username" },
          { key: "globalName", description: "Display name, or null" },
          { key: "nick", description: "Nickname in this guild, or null" },
          { key: "roles", description: "Role ids" },
          { key: "joinedAt", description: "When they joined the guild" },
          { key: "premiumSince", description: "When they started boosting, or null" },
          { key: "pending", type: "boolean", description: "Whether membership screening is still pending" },
          { key: "communicationDisabledUntil", description: "End of a timeout, or null" },
          { key: "isBot", type: "boolean", description: "Whether the user is a bot" }
        ],
        sample: { guild: "$DISCORD_GUILD_ID", user: "$DISCORD_USER_ID" },
        async run(args, context) {
          const guild = idArg(args, "guild");
          const client = clientFor(context.config, context.fetch);
          const user = fromEnv(args.user) ?? await selfId(normalizeToken(context.config.botToken), client);
          if (!user) throw new Error("user is required");
          const member = await client.get(
            `guilds/${encodeURIComponent(guild)}/members/${encodeURIComponent(user)}`
          );
          return memberOutput({ ...member ?? {}, user: member?.user ?? { id: user } });
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
  name: "@vornrun/connector-discord",
  version: "0.1.1",
  description: "Trigger workflows from Discord messages, members and threads, and send, react, pin or read from a step.",
  type: "module",
  license: "MIT",
  author: "Javier Canizalez <javier-canizalez@outlook.com>",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "discord"
  },
  keywords: [
    "vorn",
    "connector",
    "discord"
  ],
  bin: {
    "vorn-connector-discord": "dist/index.js"
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
    category: "Communication",
    keywords: [
      "discord",
      "messages",
      "channels",
      "threads",
      "guild",
      "server",
      "bot",
      "chat"
    ],
    auth: "Paste a bot token from the Developer Portal (Bot tab, Reset Token). There is no Discord CLI to sign in with.",
    hosts: [
      "discord.com"
    ]
  }
};
var { version } = package_default;
var discordConnector = createDiscordConnector({ version });
var index_default = discordConnector;
serveIfEntryPoint(discordConnector, import.meta.url);

// discord/vorn-connector-pack.js
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
