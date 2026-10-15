import { createRequire as __vornCreateRequire } from 'node:module'
import { fileURLToPath as __vornFileURLToPath } from 'node:url'
import { dirname as __vornDirname } from 'node:path'
const require = __vornCreateRequire(import.meta.url)
const __vorn_filename = __vornFileURLToPath(import.meta.url)
const __vorn_dirname = __vornDirname(__vorn_filename)

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/utils.js
var require_utils = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.assertNever = assertNever;
    exports.pick = pick2;
    exports.isObject = isObject;
    exports.getUnknownParams = getUnknownParams;
    function assertNever(value) {
      throw new Error(`Unexpected value should never occur: ${value}`);
    }
    function pick2(base, keys) {
      const entries = keys.map((key) => [key, base === null || base === void 0 ? void 0 : base[key]]);
      return Object.fromEntries(entries);
    }
    function isObject(o) {
      return typeof o === "object" && o !== null;
    }
    function getUnknownParams(args, endpoint2) {
      var _a;
      const knownKeys = /* @__PURE__ */ new Set([
        ...endpoint2.pathParams,
        ...endpoint2.queryParams,
        ...endpoint2.bodyParams,
        ...(_a = endpoint2.formDataParams) !== null && _a !== void 0 ? _a : [],
        "auth"
      ]);
      return Object.keys(args).filter((k) => !knownKeys.has(k));
    }
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/logging.js
var require_logging = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/logging.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LogLevel = void 0;
    exports.makeConsoleLogger = makeConsoleLogger;
    exports.logLevelSeverity = logLevelSeverity;
    var utils_1 = require_utils();
    var LogLevel;
    (function(LogLevel2) {
      LogLevel2["DEBUG"] = "debug";
      LogLevel2["INFO"] = "info";
      LogLevel2["WARN"] = "warn";
      LogLevel2["ERROR"] = "error";
    })(LogLevel || (exports.LogLevel = LogLevel = {}));
    function makeConsoleLogger(name) {
      return (level, message, extraInfo) => {
        console[level](`${name} ${level}:`, message, extraInfo);
      };
    }
    function logLevelSeverity(level) {
      switch (level) {
        case LogLevel.DEBUG:
          return 20;
        case LogLevel.INFO:
          return 40;
        case LogLevel.WARN:
          return 60;
        case LogLevel.ERROR:
          return 80;
        default:
          return (0, utils_1.assertNever)(level);
      }
    }
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/errors.js
var require_errors = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.APIResponseError = exports.UnknownHTTPResponseError = exports.InvalidPathParameterError = exports.RequestTimeoutError = exports.ClientErrorCode = exports.APIErrorCode = void 0;
    exports.isNotionClientError = isNotionClientError;
    exports.validateRequestPath = validateRequestPath;
    exports.getResponseHeader = getResponseHeader;
    exports.isHTTPResponseError = isHTTPResponseError;
    exports.buildRequestError = buildRequestError;
    var utils_1 = require_utils();
    var APIErrorCode;
    (function(APIErrorCode2) {
      APIErrorCode2["Unauthorized"] = "unauthorized";
      APIErrorCode2["RestrictedResource"] = "restricted_resource";
      APIErrorCode2["ObjectNotFound"] = "object_not_found";
      APIErrorCode2["RateLimited"] = "rate_limited";
      APIErrorCode2["InvalidJSON"] = "invalid_json";
      APIErrorCode2["InvalidRequestURL"] = "invalid_request_url";
      APIErrorCode2["InvalidRequest"] = "invalid_request";
      APIErrorCode2["InvalidBeta"] = "invalid_beta";
      APIErrorCode2["ValidationError"] = "validation_error";
      APIErrorCode2["ConflictError"] = "conflict_error";
      APIErrorCode2["InternalServerError"] = "internal_server_error";
      APIErrorCode2["ServiceOverload"] = "service_overload";
      APIErrorCode2["ServiceUnavailable"] = "service_unavailable";
      APIErrorCode2["GatewayTimeout"] = "gateway_timeout";
    })(APIErrorCode || (exports.APIErrorCode = APIErrorCode = {}));
    var ClientErrorCode;
    (function(ClientErrorCode2) {
      ClientErrorCode2["RequestTimeout"] = "notionhq_client_request_timeout";
      ClientErrorCode2["ResponseError"] = "notionhq_client_response_error";
      ClientErrorCode2["InvalidPathParameter"] = "notionhq_client_invalid_path_parameter";
    })(ClientErrorCode || (exports.ClientErrorCode = ClientErrorCode = {}));
    var NotionClientErrorBase = class extends Error {
    };
    function isNotionClientError(error) {
      return (0, utils_1.isObject)(error) && error instanceof NotionClientErrorBase;
    }
    function isNotionClientErrorWithCode(error, codes) {
      return isNotionClientError(error) && error.code in codes;
    }
    var RequestTimeoutError = class _RequestTimeoutError extends NotionClientErrorBase {
      constructor(message = "Request to Notion API has timed out") {
        super(message);
        this.code = ClientErrorCode.RequestTimeout;
        this.name = "RequestTimeoutError";
      }
      static isRequestTimeoutError(error) {
        return isNotionClientErrorWithCode(error, {
          [ClientErrorCode.RequestTimeout]: true
        });
      }
      static rejectAfterTimeout(promise, timeoutMS) {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new _RequestTimeoutError());
          }, timeoutMS);
          promise.then(resolve).catch(reject).then(() => clearTimeout(timeoutId));
        });
      }
    };
    exports.RequestTimeoutError = RequestTimeoutError;
    var InvalidPathParameterError = class extends NotionClientErrorBase {
      constructor(message = "Path parameter contains invalid characters that could alter the request path") {
        super(message);
        this.code = ClientErrorCode.InvalidPathParameter;
        this.name = "InvalidPathParameterError";
      }
      static isInvalidPathParameterError(error) {
        return isNotionClientErrorWithCode(error, {
          [ClientErrorCode.InvalidPathParameter]: true
        });
      }
    };
    exports.InvalidPathParameterError = InvalidPathParameterError;
    function validateRequestPath(path) {
      if (path.includes("..")) {
        throw new InvalidPathParameterError(`Request path "${path}" contains path traversal sequence ".."`);
      }
      if (/%2e/i.test(path)) {
        let decoded;
        try {
          decoded = decodeURIComponent(path);
        } catch {
          return;
        }
        if (decoded.includes("..")) {
          throw new InvalidPathParameterError(`Request path "${path}" contains encoded path traversal sequence`);
        }
      }
    }
    function getResponseHeader(headers, name) {
      if (!(0, utils_1.isObject)(headers)) {
        return void 0;
      }
      const get = headers["get"];
      if (typeof get === "function") {
        const value = get.call(headers, name);
        return typeof value === "string" ? value : void 0;
      }
      const lowerName = name.toLowerCase();
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== lowerName) {
          continue;
        }
        if (typeof value === "string") {
          return value;
        }
        if (Array.isArray(value) && typeof value[0] === "string") {
          return value[0];
        }
      }
      return void 0;
    }
    var HTTPResponseError = class extends NotionClientErrorBase {
      constructor(args) {
        super(args.message);
        this.name = "HTTPResponseError";
        const { code, status, headers, rawBodyText, additional_data, request_id } = args;
        this.code = code;
        this.status = status;
        this.headers = headers;
        this.body = rawBodyText;
        this.additional_data = additional_data;
        this.request_id = request_id !== null && request_id !== void 0 ? request_id : getResponseHeader(headers, "x-notion-request-id");
        this.ray_id = getResponseHeader(headers, "cf-ray");
      }
    };
    var httpResponseErrorCodes = {
      [ClientErrorCode.ResponseError]: true,
      [APIErrorCode.Unauthorized]: true,
      [APIErrorCode.RestrictedResource]: true,
      [APIErrorCode.ObjectNotFound]: true,
      [APIErrorCode.RateLimited]: true,
      [APIErrorCode.InvalidJSON]: true,
      [APIErrorCode.InvalidRequestURL]: true,
      [APIErrorCode.InvalidRequest]: true,
      [APIErrorCode.InvalidBeta]: true,
      [APIErrorCode.ValidationError]: true,
      [APIErrorCode.ConflictError]: true,
      [APIErrorCode.InternalServerError]: true,
      [APIErrorCode.ServiceOverload]: true,
      [APIErrorCode.ServiceUnavailable]: true,
      [APIErrorCode.GatewayTimeout]: true
    };
    function isHTTPResponseError(error) {
      if (!isNotionClientErrorWithCode(error, httpResponseErrorCodes)) {
        return false;
      }
      return true;
    }
    var UnknownHTTPResponseError = class extends HTTPResponseError {
      constructor(args) {
        var _a;
        const ray_id = getResponseHeader(args.headers, "cf-ray");
        const request_id = getResponseHeader(args.headers, "x-notion-request-id");
        super({
          ...args,
          code: ClientErrorCode.ResponseError,
          message: (_a = args.message) !== null && _a !== void 0 ? _a : buildUnknownResponseMessage({
            status: args.status,
            contentType: getResponseHeader(args.headers, "content-type"),
            ray_id,
            request_id
          }),
          additional_data: void 0,
          request_id
        });
        this.name = "UnknownHTTPResponseError";
      }
      static isUnknownHTTPResponseError(error) {
        return isNotionClientErrorWithCode(error, {
          [ClientErrorCode.ResponseError]: true
        });
      }
    };
    exports.UnknownHTTPResponseError = UnknownHTTPResponseError;
    var apiErrorCodes = {
      [APIErrorCode.Unauthorized]: true,
      [APIErrorCode.RestrictedResource]: true,
      [APIErrorCode.ObjectNotFound]: true,
      [APIErrorCode.RateLimited]: true,
      [APIErrorCode.InvalidJSON]: true,
      [APIErrorCode.InvalidRequestURL]: true,
      [APIErrorCode.InvalidRequest]: true,
      [APIErrorCode.InvalidBeta]: true,
      [APIErrorCode.ValidationError]: true,
      [APIErrorCode.ConflictError]: true,
      [APIErrorCode.InternalServerError]: true,
      [APIErrorCode.ServiceOverload]: true,
      [APIErrorCode.ServiceUnavailable]: true,
      [APIErrorCode.GatewayTimeout]: true
    };
    var APIResponseError = class extends HTTPResponseError {
      constructor() {
        super(...arguments);
        this.name = "APIResponseError";
      }
      static isAPIResponseError(error) {
        return isNotionClientErrorWithCode(error, apiErrorCodes);
      }
    };
    exports.APIResponseError = APIResponseError;
    function buildRequestError(response, bodyText) {
      const apiErrorResponseBody = parseAPIErrorResponseBody(bodyText);
      if (apiErrorResponseBody !== void 0) {
        return new APIResponseError({
          code: apiErrorResponseBody.code,
          message: apiErrorResponseBody.message,
          headers: response.headers,
          status: response.status,
          rawBodyText: bodyText,
          additional_data: apiErrorResponseBody.additional_data,
          request_id: apiErrorResponseBody.request_id
        });
      }
      return new UnknownHTTPResponseError({
        message: void 0,
        headers: response.headers,
        status: response.status,
        rawBodyText: bodyText
      });
    }
    function buildUnknownResponseMessage(args) {
      const { status, contentType, ray_id, request_id } = args;
      const base = `Request to Notion API failed with status: ${status}`;
      if (ray_id === void 0 || request_id !== void 0) {
        return base;
      }
      const contentTypeNote = contentType !== void 0 ? ` (content-type: ${contentType})` : "";
      const blockedRequestNote = status === 403 ? " This may mean the request was blocked by a network security rule." : "";
      return `${base}. The response was returned by Notion's edge proxy before reaching the Notion API${contentTypeNote}.${blockedRequestNote} Cloudflare Ray ID: ${ray_id}. Include this ID when contacting Notion support.`;
    }
    function parseAPIErrorResponseBody(body) {
      if (typeof body !== "string") {
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (parseError) {
        return;
      }
      if (!(0, utils_1.isObject)(parsed) || typeof parsed["message"] !== "string" || !isAPIErrorCode(parsed["code"])) {
        return;
      }
      const additional_data = parsed["additional_data"];
      const request_id = parsed["request_id"];
      return {
        ...parsed,
        code: parsed["code"],
        message: parsed["message"],
        additional_data,
        request_id
      };
    }
    function isAPIErrorCode(code) {
      return typeof code === "string" && code in apiErrorCodes;
    }
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/constants.js
var require_constants = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MIN_VIEW_COLUMN_WIDTH = exports.DEFAULT_MAX_RETRY_DELAY_MS = exports.DEFAULT_INITIAL_RETRY_DELAY_MS = exports.DEFAULT_MAX_RETRIES = exports.DEFAULT_TIMEOUT_MS = exports.DEFAULT_BASE_URL = void 0;
    exports.DEFAULT_BASE_URL = "https://api.notion.com";
    exports.DEFAULT_TIMEOUT_MS = 6e4;
    exports.DEFAULT_MAX_RETRIES = 2;
    exports.DEFAULT_INITIAL_RETRY_DELAY_MS = 1e3;
    exports.DEFAULT_MAX_RETRY_DELAY_MS = 6e4;
    exports.MIN_VIEW_COLUMN_WIDTH = 32;
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/async-tasks.js
var require_async_tasks = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/async-tasks.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getAsyncTask = void 0;
    exports.getAsyncTask = {
      method: "get",
      pathParams: ["task_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `async_tasks/${p.task_id}`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/blocks.js
var require_blocks = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/blocks.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.appendBlockChildren = exports.listBlockChildren = exports.deleteBlock = exports.updateBlock = exports.getBlock = void 0;
    exports.getBlock = {
      method: "get",
      pathParams: ["block_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `blocks/${p.block_id}`
    };
    exports.updateBlock = {
      method: "patch",
      pathParams: ["block_id"],
      queryParams: [],
      bodyParams: [
        "archived",
        "embed",
        "type",
        "in_trash",
        "bookmark",
        "image",
        "video",
        "pdf",
        "file",
        "audio",
        "code",
        "equation",
        "divider",
        "breadcrumb",
        "tab",
        "table_of_contents",
        "link_to_page",
        "table_row",
        "heading_1",
        "heading_2",
        "heading_3",
        "heading_4",
        "paragraph",
        "bulleted_list_item",
        "numbered_list_item",
        "quote",
        "to_do",
        "toggle",
        "template",
        "callout",
        "synced_block",
        "table",
        "column"
      ],
      path: (p) => `blocks/${p.block_id}`
    };
    exports.deleteBlock = {
      method: "delete",
      pathParams: ["block_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `blocks/${p.block_id}`
    };
    exports.listBlockChildren = {
      method: "get",
      pathParams: ["block_id"],
      queryParams: ["start_cursor", "page_size"],
      bodyParams: [],
      path: (p) => `blocks/${p.block_id}/children`
    };
    exports.appendBlockChildren = {
      method: "patch",
      pathParams: ["block_id"],
      queryParams: [],
      bodyParams: ["after", "children", "position"],
      path: (p) => `blocks/${p.block_id}/children`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/comments.js
var require_comments = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/comments.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.deleteComment = exports.updateComment = exports.getComment = exports.listComments = exports.createComment = void 0;
    exports.createComment = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: [
        "attachments",
        "display_name",
        "parent",
        "rich_text",
        "markdown",
        "discussion_id"
      ],
      path: () => `comments`
    };
    exports.listComments = {
      method: "get",
      pathParams: [],
      queryParams: ["block_id", "start_cursor", "page_size"],
      bodyParams: [],
      path: () => `comments`
    };
    exports.getComment = {
      method: "get",
      pathParams: ["comment_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `comments/${p.comment_id}`
    };
    exports.updateComment = {
      method: "patch",
      pathParams: ["comment_id"],
      queryParams: [],
      bodyParams: ["rich_text", "markdown"],
      path: (p) => `comments/${p.comment_id}`
    };
    exports.deleteComment = {
      method: "delete",
      pathParams: ["comment_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `comments/${p.comment_id}`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/common.js
var require_common = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/common.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/custom-emojis.js
var require_custom_emojis = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/custom-emojis.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.listCustomEmojis = void 0;
    exports.listCustomEmojis = {
      method: "get",
      pathParams: [],
      queryParams: ["start_cursor", "page_size", "name"],
      bodyParams: [],
      path: () => `custom_emojis`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/data-sources.js
var require_data_sources = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/data-sources.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.listDataSourceTemplates = exports.createDataSource = exports.queryDataSource = exports.updateDataSource = exports.getDataSource = void 0;
    exports.getDataSource = {
      method: "get",
      pathParams: ["data_source_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `data_sources/${p.data_source_id}`
    };
    exports.updateDataSource = {
      method: "patch",
      pathParams: ["data_source_id"],
      queryParams: [],
      bodyParams: ["archived", "title", "icon", "properties", "in_trash", "parent"],
      path: (p) => `data_sources/${p.data_source_id}`
    };
    exports.queryDataSource = {
      method: "post",
      pathParams: ["data_source_id"],
      queryParams: ["filter_properties"],
      bodyParams: [
        "archived",
        "sorts",
        "filter",
        "start_cursor",
        "page_size",
        "in_trash",
        "result_type"
      ],
      path: (p) => `data_sources/${p.data_source_id}/query`
    };
    exports.createDataSource = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: ["parent", "properties", "title", "icon"],
      path: () => `data_sources`
    };
    exports.listDataSourceTemplates = {
      method: "get",
      pathParams: ["data_source_id"],
      queryParams: ["name", "start_cursor", "page_size"],
      bodyParams: [],
      path: (p) => `data_sources/${p.data_source_id}/templates`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/databases.js
var require_databases = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/databases.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDatabase = exports.updateDatabase = exports.getDatabase = void 0;
    exports.getDatabase = {
      method: "get",
      pathParams: ["database_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `databases/${p.database_id}`
    };
    exports.updateDatabase = {
      method: "patch",
      pathParams: ["database_id"],
      queryParams: [],
      bodyParams: [
        "parent",
        "title",
        "description",
        "is_inline",
        "icon",
        "cover",
        "in_trash",
        "is_locked"
      ],
      path: (p) => `databases/${p.database_id}`
    };
    exports.createDatabase = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: [
        "parent",
        "title",
        "description",
        "is_inline",
        "initial_data_source",
        "icon",
        "cover"
      ],
      path: () => `databases`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/file-uploads.js
var require_file_uploads = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/file-uploads.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getFileUpload = exports.completeFileUpload = exports.sendFileUpload = exports.listFileUploads = exports.createFileUpload = void 0;
    exports.createFileUpload = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: [
        "mode",
        "filename",
        "content_type",
        "number_of_parts",
        "external_url"
      ],
      path: () => `file_uploads`
    };
    exports.listFileUploads = {
      method: "get",
      pathParams: [],
      queryParams: ["status", "start_cursor", "page_size"],
      bodyParams: [],
      path: () => `file_uploads`
    };
    exports.sendFileUpload = {
      method: "post",
      pathParams: ["file_upload_id"],
      queryParams: [],
      bodyParams: [],
      formDataParams: ["file", "part_number"],
      path: (p) => `file_uploads/${p.file_upload_id}/send`
    };
    exports.completeFileUpload = {
      method: "post",
      pathParams: ["file_upload_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `file_uploads/${p.file_upload_id}/complete`
    };
    exports.getFileUpload = {
      method: "get",
      pathParams: ["file_upload_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `file_uploads/${p.file_upload_id}`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/meeting-notes.js
var require_meeting_notes = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/meeting-notes.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.queryMeetingNotes = exports.createMeetingNote = void 0;
    exports.createMeetingNote = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: ["title", "language", "options", "source", "parent"],
      path: () => `blocks/meeting_notes`
    };
    exports.queryMeetingNotes = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: ["filter", "sort", "limit"],
      path: () => `blocks/meeting_notes/query`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/oauth.js
var require_oauth = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/oauth.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.oauthIntrospect = exports.oauthRevoke = exports.oauthToken = void 0;
    exports.oauthToken = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: [
        "grant_type",
        "code",
        "redirect_uri",
        "external_account",
        "refresh_token"
      ],
      path: () => `oauth/token`
    };
    exports.oauthRevoke = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: ["token"],
      path: () => `oauth/revoke`
    };
    exports.oauthIntrospect = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: ["token"],
      path: () => `oauth/introspect`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/pages.js
var require_pages = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/pages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.updatePageMarkdown = exports.getPageMarkdown = exports.getPageProperty = exports.movePage = exports.updatePage = exports.getPage = exports.createPage = void 0;
    exports.createPage = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: [
        "parent",
        "properties",
        "icon",
        "cover",
        "content",
        "children",
        "markdown",
        "allow_async",
        "template",
        "position"
      ],
      path: () => `pages`
    };
    exports.getPage = {
      method: "get",
      pathParams: ["page_id"],
      queryParams: ["filter_properties"],
      bodyParams: [],
      path: (p) => `pages/${p.page_id}`
    };
    exports.updatePage = {
      method: "patch",
      pathParams: ["page_id"],
      queryParams: [],
      bodyParams: [
        "archived",
        "properties",
        "icon",
        "cover",
        "is_locked",
        "template",
        "erase_content",
        "in_trash",
        "is_archived"
      ],
      path: (p) => `pages/${p.page_id}`
    };
    exports.movePage = {
      method: "post",
      pathParams: ["page_id"],
      queryParams: [],
      bodyParams: ["parent"],
      path: (p) => `pages/${p.page_id}/move`
    };
    exports.getPageProperty = {
      method: "get",
      pathParams: ["page_id", "property_id"],
      queryParams: ["start_cursor", "page_size"],
      bodyParams: [],
      path: (p) => `pages/${p.page_id}/properties/${p.property_id}`
    };
    exports.getPageMarkdown = {
      method: "get",
      pathParams: ["page_id"],
      queryParams: ["include_transcript"],
      bodyParams: [],
      path: (p) => `pages/${p.page_id}/markdown`
    };
    exports.updatePageMarkdown = {
      method: "patch",
      pathParams: ["page_id"],
      queryParams: [],
      bodyParams: [
        "allow_async",
        "type",
        "insert_content",
        "replace_content_range",
        "update_content",
        "replace_content"
      ],
      path: (p) => `pages/${p.page_id}/markdown`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/search.js
var require_search = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/search.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.search = void 0;
    exports.search = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: ["sort", "query", "start_cursor", "page_size", "filter"],
      path: () => `search`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/users.js
var require_users = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/users.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.listUsers = exports.getUser = exports.getSelf = void 0;
    exports.getSelf = {
      method: "get",
      pathParams: [],
      queryParams: [],
      bodyParams: [],
      path: () => `users/me`
    };
    exports.getUser = {
      method: "get",
      pathParams: ["user_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `users/${p.user_id}`
    };
    exports.listUsers = {
      method: "get",
      pathParams: [],
      queryParams: ["start_cursor", "page_size"],
      bodyParams: [],
      path: () => `users`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/views.js
var require_views = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/views.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.deleteViewQuery = exports.getViewQueryResults = exports.createViewQuery = exports.deleteView = exports.updateView = exports.getView = exports.createView = exports.listDatabaseViews = void 0;
    exports.listDatabaseViews = {
      method: "get",
      pathParams: [],
      queryParams: ["database_id", "data_source_id", "start_cursor", "page_size"],
      bodyParams: [],
      path: () => `views`
    };
    exports.createView = {
      method: "post",
      pathParams: [],
      queryParams: [],
      bodyParams: [],
      path: () => `views`
    };
    exports.getView = {
      method: "get",
      pathParams: ["view_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `views/${p.view_id}`
    };
    exports.updateView = {
      method: "patch",
      pathParams: ["view_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `views/${p.view_id}`
    };
    exports.deleteView = {
      method: "delete",
      pathParams: ["view_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `views/${p.view_id}`
    };
    exports.createViewQuery = {
      method: "post",
      pathParams: ["view_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `views/${p.view_id}/queries`
    };
    exports.getViewQueryResults = {
      method: "get",
      pathParams: ["view_id", "query_id"],
      queryParams: ["start_cursor", "page_size"],
      bodyParams: [],
      path: (p) => `views/${p.view_id}/queries/${p.query_id}`
    };
    exports.deleteViewQuery = {
      method: "delete",
      pathParams: ["view_id", "query_id"],
      queryParams: [],
      bodyParams: [],
      path: (p) => `views/${p.view_id}/queries/${p.query_id}`
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/webhooks.js
var require_webhooks = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints/webhooks.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints.js
var require_api_endpoints = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/api-endpoints.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_async_tasks(), exports);
    __exportStar(require_blocks(), exports);
    __exportStar(require_comments(), exports);
    __exportStar(require_common(), exports);
    __exportStar(require_custom_emojis(), exports);
    __exportStar(require_data_sources(), exports);
    __exportStar(require_databases(), exports);
    __exportStar(require_file_uploads(), exports);
    __exportStar(require_meeting_notes(), exports);
    __exportStar(require_oauth(), exports);
    __exportStar(require_pages(), exports);
    __exportStar(require_search(), exports);
    __exportStar(require_users(), exports);
    __exportStar(require_views(), exports);
    __exportStar(require_webhooks(), exports);
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/package.json
var require_package = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/package.json"(exports, module) {
    module.exports = {
      name: "@notionhq/client",
      version: "5.24.0",
      description: "A simple and easy to use client for the Notion API",
      engines: {
        node: ">=18"
      },
      homepage: "https://developers.notion.com/docs/getting-started",
      bugs: {
        url: "https://github.com/makenotion/notion-sdk-js/issues"
      },
      repository: {
        type: "git",
        url: "https://github.com/makenotion/notion-sdk-js/"
      },
      keywords: [
        "notion",
        "notionapi",
        "rest",
        "notion-api"
      ],
      main: "./build/src",
      types: "./build/src/index.d.ts",
      scripts: {
        prepare: "husky && npm run build",
        prepublishOnly: "npm run checkLoggedIn && npm run lint && npm run test",
        build: "tsc",
        prettier: "prettier --write .",
        lint: "prettier --check . && eslint . --ext .ts && cspell '**/*' ",
        test: "jest ./test",
        "check-links": "git ls-files | grep md$ | xargs -n 1 markdown-link-check",
        prebuild: "npm run clean",
        clean: "rm -rf ./build",
        checkLoggedIn: "./scripts/verifyLoggedIn.sh"
      },
      "lint-staged": {
        "*.{ts,js,json,md}": "prettier --write",
        "*.ts": "eslint --fix"
      },
      author: "",
      license: "MIT",
      files: [
        "build/package.json",
        "build/src/**"
      ],
      devDependencies: {
        "@types/jest": "29.5.14",
        "@typescript-eslint/eslint-plugin": "7.18.0",
        "@typescript-eslint/parser": "7.18.0",
        cspell: "8.17.1",
        eslint: "8.57.1",
        husky: "^9.1.7",
        jest: "29.7.0",
        "lint-staged": "^16.2.6",
        "markdown-link-check": "3.13.7",
        prettier: "3.3.3",
        "ts-jest": "29.2.5",
        typescript: "5.9.2"
      }
    };
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/Client.js
var require_Client = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/Client.js"(exports) {
    "use strict";
    var __classPrivateFieldSet = exports && exports.__classPrivateFieldSet || function(receiver, state, value, kind, f) {
      if (kind === "m") throw new TypeError("Private method is not writable");
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
      return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
    };
    var __classPrivateFieldGet = exports && exports.__classPrivateFieldGet || function(receiver, state, kind, f) {
      if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    var _Client_auth;
    var _Client_logLevel;
    var _Client_logger;
    var _Client_prefixUrl;
    var _Client_timeoutMs;
    var _Client_notionVersion;
    var _Client_fetch;
    var _Client_agent;
    var _Client_userAgent;
    var _Client_maxRetries;
    var _Client_initialRetryDelayMs;
    var _Client_maxRetryDelayMs;
    Object.defineProperty(exports, "__esModule", { value: true });
    var logging_1 = require_logging();
    var errors_1 = require_errors();
    var utils_1 = require_utils();
    var constants_1 = require_constants();
    var api_endpoints_1 = require_api_endpoints();
    var meeting_notes_1 = require_meeting_notes();
    var package_json_1 = require_package();
    var START_CURSOR_PARAM_NAME = "start_cursor";
    var Client2 = class _Client {
      constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        _Client_auth.set(this, void 0);
        _Client_logLevel.set(this, void 0);
        _Client_logger.set(this, void 0);
        _Client_prefixUrl.set(this, void 0);
        _Client_timeoutMs.set(this, void 0);
        _Client_notionVersion.set(this, void 0);
        _Client_fetch.set(this, void 0);
        _Client_agent.set(this, void 0);
        _Client_userAgent.set(this, void 0);
        _Client_maxRetries.set(this, void 0);
        _Client_initialRetryDelayMs.set(this, void 0);
        _Client_maxRetryDelayMs.set(this, void 0);
        this.asyncTasks = {
          /**
           * Retrieve an async task
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getAsyncTask);
            return this.request({
              path: api_endpoints_1.getAsyncTask.path(args),
              method: api_endpoints_1.getAsyncTask.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getAsyncTask.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getAsyncTask.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          }
        };
        this.blocks = {
          /**
           * Retrieve block
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getBlock);
            return this.request({
              path: api_endpoints_1.getBlock.path(args),
              method: api_endpoints_1.getBlock.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getBlock.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getBlock.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Update block
           */
          update: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.updateBlock);
            return this.request({
              path: api_endpoints_1.updateBlock.path(args),
              method: api_endpoints_1.updateBlock.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.updateBlock.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.updateBlock.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Delete block
           */
          delete: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.deleteBlock);
            return this.request({
              path: api_endpoints_1.deleteBlock.path(args),
              method: api_endpoints_1.deleteBlock.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.deleteBlock.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.deleteBlock.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          children: {
            /**
             * Append block children
             */
            append: (args) => {
              this.warnUnknownParams(args, api_endpoints_1.appendBlockChildren);
              return this.request({
                path: api_endpoints_1.appendBlockChildren.path(args),
                method: api_endpoints_1.appendBlockChildren.method,
                query: (0, utils_1.pick)(args, api_endpoints_1.appendBlockChildren.queryParams),
                body: (0, utils_1.pick)(args, api_endpoints_1.appendBlockChildren.bodyParams),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            },
            /**
             * Retrieve block children
             */
            list: (args) => {
              this.warnUnknownParams(args, api_endpoints_1.listBlockChildren);
              return this.request({
                path: api_endpoints_1.listBlockChildren.path(args),
                method: api_endpoints_1.listBlockChildren.method,
                query: (0, utils_1.pick)(args, api_endpoints_1.listBlockChildren.queryParams),
                body: (0, utils_1.pick)(args, api_endpoints_1.listBlockChildren.bodyParams),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            }
          },
          meetingNotes: {
            /**
             * Create a meeting note
             */
            create: (args) => {
              this.warnUnknownParams(args, meeting_notes_1.createMeetingNote);
              return this.request({
                path: meeting_notes_1.createMeetingNote.path(),
                method: meeting_notes_1.createMeetingNote.method,
                query: (0, utils_1.pick)(args, meeting_notes_1.createMeetingNote.queryParams),
                body: (0, utils_1.pick)(args, meeting_notes_1.createMeetingNote.bodyParams),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            },
            /**
             * Query meeting notes
             */
            query: (args) => {
              return this.request({
                path: meeting_notes_1.queryMeetingNotes.path(),
                method: meeting_notes_1.queryMeetingNotes.method,
                query: (0, utils_1.pick)(args, meeting_notes_1.queryMeetingNotes.queryParams),
                body: (0, utils_1.pick)(args, meeting_notes_1.queryMeetingNotes.bodyParams),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            }
          }
        };
        this.databases = {
          /**
           * Retrieve a database
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getDatabase);
            return this.request({
              path: api_endpoints_1.getDatabase.path(args),
              method: api_endpoints_1.getDatabase.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getDatabase.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getDatabase.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Create a database
           */
          create: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.createDatabase);
            return this.request({
              path: api_endpoints_1.createDatabase.path(),
              method: api_endpoints_1.createDatabase.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.createDatabase.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.createDatabase.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Update a database
           */
          update: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.updateDatabase);
            return this.request({
              path: api_endpoints_1.updateDatabase.path(args),
              method: api_endpoints_1.updateDatabase.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.updateDatabase.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.updateDatabase.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          }
        };
        this.dataSources = {
          /**
           * Retrieve a data source
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getDataSource);
            return this.request({
              path: api_endpoints_1.getDataSource.path(args),
              method: api_endpoints_1.getDataSource.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getDataSource.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getDataSource.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Query a data source
           */
          query: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.queryDataSource);
            return this.request({
              path: api_endpoints_1.queryDataSource.path(args),
              method: api_endpoints_1.queryDataSource.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.queryDataSource.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.queryDataSource.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Create a data source
           */
          create: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.createDataSource);
            return this.request({
              path: api_endpoints_1.createDataSource.path(),
              method: api_endpoints_1.createDataSource.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.createDataSource.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.createDataSource.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Update a data source
           */
          update: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.updateDataSource);
            return this.request({
              path: api_endpoints_1.updateDataSource.path(args),
              method: api_endpoints_1.updateDataSource.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.updateDataSource.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.updateDataSource.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * List page templates that are available for a data source
           */
          listTemplates: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.listDataSourceTemplates);
            return this.request({
              path: api_endpoints_1.listDataSourceTemplates.path(args),
              method: api_endpoints_1.listDataSourceTemplates.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.listDataSourceTemplates.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.listDataSourceTemplates.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          }
        };
        this.pages = {
          /**
           * Create a page
           */
          create: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.createPage);
            return this.request({
              path: api_endpoints_1.createPage.path(),
              method: api_endpoints_1.createPage.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.createPage.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.createPage.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Retrieve a page
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getPage);
            return this.request({
              path: api_endpoints_1.getPage.path(args),
              method: api_endpoints_1.getPage.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getPage.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getPage.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Update page properties
           */
          update: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.updatePage);
            return this.request({
              path: api_endpoints_1.updatePage.path(args),
              method: api_endpoints_1.updatePage.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.updatePage.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.updatePage.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Move a page
           */
          move: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.movePage);
            return this.request({
              path: api_endpoints_1.movePage.path(args),
              method: api_endpoints_1.movePage.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.movePage.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.movePage.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Retrieve a page as markdown
           */
          retrieveMarkdown: (args) => {
            return this.request({
              path: api_endpoints_1.getPageMarkdown.path(args),
              method: api_endpoints_1.getPageMarkdown.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getPageMarkdown.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getPageMarkdown.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Update a page's content as markdown
           */
          updateMarkdown: (args) => {
            return this.request({
              path: api_endpoints_1.updatePageMarkdown.path(args),
              method: api_endpoints_1.updatePageMarkdown.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.updatePageMarkdown.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.updatePageMarkdown.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          properties: {
            /**
             * Retrieve page property
             */
            retrieve: (args) => {
              this.warnUnknownParams(args, api_endpoints_1.getPageProperty);
              return this.request({
                path: api_endpoints_1.getPageProperty.path(args),
                method: api_endpoints_1.getPageProperty.method,
                query: (0, utils_1.pick)(args, api_endpoints_1.getPageProperty.queryParams),
                body: (0, utils_1.pick)(args, api_endpoints_1.getPageProperty.bodyParams),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            }
          }
        };
        this.users = {
          /**
           * Retrieve a user
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getUser);
            return this.request({
              path: api_endpoints_1.getUser.path(args),
              method: api_endpoints_1.getUser.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getUser.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getUser.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * List all users
           */
          list: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.listUsers);
            return this.request({
              path: api_endpoints_1.listUsers.path(),
              method: api_endpoints_1.listUsers.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.listUsers.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.listUsers.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Get details about bot
           */
          me: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getSelf);
            return this.request({
              path: api_endpoints_1.getSelf.path(),
              method: api_endpoints_1.getSelf.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getSelf.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getSelf.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          }
        };
        this.customEmojis = {
          /**
           * List custom emojis
           */
          list: (args) => {
            this.warnUnknownParams(args !== null && args !== void 0 ? args : {}, api_endpoints_1.listCustomEmojis);
            return this.request({
              path: api_endpoints_1.listCustomEmojis.path(),
              method: api_endpoints_1.listCustomEmojis.method,
              query: (0, utils_1.pick)(args !== null && args !== void 0 ? args : {}, api_endpoints_1.listCustomEmojis.queryParams),
              body: (0, utils_1.pick)(args !== null && args !== void 0 ? args : {}, api_endpoints_1.listCustomEmojis.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          }
        };
        this.comments = {
          /**
           * Create a comment
           */
          create: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.createComment);
            return this.request({
              path: api_endpoints_1.createComment.path(),
              method: api_endpoints_1.createComment.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.createComment.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.createComment.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * List comments
           */
          list: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.listComments);
            return this.request({
              path: api_endpoints_1.listComments.path(),
              method: api_endpoints_1.listComments.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.listComments.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.listComments.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Retrieve a comment
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getComment);
            return this.request({
              path: api_endpoints_1.getComment.path(args),
              method: api_endpoints_1.getComment.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getComment.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getComment.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Update a comment
           */
          update: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.updateComment);
            return this.request({
              path: api_endpoints_1.updateComment.path(args),
              method: api_endpoints_1.updateComment.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.updateComment.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.updateComment.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Delete a comment
           */
          delete: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.deleteComment);
            return this.request({
              path: api_endpoints_1.deleteComment.path(args),
              method: api_endpoints_1.deleteComment.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.deleteComment.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.deleteComment.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          }
        };
        this.fileUploads = {
          /**
           * Create a file upload
           */
          create: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.createFileUpload);
            return this.request({
              path: api_endpoints_1.createFileUpload.path(),
              method: api_endpoints_1.createFileUpload.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.createFileUpload.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.createFileUpload.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Retrieve a file upload
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getFileUpload);
            return this.request({
              path: api_endpoints_1.getFileUpload.path(args),
              method: api_endpoints_1.getFileUpload.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getFileUpload.queryParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * List file uploads
           */
          list: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.listFileUploads);
            return this.request({
              path: api_endpoints_1.listFileUploads.path(),
              method: api_endpoints_1.listFileUploads.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.listFileUploads.queryParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Send a file upload
           *
           * Requires a `file_upload_id`, obtained from the `id` of the Create File
           * Upload API response.
           *
           * The `file` parameter contains the raw file contents or Blob/File object
           * under `file.data`, and an optional `file.filename` string.
           *
           * Supply a stringified `part_number` parameter when using file uploads
           * in multi-part mode.
           *
           * This endpoint sends HTTP multipart/form-data instead of JSON parameters.
           */
          send: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.sendFileUpload);
            return this.request({
              path: api_endpoints_1.sendFileUpload.path(args),
              method: api_endpoints_1.sendFileUpload.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.sendFileUpload.queryParams),
              formDataParams: (0, utils_1.pick)(args, api_endpoints_1.sendFileUpload.formDataParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Complete a file upload
           */
          complete: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.completeFileUpload);
            return this.request({
              path: api_endpoints_1.completeFileUpload.path(args),
              method: api_endpoints_1.completeFileUpload.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.completeFileUpload.queryParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          }
        };
        this.views = {
          /**
           * Create a view
           */
          create: (args) => {
            return this.request({
              path: api_endpoints_1.createView.path(),
              method: api_endpoints_1.createView.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.createView.queryParams),
              body: (0, utils_1.pick)(args, [
                "data_source_id",
                "name",
                "type",
                "database_id",
                "view_id",
                "filter",
                "sorts",
                "quick_filters",
                "create_database",
                "configuration",
                "position",
                "placement"
              ]),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Retrieve a view
           */
          retrieve: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.getView);
            return this.request({
              path: api_endpoints_1.getView.path(args),
              method: api_endpoints_1.getView.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.getView.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.getView.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Update a view
           */
          update: (args) => {
            return this.request({
              path: api_endpoints_1.updateView.path(args),
              method: api_endpoints_1.updateView.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.updateView.queryParams),
              body: (0, utils_1.pick)(args, [
                "name",
                "filter",
                "sorts",
                "quick_filters",
                "configuration"
              ]),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * Delete a view
           */
          delete: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.deleteView);
            return this.request({
              path: api_endpoints_1.deleteView.path(args),
              method: api_endpoints_1.deleteView.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.deleteView.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.deleteView.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          /**
           * List views for a database
           */
          list: (args) => {
            this.warnUnknownParams(args, api_endpoints_1.listDatabaseViews);
            return this.request({
              path: api_endpoints_1.listDatabaseViews.path(),
              method: api_endpoints_1.listDatabaseViews.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.listDatabaseViews.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.listDatabaseViews.bodyParams),
              auth: args === null || args === void 0 ? void 0 : args.auth
            });
          },
          queries: {
            /**
             * Create a view query
             */
            create: (args) => {
              return this.request({
                path: api_endpoints_1.createViewQuery.path(args),
                method: api_endpoints_1.createViewQuery.method,
                query: (0, utils_1.pick)(args, api_endpoints_1.createViewQuery.queryParams),
                body: (0, utils_1.pick)(args, ["page_size"]),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            },
            /**
             * Get view query results
             */
            results: (args) => {
              this.warnUnknownParams(args, api_endpoints_1.getViewQueryResults);
              return this.request({
                path: api_endpoints_1.getViewQueryResults.path(args),
                method: api_endpoints_1.getViewQueryResults.method,
                query: (0, utils_1.pick)(args, api_endpoints_1.getViewQueryResults.queryParams),
                body: (0, utils_1.pick)(args, api_endpoints_1.getViewQueryResults.bodyParams),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            },
            /**
             * Delete a view query
             */
            delete: (args) => {
              this.warnUnknownParams(args, api_endpoints_1.deleteViewQuery);
              return this.request({
                path: api_endpoints_1.deleteViewQuery.path(args),
                method: api_endpoints_1.deleteViewQuery.method,
                query: (0, utils_1.pick)(args, api_endpoints_1.deleteViewQuery.queryParams),
                body: (0, utils_1.pick)(args, api_endpoints_1.deleteViewQuery.bodyParams),
                auth: args === null || args === void 0 ? void 0 : args.auth
              });
            }
          }
        };
        this.search = (args) => {
          this.warnUnknownParams(args, api_endpoints_1.search);
          return this.request({
            path: api_endpoints_1.search.path(),
            method: api_endpoints_1.search.method,
            query: (0, utils_1.pick)(args, api_endpoints_1.search.queryParams),
            body: (0, utils_1.pick)(args, api_endpoints_1.search.bodyParams),
            auth: args === null || args === void 0 ? void 0 : args.auth
          });
        };
        this.oauth = {
          /**
           * Get token
           */
          token: (args) => {
            return this.request({
              path: api_endpoints_1.oauthToken.path(),
              method: api_endpoints_1.oauthToken.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.oauthToken.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.oauthToken.bodyParams),
              auth: {
                client_id: args.client_id,
                client_secret: args.client_secret
              }
            });
          },
          /**
           * Introspect token
           */
          introspect: (args) => {
            return this.request({
              path: api_endpoints_1.oauthIntrospect.path(),
              method: api_endpoints_1.oauthIntrospect.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.oauthIntrospect.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.oauthIntrospect.bodyParams),
              auth: {
                client_id: args.client_id,
                client_secret: args.client_secret
              }
            });
          },
          /**
           * Revoke token
           */
          revoke: (args) => {
            return this.request({
              path: api_endpoints_1.oauthRevoke.path(),
              method: api_endpoints_1.oauthRevoke.method,
              query: (0, utils_1.pick)(args, api_endpoints_1.oauthRevoke.queryParams),
              body: (0, utils_1.pick)(args, api_endpoints_1.oauthRevoke.bodyParams),
              auth: {
                client_id: args.client_id,
                client_secret: args.client_secret
              }
            });
          }
        };
        __classPrivateFieldSet(this, _Client_auth, options === null || options === void 0 ? void 0 : options.auth, "f");
        __classPrivateFieldSet(this, _Client_logLevel, (_a = options === null || options === void 0 ? void 0 : options.logLevel) !== null && _a !== void 0 ? _a : logging_1.LogLevel.WARN, "f");
        __classPrivateFieldSet(this, _Client_logger, (_b = options === null || options === void 0 ? void 0 : options.logger) !== null && _b !== void 0 ? _b : (0, logging_1.makeConsoleLogger)(package_json_1.name), "f");
        __classPrivateFieldSet(this, _Client_prefixUrl, `${(_c = options === null || options === void 0 ? void 0 : options.baseUrl) !== null && _c !== void 0 ? _c : constants_1.DEFAULT_BASE_URL}/v1/`, "f");
        __classPrivateFieldSet(this, _Client_timeoutMs, (_d = options === null || options === void 0 ? void 0 : options.timeoutMs) !== null && _d !== void 0 ? _d : constants_1.DEFAULT_TIMEOUT_MS, "f");
        __classPrivateFieldSet(this, _Client_notionVersion, (_e = options === null || options === void 0 ? void 0 : options.notionVersion) !== null && _e !== void 0 ? _e : _Client.defaultNotionVersion, "f");
        __classPrivateFieldSet(this, _Client_fetch, (_f = options === null || options === void 0 ? void 0 : options.fetch) !== null && _f !== void 0 ? _f : fetch.bind(globalThis), "f");
        __classPrivateFieldSet(this, _Client_agent, options === null || options === void 0 ? void 0 : options.agent, "f");
        __classPrivateFieldSet(this, _Client_userAgent, `notionhq-client/${package_json_1.version}`, "f");
        if ((options === null || options === void 0 ? void 0 : options.retry) === false) {
          __classPrivateFieldSet(this, _Client_maxRetries, 0, "f");
          __classPrivateFieldSet(this, _Client_initialRetryDelayMs, 0, "f");
          __classPrivateFieldSet(this, _Client_maxRetryDelayMs, 0, "f");
        } else {
          __classPrivateFieldSet(this, _Client_maxRetries, (_h = (_g = options === null || options === void 0 ? void 0 : options.retry) === null || _g === void 0 ? void 0 : _g.maxRetries) !== null && _h !== void 0 ? _h : constants_1.DEFAULT_MAX_RETRIES, "f");
          __classPrivateFieldSet(this, _Client_initialRetryDelayMs, (_k = (_j = options === null || options === void 0 ? void 0 : options.retry) === null || _j === void 0 ? void 0 : _j.initialRetryDelayMs) !== null && _k !== void 0 ? _k : constants_1.DEFAULT_INITIAL_RETRY_DELAY_MS, "f");
          __classPrivateFieldSet(this, _Client_maxRetryDelayMs, (_m = (_l = options === null || options === void 0 ? void 0 : options.retry) === null || _l === void 0 ? void 0 : _l.maxRetryDelayMs) !== null && _m !== void 0 ? _m : constants_1.DEFAULT_MAX_RETRY_DELAY_MS, "f");
        }
      }
      /**
       * Sends a request.
       */
      async request(args) {
        const { path, method, query, body, formDataParams, auth } = args;
        (0, errors_1.validateRequestPath)(path);
        this.log(logging_1.LogLevel.INFO, "request start", { method, path });
        const url = this.buildRequestUrl(path, query);
        const bodyAsJsonString = this.serializeBody(body);
        const headers = this.buildRequestHeaders(args.headers, auth, bodyAsJsonString);
        const formData = this.buildFormData(formDataParams, headers);
        return this.executeWithRetry({
          url,
          method,
          path,
          headers,
          body: bodyAsJsonString !== null && bodyAsJsonString !== void 0 ? bodyAsJsonString : formData
        });
      }
      /**
       * Builds the full URL with query parameters.
       */
      buildRequestUrl(path, query) {
        const url = new URL(`${__classPrivateFieldGet(this, _Client_prefixUrl, "f")}${path}`);
        if (query) {
          for (const [key, value] of Object.entries(query)) {
            if (value !== void 0 && value !== null) {
              if (Array.isArray(value)) {
                for (const val of value) {
                  url.searchParams.append(key, decodeURIComponent(val));
                }
              } else {
                url.searchParams.append(key, String(value));
              }
            }
          }
        }
        return url;
      }
      /**
       * Serializes the request body to JSON string if non-empty.
       */
      serializeBody(body) {
        if (!body) {
          return void 0;
        }
        const serializedBody = { ...body };
        if (serializedBody[START_CURSOR_PARAM_NAME] === null) {
          delete serializedBody[START_CURSOR_PARAM_NAME];
        }
        if (Object.entries(serializedBody).length === 0) {
          return void 0;
        }
        return JSON.stringify(serializedBody);
      }
      /**
       * Builds the request headers including auth and content-type.
       */
      buildRequestHeaders(customHeaders, auth, bodyAsJsonString) {
        const authorizationHeader = this.buildAuthHeader(auth);
        const headers = {
          ...customHeaders,
          ...authorizationHeader,
          "Notion-Version": __classPrivateFieldGet(this, _Client_notionVersion, "f"),
          "user-agent": __classPrivateFieldGet(this, _Client_userAgent, "f")
        };
        if (bodyAsJsonString !== void 0) {
          headers["content-type"] = "application/json";
        }
        return headers;
      }
      /**
       * Builds the authorization header based on auth type.
       */
      buildAuthHeader(auth) {
        if (typeof auth === "object") {
          const unencodedCredential = `${auth.client_id}:${auth.client_secret}`;
          const encodedCredential = Buffer.from(unencodedCredential).toString("base64");
          return { authorization: `Basic ${encodedCredential}` };
        }
        return this.authAsHeaders(auth);
      }
      /**
       * Builds FormData from form parameters if provided.
       * Also removes content-type header to let fetch set the boundary.
       */
      buildFormData(formDataParams, headers) {
        if (!formDataParams) {
          return void 0;
        }
        delete headers["content-type"];
        const formData = new FormData();
        for (const [key, value] of Object.entries(formDataParams)) {
          if (typeof value === "string") {
            formData.append(key, value);
          } else if (typeof value === "object") {
            formData.append(key, typeof value.data === "object" ? value.data : new Blob([value.data]), value.filename);
          }
        }
        return formData;
      }
      /**
       * Executes the request with retry logic.
       */
      async executeWithRetry(args) {
        const { url, method, path, headers, body } = args;
        let attempt = 0;
        while (true) {
          try {
            return await this.executeSingleRequest({
              url,
              method,
              path,
              headers,
              body
            });
          } catch (error) {
            if (!(0, errors_1.isNotionClientError)(error)) {
              throw error;
            }
            this.logRequestError(error, attempt);
            if (attempt < __classPrivateFieldGet(this, _Client_maxRetries, "f") && this.canRetry(error, method)) {
              const delayMs = this.calculateRetryDelay(error, attempt);
              this.log(logging_1.LogLevel.INFO, "retrying request", {
                method,
                path,
                attempt: attempt + 1,
                delayMs
              });
              await this.sleep(delayMs);
              attempt++;
              continue;
            }
            throw error;
          }
        }
      }
      /**
       * Executes a single HTTP request (no retry).
       */
      async executeSingleRequest(args) {
        const { url, method, path, headers, body } = args;
        const response = await errors_1.RequestTimeoutError.rejectAfterTimeout(__classPrivateFieldGet(this, _Client_fetch, "f").call(this, url.toString(), {
          method: method.toUpperCase(),
          headers,
          body,
          agent: __classPrivateFieldGet(this, _Client_agent, "f")
        }), __classPrivateFieldGet(this, _Client_timeoutMs, "f"));
        const responseText = await response.text();
        if (!response.ok) {
          throw (0, errors_1.buildRequestError)(response, responseText);
        }
        const responseJson = JSON.parse(responseText);
        this.log(logging_1.LogLevel.INFO, "request success", {
          method,
          path,
          ...this.extractRequestId(responseJson)
        });
        return responseJson;
      }
      /**
       * Logs a request error with appropriate detail level.
       */
      logRequestError(error, attempt) {
        this.log(logging_1.LogLevel.WARN, "request fail", {
          code: error.code,
          message: error.message,
          attempt,
          ...this.extractRequestId(error)
        });
        if ((0, errors_1.isHTTPResponseError)(error)) {
          this.log(logging_1.LogLevel.DEBUG, "failed response body", {
            body: error.body
          });
        }
      }
      /**
       * Extracts request_id from an object if present.
       */
      extractRequestId(obj) {
        if (obj && typeof obj === "object" && "request_id" in obj && typeof obj.request_id === "string") {
          return { requestId: obj.request_id };
        }
        return {};
      }
      /**
       * Determines if an error can be retried based on its error code and method.
       * Rate limits (429) and service overloads (529) are always retryable since
       * the server explicitly asks us to retry. Server errors (500, 503) are only
       * retried for idempotent methods (GET, DELETE) to avoid duplicate side
       * effects.
       */
      canRetry(error, method) {
        if (!errors_1.APIResponseError.isAPIResponseError(error)) {
          return false;
        }
        if (error.code === errors_1.APIErrorCode.RateLimited || error.code === errors_1.APIErrorCode.ServiceOverload) {
          return true;
        }
        const isIdempotent = method === "get" || method === "delete";
        if (isIdempotent) {
          return error.code === errors_1.APIErrorCode.InternalServerError || error.code === errors_1.APIErrorCode.ServiceUnavailable;
        }
        return false;
      }
      /**
       * Calculates the delay before the next retry attempt.
       * Uses retry-after header if present, otherwise exponential back-off with
       * jitter.
       */
      calculateRetryDelay(error, attempt) {
        if (errors_1.APIResponseError.isAPIResponseError(error)) {
          const retryAfterMs2 = this.parseRetryAfterHeader(error.headers);
          if (retryAfterMs2 !== void 0) {
            return Math.min(retryAfterMs2, __classPrivateFieldGet(this, _Client_maxRetryDelayMs, "f"));
          }
        }
        const baseDelay = __classPrivateFieldGet(this, _Client_initialRetryDelayMs, "f") * Math.pow(2, attempt);
        const jitter = Math.random();
        return Math.min(baseDelay * jitter + baseDelay / 2, __classPrivateFieldGet(this, _Client_maxRetryDelayMs, "f"));
      }
      /**
       * Parses the retry-after header value.
       * Supports both delta-seconds (e.g., "120") and HTTP-date formats.
       * Returns the delay in milliseconds, or undefined if not present or invalid.
       */
      parseRetryAfterHeader(headers) {
        const retryAfterValue = (0, errors_1.getResponseHeader)(headers, "retry-after");
        if (!retryAfterValue) {
          return void 0;
        }
        const seconds = parseInt(retryAfterValue, 10);
        if (!isNaN(seconds) && seconds >= 0) {
          return seconds * 1e3;
        }
        const date = Date.parse(retryAfterValue);
        if (!isNaN(date)) {
          const delayMs = date - Date.now();
          return delayMs > 0 ? delayMs : 0;
        }
        return void 0;
      }
      sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      /**
       * Logs a warning when the caller passes parameters that are not recognized
       * by the endpoint definition. This helps catch typos and renamed parameters
       * (e.g. `archived` vs `in_trash` for `databases.update`) that would
       * otherwise be silently dropped by `pick()`.
       */
      warnUnknownParams(args, endpoint2) {
        var _a;
        if (!args || typeof args !== "object")
          return;
        const unknownKeys = (0, utils_1.getUnknownParams)(args, endpoint2);
        if (unknownKeys.length > 0) {
          this.log(logging_1.LogLevel.WARN, "unknown parameters were ignored", {
            unknownParams: unknownKeys,
            knownParams: [
              ...endpoint2.pathParams,
              ...endpoint2.queryParams,
              ...endpoint2.bodyParams,
              ...(_a = endpoint2.formDataParams) !== null && _a !== void 0 ? _a : []
            ]
          });
        }
      }
      /**
       * Emits a log message to the console.
       *
       * @param level The level for this message
       * @param args Arguments to send to the console
       */
      log(level, message, extraInfo) {
        if ((0, logging_1.logLevelSeverity)(level) >= (0, logging_1.logLevelSeverity)(__classPrivateFieldGet(this, _Client_logLevel, "f"))) {
          __classPrivateFieldGet(this, _Client_logger, "f").call(this, level, message, extraInfo);
        }
      }
      /**
       * Transforms an API key or access token into a headers object suitable for an HTTP request.
       *
       * This method uses the instance's value as the default when the input is undefined. If neither are defined, it returns
       * an empty object
       *
       * @param auth API key or access token
       * @returns headers key-value object
       */
      authAsHeaders(auth) {
        const headers = {};
        const authHeaderValue = auth !== null && auth !== void 0 ? auth : __classPrivateFieldGet(this, _Client_auth, "f");
        if (authHeaderValue !== void 0) {
          headers["authorization"] = `Bearer ${authHeaderValue}`;
        }
        return headers;
      }
    };
    _Client_auth = /* @__PURE__ */ new WeakMap(), _Client_logLevel = /* @__PURE__ */ new WeakMap(), _Client_logger = /* @__PURE__ */ new WeakMap(), _Client_prefixUrl = /* @__PURE__ */ new WeakMap(), _Client_timeoutMs = /* @__PURE__ */ new WeakMap(), _Client_notionVersion = /* @__PURE__ */ new WeakMap(), _Client_fetch = /* @__PURE__ */ new WeakMap(), _Client_agent = /* @__PURE__ */ new WeakMap(), _Client_userAgent = /* @__PURE__ */ new WeakMap(), _Client_maxRetries = /* @__PURE__ */ new WeakMap(), _Client_initialRetryDelayMs = /* @__PURE__ */ new WeakMap(), _Client_maxRetryDelayMs = /* @__PURE__ */ new WeakMap();
    Client2.defaultNotionVersion = "2025-09-03";
    exports.default = Client2;
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/helpers.js
var require_helpers = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/helpers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.iteratePaginatedAPI = iteratePaginatedAPI;
    exports.collectPaginatedAPI = collectPaginatedAPI;
    exports.iterateDataSourceTemplates = iterateDataSourceTemplates;
    exports.collectDataSourceTemplates = collectDataSourceTemplates;
    exports.iterateAllDataSourceRows = iterateAllDataSourceRows;
    exports.collectAllDataSourceRows = collectAllDataSourceRows;
    exports.isFullBlock = isFullBlock;
    exports.isFullPage = isFullPage2;
    exports.isFullDataSource = isFullDataSource;
    exports.isFullDatabase = isFullDatabase;
    exports.isFullPageOrDataSource = isFullPageOrDataSource;
    exports.isFullUser = isFullUser;
    exports.isFullComment = isFullComment;
    exports.isFullView = isFullView;
    exports.isTextRichTextItemResponse = isTextRichTextItemResponse;
    exports.isEquationRichTextItemResponse = isEquationRichTextItemResponse;
    exports.isMentionRichTextItemResponse = isMentionRichTextItemResponse;
    exports.extractNotionId = extractNotionId;
    exports.extractDatabaseId = extractDatabaseId;
    exports.extractPageId = extractPageId;
    exports.extractBlockId = extractBlockId;
    async function* iteratePaginatedAPI(listFn, firstPageArgs) {
      let nextCursor = firstPageArgs.start_cursor;
      do {
        const response = await listFn({
          ...firstPageArgs,
          start_cursor: nextCursor
        });
        yield* response.results;
        nextCursor = response.next_cursor;
      } while (nextCursor);
    }
    async function collectPaginatedAPI(listFn, firstPageArgs) {
      const results = [];
      for await (const item of iteratePaginatedAPI(listFn, firstPageArgs)) {
        results.push(item);
      }
      return results;
    }
    async function* iterateDataSourceTemplates(client, args) {
      let nextCursor = args.start_cursor;
      do {
        const response = await client.dataSources.listTemplates({
          ...args,
          start_cursor: nextCursor
        });
        yield* response.templates;
        nextCursor = response.next_cursor;
      } while (nextCursor);
    }
    async function collectDataSourceTemplates(client, args) {
      const results = [];
      for await (const template of iterateDataSourceTemplates(client, args)) {
        results.push(template);
      }
      return results;
    }
    async function* iterateAllDataSourceRows(client, args) {
      var _a, _b;
      const seenRowIds = /* @__PURE__ */ new Set();
      let windowStart = void 0;
      for (; ; ) {
        let limitReached = false;
        let lastCreatedTime = void 0;
        let cursor = void 0;
        do {
          const response = await client.dataSources.query({
            ...args,
            sorts: [{ timestamp: "created_time", direction: "ascending" }],
            filter: createdTimeLowerBound(args.filter, windowStart),
            start_cursor: cursor
          });
          for (const row of response.results) {
            if (isFullPageOrDataSource(row)) {
              lastCreatedTime = row.created_time;
            }
            if (!seenRowIds.has(row.id)) {
              seenRowIds.add(row.id);
              yield row;
            }
          }
          if (((_a = response.request_status) === null || _a === void 0 ? void 0 : _a.type) === "incomplete") {
            limitReached = true;
          }
          cursor = (_b = response.next_cursor) !== null && _b !== void 0 ? _b : void 0;
        } while (cursor);
        if (!limitReached) {
          return;
        }
        if (lastCreatedTime === void 0 || lastCreatedTime === windowStart) {
          throw new Error(`iterateAllDataSourceRows cannot make progress: the per-query result limit was reached but the created_time window could not advance past ${String(lastCreatedTime)}. More rows share this timestamp than the limit allows. Add a filter to narrow the query.`);
        }
        windowStart = lastCreatedTime;
      }
    }
    async function collectAllDataSourceRows(client, args) {
      const rows = [];
      for await (const row of iterateAllDataSourceRows(client, args)) {
        rows.push(row);
      }
      return rows;
    }
    function createdTimeLowerBound(filter, windowStart) {
      if (windowStart === void 0) {
        return filter;
      }
      const bound = {
        timestamp: "created_time",
        created_time: { on_or_after: windowStart }
      };
      if (filter === void 0) {
        return bound;
      }
      if ("and" in filter) {
        return { and: [...filter.and, bound] };
      }
      return { and: [filter, bound] };
    }
    function isFullBlock(response) {
      return response.object === "block" && "type" in response;
    }
    function isFullPage2(response) {
      return response.object === "page" && "url" in response;
    }
    function isFullDataSource(response) {
      return response.object === "data_source";
    }
    function isFullDatabase(response) {
      return response.object === "database";
    }
    function isFullPageOrDataSource(response) {
      if (response.object === "data_source") {
        return isFullDataSource(response);
      } else {
        return isFullPage2(response);
      }
    }
    function isFullUser(response) {
      return "type" in response;
    }
    function isFullComment(response) {
      return "created_by" in response;
    }
    function isFullView(response) {
      return "type" in response;
    }
    function isTextRichTextItemResponse(richText2) {
      return richText2.type === "text";
    }
    function isEquationRichTextItemResponse(richText2) {
      return richText2.type === "equation";
    }
    function isMentionRichTextItemResponse(richText2) {
      return richText2.type === "mention";
    }
    function extractNotionId(urlOrId) {
      if (!urlOrId || typeof urlOrId !== "string") {
        return null;
      }
      const trimmed = urlOrId.trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(trimmed)) {
        return trimmed.toLowerCase();
      }
      const compactUuidRegex = /^[0-9a-f]{32}$/i;
      if (compactUuidRegex.test(trimmed)) {
        return formatUuid(trimmed);
      }
      const pathMatch = trimmed.match(/\/[^/?#]*-([0-9a-f]{32})(?:[/?#]|$)/i);
      if (pathMatch && pathMatch[1]) {
        return formatUuid(pathMatch[1]);
      }
      const queryMatch = trimmed.match(/[?&](?:p|page_id|database_id)=([0-9a-f]{32})/i);
      if (queryMatch && queryMatch[1]) {
        return formatUuid(queryMatch[1]);
      }
      const anyMatch = trimmed.match(/([0-9a-f]{32})/i);
      if (anyMatch && anyMatch[1]) {
        return formatUuid(anyMatch[1]);
      }
      return null;
    }
    function formatUuid(compactId) {
      const clean = compactId.toLowerCase();
      return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
    }
    function extractDatabaseId(databaseUrl) {
      return extractNotionId(databaseUrl);
    }
    function extractPageId(pageUrl2) {
      return extractNotionId(pageUrl2);
    }
    function extractBlockId(urlWithBlock) {
      if (!urlWithBlock || typeof urlWithBlock !== "string") {
        return null;
      }
      const blockMatch = urlWithBlock.match(/#(?:block-)?([0-9a-f]{32})/i);
      if (blockMatch && blockMatch[1]) {
        return formatUuid(blockMatch[1]);
      }
      return null;
    }
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/webhooks.js
var require_webhooks2 = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/webhooks.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.verifyWebhookSignature = verifyWebhookSignature;
    exports.signWebhookPayload = signWebhookPayload;
    var SIGNATURE_PREFIX = "sha256=";
    var SHA256_HEX_LENGTH = 64;
    async function verifyWebhookSignature(args) {
      const { body, signature, verificationToken } = args;
      if (typeof signature !== "string")
        return false;
      if (!signature.startsWith(SIGNATURE_PREFIX))
        return false;
      const providedHex = signature.slice(SIGNATURE_PREFIX.length).toLowerCase();
      if (providedHex.length !== SHA256_HEX_LENGTH)
        return false;
      if (!/^[0-9a-f]+$/.test(providedHex))
        return false;
      const computedHex = await computeHmacSha256Hex(verificationToken, body);
      return timingSafeEqualHex(providedHex, computedHex);
    }
    async function signWebhookPayload(args) {
      const hex = await computeHmacSha256Hex(args.verificationToken, args.body);
      return `${SIGNATURE_PREFIX}${hex}`;
    }
    async function computeHmacSha256Hex(key, body) {
      const subtle = await getSubtle();
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(key);
      const bodyBytes = typeof body === "string" ? encoder.encode(body) : Uint8Array.from(body);
      const cryptoKey = await subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const signatureBuffer = await subtle.sign("HMAC", cryptoKey, bodyBytes);
      return bytesToHex(new Uint8Array(signatureBuffer));
    }
    var cachedSubtle;
    async function getSubtle() {
      var _a, _b;
      if (cachedSubtle)
        return cachedSubtle;
      const fromGlobal = (_a = globalThis.crypto) === null || _a === void 0 ? void 0 : _a.subtle;
      if (fromGlobal) {
        cachedSubtle = fromGlobal;
        return cachedSubtle;
      }
      try {
        const nodeCrypto = __require("crypto");
        if ((_b = nodeCrypto.webcrypto) === null || _b === void 0 ? void 0 : _b.subtle) {
          cachedSubtle = nodeCrypto.webcrypto.subtle;
          return cachedSubtle;
        }
      } catch {
      }
      throw new Error("verifyWebhookSignature requires Web Crypto support (globalThis.crypto.subtle or node:crypto.webcrypto). Upgrade to a runtime that provides one of them.");
    }
    function bytesToHex(bytes) {
      let hex = "";
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, "0");
      }
      return hex;
    }
    function timingSafeEqualHex(a, b) {
      if (a.length !== b.length)
        return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return diff === 0;
    }
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/meeting-notes.js
var require_meeting_notes2 = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/meeting-notes.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.meetingNotesFilterableProperties = void 0;
    exports.meetingNotesFilterableProperties = [
      "title",
      "created_time",
      "last_edited_time",
      "created_by",
      "last_edited_by",
      "attendees"
    ];
  }
});

// ../../vorn-connectors/node_modules/@notionhq/client/build/src/index.js
var require_src = __commonJS({
  "../../vorn-connectors/node_modules/@notionhq/client/build/src/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.meetingNotesFilterableProperties = exports.signWebhookPayload = exports.verifyWebhookSignature = exports.extractBlockId = exports.extractPageId = exports.extractDatabaseId = exports.extractNotionId = exports.isFullPageOrDataSource = exports.isFullView = exports.isFullComment = exports.isFullUser = exports.isFullPage = exports.isFullDatabase = exports.isFullDataSource = exports.isFullBlock = exports.collectAllDataSourceRows = exports.iterateAllDataSourceRows = exports.iterateDataSourceTemplates = exports.collectDataSourceTemplates = exports.iteratePaginatedAPI = exports.collectPaginatedAPI = exports.MIN_VIEW_COLUMN_WIDTH = exports.DEFAULT_MAX_RETRY_DELAY_MS = exports.DEFAULT_INITIAL_RETRY_DELAY_MS = exports.DEFAULT_MAX_RETRIES = exports.DEFAULT_TIMEOUT_MS = exports.DEFAULT_BASE_URL = exports.isHTTPResponseError = exports.isNotionClientError = exports.InvalidPathParameterError = exports.RequestTimeoutError = exports.UnknownHTTPResponseError = exports.APIResponseError = exports.ClientErrorCode = exports.APIErrorCode = exports.LogLevel = exports.Client = void 0;
    var Client_1 = require_Client();
    Object.defineProperty(exports, "Client", { enumerable: true, get: function() {
      return Client_1.default;
    } });
    var logging_1 = require_logging();
    Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function() {
      return logging_1.LogLevel;
    } });
    var errors_1 = require_errors();
    Object.defineProperty(exports, "APIErrorCode", { enumerable: true, get: function() {
      return errors_1.APIErrorCode;
    } });
    Object.defineProperty(exports, "ClientErrorCode", { enumerable: true, get: function() {
      return errors_1.ClientErrorCode;
    } });
    Object.defineProperty(exports, "APIResponseError", { enumerable: true, get: function() {
      return errors_1.APIResponseError;
    } });
    Object.defineProperty(exports, "UnknownHTTPResponseError", { enumerable: true, get: function() {
      return errors_1.UnknownHTTPResponseError;
    } });
    Object.defineProperty(exports, "RequestTimeoutError", { enumerable: true, get: function() {
      return errors_1.RequestTimeoutError;
    } });
    Object.defineProperty(exports, "InvalidPathParameterError", { enumerable: true, get: function() {
      return errors_1.InvalidPathParameterError;
    } });
    Object.defineProperty(exports, "isNotionClientError", { enumerable: true, get: function() {
      return errors_1.isNotionClientError;
    } });
    Object.defineProperty(exports, "isHTTPResponseError", { enumerable: true, get: function() {
      return errors_1.isHTTPResponseError;
    } });
    var constants_1 = require_constants();
    Object.defineProperty(exports, "DEFAULT_BASE_URL", { enumerable: true, get: function() {
      return constants_1.DEFAULT_BASE_URL;
    } });
    Object.defineProperty(exports, "DEFAULT_TIMEOUT_MS", { enumerable: true, get: function() {
      return constants_1.DEFAULT_TIMEOUT_MS;
    } });
    Object.defineProperty(exports, "DEFAULT_MAX_RETRIES", { enumerable: true, get: function() {
      return constants_1.DEFAULT_MAX_RETRIES;
    } });
    Object.defineProperty(exports, "DEFAULT_INITIAL_RETRY_DELAY_MS", { enumerable: true, get: function() {
      return constants_1.DEFAULT_INITIAL_RETRY_DELAY_MS;
    } });
    Object.defineProperty(exports, "DEFAULT_MAX_RETRY_DELAY_MS", { enumerable: true, get: function() {
      return constants_1.DEFAULT_MAX_RETRY_DELAY_MS;
    } });
    Object.defineProperty(exports, "MIN_VIEW_COLUMN_WIDTH", { enumerable: true, get: function() {
      return constants_1.MIN_VIEW_COLUMN_WIDTH;
    } });
    var helpers_1 = require_helpers();
    Object.defineProperty(exports, "collectPaginatedAPI", { enumerable: true, get: function() {
      return helpers_1.collectPaginatedAPI;
    } });
    Object.defineProperty(exports, "iteratePaginatedAPI", { enumerable: true, get: function() {
      return helpers_1.iteratePaginatedAPI;
    } });
    Object.defineProperty(exports, "collectDataSourceTemplates", { enumerable: true, get: function() {
      return helpers_1.collectDataSourceTemplates;
    } });
    Object.defineProperty(exports, "iterateDataSourceTemplates", { enumerable: true, get: function() {
      return helpers_1.iterateDataSourceTemplates;
    } });
    Object.defineProperty(exports, "iterateAllDataSourceRows", { enumerable: true, get: function() {
      return helpers_1.iterateAllDataSourceRows;
    } });
    Object.defineProperty(exports, "collectAllDataSourceRows", { enumerable: true, get: function() {
      return helpers_1.collectAllDataSourceRows;
    } });
    Object.defineProperty(exports, "isFullBlock", { enumerable: true, get: function() {
      return helpers_1.isFullBlock;
    } });
    Object.defineProperty(exports, "isFullDataSource", { enumerable: true, get: function() {
      return helpers_1.isFullDataSource;
    } });
    Object.defineProperty(exports, "isFullDatabase", { enumerable: true, get: function() {
      return helpers_1.isFullDatabase;
    } });
    Object.defineProperty(exports, "isFullPage", { enumerable: true, get: function() {
      return helpers_1.isFullPage;
    } });
    Object.defineProperty(exports, "isFullUser", { enumerable: true, get: function() {
      return helpers_1.isFullUser;
    } });
    Object.defineProperty(exports, "isFullComment", { enumerable: true, get: function() {
      return helpers_1.isFullComment;
    } });
    Object.defineProperty(exports, "isFullView", { enumerable: true, get: function() {
      return helpers_1.isFullView;
    } });
    Object.defineProperty(exports, "isFullPageOrDataSource", { enumerable: true, get: function() {
      return helpers_1.isFullPageOrDataSource;
    } });
    Object.defineProperty(exports, "extractNotionId", { enumerable: true, get: function() {
      return helpers_1.extractNotionId;
    } });
    Object.defineProperty(exports, "extractDatabaseId", { enumerable: true, get: function() {
      return helpers_1.extractDatabaseId;
    } });
    Object.defineProperty(exports, "extractPageId", { enumerable: true, get: function() {
      return helpers_1.extractPageId;
    } });
    Object.defineProperty(exports, "extractBlockId", { enumerable: true, get: function() {
      return helpers_1.extractBlockId;
    } });
    var webhooks_1 = require_webhooks2();
    Object.defineProperty(exports, "verifyWebhookSignature", { enumerable: true, get: function() {
      return webhooks_1.verifyWebhookSignature;
    } });
    Object.defineProperty(exports, "signWebhookPayload", { enumerable: true, get: function() {
      return webhooks_1.signWebhookPayload;
    } });
    var meeting_notes_1 = require_meeting_notes2();
    Object.defineProperty(exports, "meetingNotesFilterableProperties", { enumerable: true, get: function() {
      return meeting_notes_1.meetingNotesFilterableProperties;
    } });
  }
});

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

// notion/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  connector: () => notionConnector,
  createNotionConnector: () => createNotionConnector,
  default: () => index_default,
  notionConnector: () => notionConnector
});
var import_client = __toESM(require_src(), 1);
import { realpathSync } from "fs";
import { fileURLToPath } from "url";
var NOTION_VERSION = "2025-09-03";
var MAX_PAGE_SIZE = 100;
var MAX_BLOCKS_PER_CREATE = 100;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function normalizeId(value, label = "id") {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) throw new Error(`${label} is required`);
  const withoutQuery = trimmed.split("?")[0];
  const candidate = withoutQuery.split("/").pop() ?? "";
  const hex = (candidate.match(/[0-9a-f]{32}/i) ?? [])[0];
  if (hex) {
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
  }
  if (UUID_RE.test(candidate)) return candidate.toLowerCase();
  throw new Error(
    `${label} does not look like a Notion id: ${trimmed}. Paste the page or database URL, or the 32-character id from it.`
  );
}
function explainNotionError(error, target) {
  const err = error ?? {};
  const status = typeof err.status === "number" ? err.status : void 0;
  const detail = err.message ?? String(error);
  if (status === 404) {
    return new Error(
      `Notion returned 404 for ${target}. The token is valid but this has not been shared with the connection \u2014 open it in Notion, \u2022\u2022\u2022 \u2192 Add connections, and pick this integration. (${detail})`
    );
  }
  if (status === 401) {
    return new Error(
      `Notion rejected the token (401) for ${target}. Create a new integration token and paste it into NOTION_TOKEN. (${detail})`
    );
  }
  if (status === 403) {
    return new Error(
      `Notion refused ${target} (403). This is a capabilities problem, not a sharing one: the integration needs read, update and insert content capabilities, and "update content" alone cannot create pages. (${detail})`
    );
  }
  if (status === 429) {
    return new Error(
      `Notion rate-limited ${target} (429). The limit is shared across every integration in the workspace, so this can be someone else's traffic. (${detail})`
    );
  }
  return error instanceof Error ? error : new Error(`Notion request for ${target} failed: ${detail}`);
}
var RETRYABLE = /* @__PURE__ */ new Set([429, 503, 529]);
var MAX_RETRIES = 3;
var RETRY_BASE_MS = 500;
function headerValue(headers, lowercaseName) {
  if (!headers || typeof headers !== "object") return void 0;
  const get = headers.get;
  if (typeof get === "function") return headers.get(lowercaseName) ?? void 0;
  const record = headers;
  const key = Object.keys(record).find((k) => k.toLowerCase() === lowercaseName);
  return key === void 0 ? void 0 : record[key];
}
function retryDelayMs(error, attempt, random = Math.random) {
  const header = headerValue(error?.headers, "retry-after");
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1e3;
  const backoff = RETRY_BASE_MS * 2 ** attempt;
  return Math.floor(backoff * random());
}
function isRetryable(error) {
  const status = error?.status;
  return typeof status === "number" && RETRYABLE.has(status);
}
var realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function withExplanation(target, run, options = {}) {
  const { sleep = realSleep, random = Math.random, retries = MAX_RETRIES } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw explainNotionError(error, target);
      await sleep(retryDelayMs(error, attempt, random));
    }
  }
}
async function resolveDataSource(api, options) {
  let id;
  if (options.dataSourceId) {
    id = normalizeId(options.dataSourceId, "dataSourceId");
  } else {
    const databaseId = normalizeId(options.databaseId, "databaseId");
    const database = await withExplanation(
      `database ${databaseId}`,
      () => api.databases.retrieve({ database_id: databaseId })
    );
    const sources = database.data_sources ?? [];
    if (sources.length === 0) {
      throw new Error(
        `Database ${databaseId} reports no data sources. Check that the id is a database rather than a page.`
      );
    }
    if (sources.length > 1) {
      const listed = sources.map((s) => `${s.id} (${s.name ?? "unnamed"})`).join(", ");
      throw new Error(
        `Database ${databaseId} has ${sources.length} data sources, so one has to be chosen: set NOTION_DATA_SOURCE_ID to one of ${listed}.`
      );
    }
    id = sources[0].id;
  }
  const source = await withExplanation(
    `data source ${id}`,
    () => api.dataSources.retrieve({ data_source_id: id })
  );
  return { id, properties: source.properties ?? {} };
}
function buildQueryBody(options) {
  const clauses = [];
  if (options.since) {
    clauses.push({
      timestamp: "last_edited_time",
      last_edited_time: { on_or_after: options.since }
    });
  }
  if (options.filter) clauses.push(options.filter);
  const body = {
    data_source_id: options.dataSourceId,
    sorts: [{ timestamp: "last_edited_time", direction: "ascending" }],
    // Always explicit: Notion's own docs disagree with themselves about the
    // default, so we never inherit it.
    page_size: Math.min(Math.max(options.limit, 1), MAX_PAGE_SIZE)
  };
  if (clauses.length === 1) body.filter = clauses[0];
  if (clauses.length > 1) body.filter = { and: clauses };
  return body;
}
function isFullPage(value) {
  return typeof value === "object" && value !== null && typeof value.id === "string" && typeof value.properties === "object" && value.properties !== null;
}
async function queryDataSource(api, options) {
  const pages = [];
  let cursor;
  let truncated = false;
  while (pages.length < options.limit) {
    const body = buildQueryBody({ ...options, limit: options.limit - pages.length });
    if (cursor) body.start_cursor = cursor;
    const response = await withExplanation(
      `data source ${options.dataSourceId}`,
      () => api.dataSources.query(body)
    );
    for (const row of response.results ?? []) {
      if (isFullPage(row)) pages.push(row);
    }
    if (response.request_status?.incomplete_reason === "query_result_limit_reached") {
      truncated = true;
    }
    if (!response.has_more || !response.next_cursor) break;
    cursor = response.next_cursor;
  }
  return { pages: pages.slice(0, options.limit), truncated };
}
function plainText(rich) {
  if (!Array.isArray(rich)) return "";
  return rich.map((part) => part?.plain_text ?? "").join("").trim();
}
function propertyValue(property) {
  const prop = property;
  if (!prop || typeof prop.type !== "string") return null;
  switch (prop.type) {
    case "title":
    case "rich_text":
      return plainText(prop[prop.type]);
    case "select":
    case "status":
      return prop[prop.type]?.name ?? null;
    case "multi_select":
      return (prop.multi_select ?? []).map((o) => o.name ?? "");
    case "people":
      return (prop.people ?? []).map((p) => p.name ?? "");
    case "date":
      return prop.date?.start ?? null;
    case "checkbox":
    case "number":
    case "url":
    case "email":
    case "phone_number":
      return prop[prop.type] ?? null;
    case "unique_id": {
      const uid = prop.unique_id;
      if (!uid) return null;
      return uid.prefix ? `${uid.prefix}-${uid.number}` : uid.number ?? null;
    }
    default:
      return null;
  }
}
function pageProperties(page2) {
  const out = {};
  for (const [name, property] of Object.entries(page2.properties ?? {})) {
    out[name] = propertyValue(property);
  }
  return out;
}
function pageTitle(page2) {
  for (const property of Object.values(page2.properties ?? {})) {
    const prop = property;
    if (prop?.type === "title") return plainText(prop.title);
  }
  return "";
}
function findStatusProperty(properties, configured) {
  if (configured) return configured;
  const entries = Object.entries(properties);
  const status = entries.find(([, p]) => p?.type === "status");
  if (status) return status[0];
  const select = entries.find(([, p]) => p?.type === "select");
  return select?.[0];
}
function statusGroups(properties, statusProperty) {
  const config = statusProperty ? properties[statusProperty] : void 0;
  const status = config?.status;
  if (!status) return {};
  const options = status.options ?? [];
  const groups = status.groups ?? [];
  const byId = new Map(options.map((o) => [o.id ?? "", o.name ?? ""]));
  const out = {};
  for (const group of groups) {
    for (const optionId of group.option_ids ?? []) {
      const name = byId.get(optionId);
      if (name) out[name] = group.name ?? "";
    }
  }
  return out;
}
function markdownToBlocks(markdown) {
  const lines = markdown.split("\n").map((line) => line.trim()).filter((line) => line !== "");
  return lines.map((line) => {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const type = `heading_${heading[1].length}`;
      return { object: "block", type, [type]: { rich_text: richText(heading[2]) } };
    }
    return { object: "block", type: "paragraph", paragraph: { rich_text: richText(line) } };
  });
}
function richText(content) {
  return [{ type: "text", text: { content } }];
}
function assertKnownProperties(schema, properties) {
  if (Object.keys(schema).length === 0) return;
  const unknown = Object.keys(properties).filter((name) => !(name in schema));
  if (unknown.length > 0) {
    throw new Error(
      `No property named ${unknown.join(", ")} in this data source. It has: ${Object.keys(schema).join(", ")}.`
    );
  }
  const rollups = Object.keys(properties).filter(
    (name) => schema[name]?.type === "rollup"
  );
  if (rollups.length > 0) {
    throw new Error(`Rollup properties cannot be written through the API: ${rollups.join(", ")}.`);
  }
}
function parseJsonArg(value, label) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} must be JSON: ${error.message}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed;
}
function pageUrl(page2) {
  if (page2.url) return page2.url;
  return `https://www.notion.so/${page2.id.replace(/-/g, "")}`;
}
var DEFAULT_LIMIT = MAX_PAGE_SIZE;
var defaultCreateApi = (token) => new import_client.Client({ auth: token, notionVersion: NOTION_VERSION });
function required(config, key, env) {
  const value = String(config[key] ?? "").trim();
  if (!value) throw new Error(`${env} is required`);
  return value;
}
function text2(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? void 0 : trimmed;
}
function positiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_PAGE_SIZE);
}
function titlePropertyName(schema) {
  return Object.entries(schema).find(([, p]) => p?.type === "title")?.[0] ?? "title";
}
function createNotionConnector(options = {}) {
  const createApi = options.createApi ?? defaultCreateApi;
  const sourceCache = /* @__PURE__ */ new Map();
  async function source(config) {
    const token = required(config, "token", "NOTION_TOKEN");
    const databaseId = required(config, "databaseId", "NOTION_DATABASE_ID");
    const dataSourceId = text2(config.dataSourceId);
    const api = createApi(token);
    const key = `${token}\0${databaseId}\0${dataSourceId ?? ""}`;
    let pending = sourceCache.get(key);
    if (!pending) {
      pending = resolveDataSource(api, {
        databaseId,
        ...dataSourceId && { dataSourceId }
      });
      pending.catch(() => sourceCache.delete(key));
      sourceCache.set(key, pending);
    }
    return { api, ref: await pending };
  }
  function pageToItem(page2, statusProperty, groups) {
    const properties = pageProperties(page2);
    const rawStatus = statusProperty ? properties[statusProperty] : void 0;
    const status = typeof rawStatus === "string" ? rawStatus : "";
    const title = pageTitle(page2);
    return {
      // The page id, not the title or URL slug: it is stable across renames
      // and moves, and both of the others are not.
      externalId: page2.id,
      url: pageUrl(page2),
      title: title || "(untitled)",
      status,
      ...page2.last_edited_time && { updatedAt: page2.last_edited_time },
      data: {
        createdAt: page2.created_time ?? "",
        // The group behind the status option, so a workflow can branch on it
        // when a team's option names are not in statusMapping.
        statusGroup: groups[status] ?? "",
        properties
      }
    };
  }
  async function fetchPages(context) {
    const config = context.config;
    const { api, ref } = await source(config);
    const limit = positiveInt(config.limit, DEFAULT_LIMIT);
    const rawFilter = text2(config.filter);
    const result = await queryDataSource(api, {
      dataSourceId: ref.id,
      ...context.since && { since: context.since },
      ...rawFilter && { filter: parseJsonArg(rawFilter, "NOTION_FILTER") },
      limit: Math.min(limit, context.limit ?? limit)
    });
    if (result.truncated) {
      console.warn(
        "Notion stopped at its 10,000-result ceiling for this query, so older pages were not returned. Narrow NOTION_FILTER, or wait for the watermark to shrink the result set."
      );
    }
    const statusProperty = findStatusProperty(ref.properties, text2(config.statusProperty));
    const groups = statusGroups(ref.properties, statusProperty);
    return result.pages.map((page2) => pageToItem(page2, statusProperty, groups));
  }
  return defineConnector({
    id: "notion",
    name: "Notion",
    ...options.version && { version: options.version },
    description: "Trigger workflows from Notion database pages, and create or update them.",
    // Notion's own mark.
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466z",
        "M5.25 8.058v13.904c0 .747.373 1.027 1.214.98L20.99 22.1c.841-.046.935-.56.935-1.167V7.122c0-.606-.233-.933-.748-.887l-14.7.855c-.56.047-.746.327-.746.933zm14.28.7c.093.42 0 .84-.42.888l-.68.135v9.966c-.59.317-1.132.498-1.588.498-.727 0-.909-.227-1.453-.907l-4.451-6.992v6.765l1.408.317s0 .816-1.136.816l-3.132.181c-.09-.181 0-.635.317-.726l.818-.226V9.801L8.06 9.71c-.09-.42.137-1.021.784-1.067l3.359-.227 4.678 7.148V9.393l-1.181-.136c-.091-.5.273-.863.727-.908z"
      ]
    },
    auth: { rung: "key", keys: ["token"] },
    config: [
      {
        key: "token",
        env: "NOTION_TOKEN",
        label: "Notion integration token",
        // Stored encrypted by Vorn and never printed by the CLI.
        secret: true,
        required: true,
        description: "An internal integration token or personal API key from notion.so/profile/integrations. There is no Notion CLI to sign in with."
      },
      {
        key: "databaseId",
        env: "NOTION_DATABASE_ID",
        label: "Database",
        required: true,
        description: "Paste the database URL, or the 32-character id from it."
      },
      {
        key: "dataSourceId",
        env: "NOTION_DATA_SOURCE_ID",
        label: "Data source",
        description: "Only needed when the database has more than one data source. Blank resolves it."
      },
      {
        key: "filter",
        env: "NOTION_FILTER",
        label: "Filter",
        description: "A JSON filter in Notion's own syntax, ANDed with the poll watermark."
      },
      {
        key: "statusProperty",
        env: "NOTION_STATUS_PROPERTY",
        label: "Status property",
        description: "Name of the property carrying status. Blank uses the first status, then select, property."
      },
      {
        key: "limit",
        env: "NOTION_LIMIT",
        label: "Maximum per poll",
        default: String(DEFAULT_LIMIT)
      }
    ],
    triggers: [
      {
        type: "pageChanged",
        label: "A page is created or changed",
        description: "Fires once per page in the database that Vorn has not seen at this time. Deleted and moved pages produce no event \u2014 polling only sees what still matches.",
        // Every Notion page carries last_edited_time, and the query endpoint can
        // both filter and sort on it, so the watermark advances on that rather
        // than re-reading the database.
        dedupe: "timestamp",
        // Notion has no fixed workflow states: a status property's options are
        // user-defined. These are the names teams actually use; anything else
        // falls back to data.statusGroup. Without them every page imports as
        // todo, including work closed a year ago.
        statusMapping: [
          { upstream: "Not started", suggestedLocal: "todo" },
          { upstream: "To-do", suggestedLocal: "todo" },
          { upstream: "Backlog", suggestedLocal: "todo" },
          { upstream: "In progress", suggestedLocal: "in_progress" },
          { upstream: "In review", suggestedLocal: "in_review" },
          { upstream: "Doing", suggestedLocal: "in_progress" },
          { upstream: "Done", suggestedLocal: "done" },
          { upstream: "Complete", suggestedLocal: "done" },
          { upstream: "Shipped", suggestedLocal: "done" },
          { upstream: "Cancelled", suggestedLocal: "cancelled" },
          { upstream: "Archived", suggestedLocal: "cancelled" }
        ],
        defaultWorkflow: { name: "Notion: database pages", defaultCronFromMinutes: 5 },
        fetch: fetchPages
      }
    ],
    actions: [
      {
        type: "createPage",
        label: "Create a page",
        description: "Add a page to the configured data source.",
        // Notion offers no client-supplied idempotency key, so two calls make
        // two pages and a retrying agent has no way to know otherwise.
        idempotent: false,
        inputs: [
          { key: "title", label: "Title", required: true },
          { key: "markdown", label: "Body", description: "Paragraphs and # headings." },
          {
            key: "properties",
            label: "Properties",
            description: "JSON object of Notion property values, in the API\u2019s own shape."
          }
        ],
        outputs: [
          { key: "id", description: "The new page id" },
          { key: "url", description: "Where to open it" }
        ],
        async run(args, { config }) {
          const cfg = config;
          const { api, ref } = await source(cfg);
          const title = text2(args.title);
          if (!title) throw new Error("title is required");
          const properties = {};
          const raw = text2(args.properties);
          if (raw) Object.assign(properties, parseJsonArg(raw, "properties"));
          assertKnownProperties(ref.properties, properties);
          const titleProperty = titlePropertyName(ref.properties);
          properties[titleProperty] = { title: richText(title) };
          const markdown = text2(args.markdown);
          const children = markdown ? markdownToBlocks(markdown) : [];
          if (children.length > MAX_BLOCKS_PER_CREATE) {
            throw new Error(
              `markdown is ${children.length} blocks and Notion accepts at most ${MAX_BLOCKS_PER_CREATE} in one create. Shorten it, or append the rest in a later step.`
            );
          }
          const page2 = await withExplanation(
            "page create",
            () => api.pages.create({
              // A data source parent, not a database one: the post-2025-09-03
              // model rejects database_id here.
              parent: { data_source_id: ref.id },
              properties,
              ...children.length > 0 && { children }
            })
          );
          return { id: page2.id, url: pageUrl(page2) };
        }
      },
      {
        type: "updatePage",
        label: "Update a page",
        description: "Set properties on an existing page.",
        // Setting the same properties to the same values lands the page in the
        // same state, so a retry is safe.
        idempotent: true,
        inputs: [
          { key: "pageId", label: "Page", required: true, description: "Page URL or id." },
          { key: "title", label: "Title" },
          {
            key: "properties",
            label: "Properties",
            description: "JSON object of Notion property values."
          }
        ],
        outputs: [{ key: "url", description: "Where to open it" }],
        async run(args, { config }) {
          const cfg = config;
          const { api, ref } = await source(cfg);
          const pageId = normalizeId(text2(args.pageId) ?? "", "pageId");
          const properties = {};
          const raw = text2(args.properties);
          if (raw) Object.assign(properties, parseJsonArg(raw, "properties"));
          assertKnownProperties(ref.properties, properties);
          const title = text2(args.title);
          if (title) {
            const titleProperty = titlePropertyName(ref.properties);
            properties[titleProperty] = { title: richText(title) };
          }
          if (Object.keys(properties).length === 0) {
            throw new Error("Nothing to update: pass title, properties, or both.");
          }
          const page2 = await withExplanation(
            `page ${pageId}`,
            () => api.pages.update({ page_id: pageId, properties })
          );
          return { url: pageUrl({ id: pageId, ...page2.url && { url: page2.url } }) };
        }
      },
      {
        type: "findPages",
        label: "Find pages",
        description: "Query the configured data source and return the pages it matches.",
        // A read. Repeating it changes nothing.
        idempotent: true,
        inputs: [
          {
            key: "filter",
            label: "Filter",
            description: "A JSON filter in Notion's own syntax."
          },
          { key: "limit", label: "Maximum results", type: "number" }
        ],
        outputs: [
          { key: "count", type: "number", description: "How many pages came back" },
          { key: "pages", description: "id, url, title and status for each" },
          {
            key: "truncated",
            type: "boolean",
            description: "True when Notion hit its 10,000-result ceiling"
          }
        ],
        async run(args, { config }) {
          const cfg = config;
          const { api, ref } = await source(cfg);
          const raw = text2(args.filter);
          const result = await queryDataSource(api, {
            dataSourceId: ref.id,
            ...raw && { filter: parseJsonArg(raw, "filter") },
            limit: positiveInt(args.limit, positiveInt(cfg.limit, DEFAULT_LIMIT))
          });
          const statusProperty = findStatusProperty(ref.properties, text2(cfg.statusProperty));
          const pages = result.pages.map((page2) => {
            const properties = pageProperties(page2);
            const status = statusProperty ? properties[statusProperty] : null;
            return {
              id: page2.id,
              url: pageUrl(page2),
              title: pageTitle(page2),
              status: typeof status === "string" ? status : null
            };
          });
          return { count: pages.length, pages, truncated: result.truncated };
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
  name: "@vornrun/connector-notion",
  version: "0.1.3",
  description: "Trigger Vorn workflows from Notion database pages.",
  type: "module",
  license: "MIT",
  author: "Javier Canizalez <javier-canizalez@outlook.com>",
  repository: {
    type: "git",
    url: "git+https://github.com/vorn-run/extensions.git",
    directory: "notion"
  },
  keywords: [
    "vorn",
    "connector",
    "notion"
  ],
  bin: {
    "vorn-connector-notion": "dist/index.js"
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
    "@notionhq/client": "^5.24.0",
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
      "notion",
      "docs",
      "database",
      "pages",
      "notes",
      "wiki"
    ],
    auth: "Paste a Notion integration token, then share the pages you want it to see with the connection in Notion. There is no Notion CLI to sign in with.",
    hosts: [
      "api.notion.com"
    ]
  }
};
var { version } = package_default;
var notionConnector = createNotionConnector({ version });
var index_default = notionConnector;
serveIfEntryPoint(notionConnector, import.meta.url);

// notion/vorn-connector-pack.js
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
