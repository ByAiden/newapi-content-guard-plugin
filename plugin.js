export const meta = {
  "apiVersion": 1,
  "key": "byaiden_content_guard",
  "name": { "en": "Content Guard", "zh": "内容安全审核" },
  "description": {
    "en": "Blocks, masks or logs prompts and replies that match administrator keyword lists and regular expressions, by category",
    "zh": "按分类拦截、遮盖或记录命中管理员关键词列表与正则表达式的请求和回复"
  },
  "version": "1.0.1",
  "author": { "name": "ByAiden", "url": "https://github.com/ByAiden" },
  "website": "https://github.com/ByAiden/newapi-content-guard-plugin",
  "configSchema": {
    "type": "object",
    "properties": {
      "blockKeywords": {
        "type": "string",
        "format": "keywords",
        "title": { "en": "Blocked keywords", "zh": "拦截关键词" },
        "description": { "en": "One per line; a prompt that holds one is rejected and a reply that holds one is stopped", "zh": "每行一个，命中的请求被拒绝，命中的回复被中止" },
        "default": "",
        "maxLength": 4194304
      },
      "blockCategory": {
        "type": "string",
        "title": { "en": "Blocked keywords category", "zh": "拦截关键词分类" },
        "description": { "en": "Category recorded for hits of the blocked keywords", "zh": "拦截关键词命中时记录的分类" },
        "default": "blocked",
        "pattern": "^[a-z0-9_-]{1,40}$"
      },
      "maskKeywords": {
        "type": "string",
        "format": "keywords",
        "title": { "en": "Masked keywords", "zh": "遮盖关键词" },
        "description": { "en": "One per line; each occurrence is replaced in prompts and replies", "zh": "每行一个，请求和回复中的每处命中都被替换" },
        "default": "",
        "maxLength": 4194304
      },
      "maskCategory": {
        "type": "string",
        "title": { "en": "Masked keywords category", "zh": "遮盖关键词分类" },
        "description": { "en": "Category recorded for hits of the masked keywords", "zh": "遮盖关键词命中时记录的分类" },
        "default": "masked",
        "pattern": "^[a-z0-9_-]{1,40}$"
      },
      "logKeywords": {
        "type": "string",
        "format": "keywords",
        "title": { "en": "Logged keywords", "zh": "仅记录关键词" },
        "description": { "en": "One per line; hits are counted in the logs and the text passes unchanged", "zh": "每行一个，命中只计入日志，文本原样通过" },
        "default": "",
        "maxLength": 4194304
      },
      "logCategory": {
        "type": "string",
        "title": { "en": "Logged keywords category", "zh": "仅记录关键词分类" },
        "description": { "en": "Category recorded for hits of the logged keywords", "zh": "仅记录关键词命中时记录的分类" },
        "default": "flagged",
        "pattern": "^[a-z0-9_-]{1,40}$"
      },
      "allowKeywords": {
        "type": "string",
        "format": "keywords",
        "title": { "en": "Allowed phrases", "zh": "放行短语" },
        "description": { "en": "One per line; a hit that lies inside one of these phrases is ignored", "zh": "每行一个，落在这些短语内部的命中被忽略" },
        "default": "",
        "maxLength": 4194304
      },
      "keywordsCaseSensitive": {
        "type": "boolean",
        "title": { "en": "Keywords are case sensitive", "zh": "关键词区分大小写" },
        "default": false
      },
      "rules": {
        "type": "array",
        "title": { "en": "Rules", "zh": "规则" },
        "description": { "en": "Keywords or regular expressions, each with its own action and category", "zh": "关键词或正则表达式，每条有自己的动作和分类" },
        "default": [],
        "maxItems": 200,
        "items": {
          "type": "object",
          "title": { "en": "Rule", "zh": "规则" },
          "required": ["pattern"],
          "properties": {
            "id": {
              "type": "string",
              "title": { "en": "Rule ID", "zh": "规则 ID" },
              "description": { "en": "Recorded in the administrator log; leave empty to number rules in order", "zh": "记录在管理员日志中，留空时按顺序编号" },
              "maxLength": 64,
              "pattern": "^[A-Za-z0-9_.-]*$",
              "examples": ["id-card-number"]
            },
            "pattern": {
              "type": "string",
              "title": { "en": "Keyword or expression", "zh": "关键词或表达式" },
              "minLength": 1,
              "maxLength": 1024,
              "examples": ["\\b[1-9]\\d{16}[0-9Xx]\\b"]
            },
            "type": {
              "type": "string",
              "title": { "en": "Match type", "zh": "匹配方式" },
              "enum": ["keyword", "regex"],
              "enumTitles": [{ "en": "Keyword", "zh": "关键词" }, { "en": "Regular expression", "zh": "正则表达式" }],
              "default": "keyword"
            },
            "action": {
              "type": "string",
              "title": { "en": "Action", "zh": "动作" },
              "enum": ["block", "mask", "log"],
              "enumTitles": [{ "en": "Block", "zh": "拦截" }, { "en": "Mask", "zh": "遮盖" }, { "en": "Log only", "zh": "仅记录" }],
              "default": "block"
            },
            "category": {
              "type": "string",
              "title": { "en": "Category", "zh": "分类" },
              "default": "custom",
              "pattern": "^[a-z0-9_-]{1,40}$",
              "examples": ["pii"]
            },
            "scope": {
              "type": "string",
              "title": { "en": "Applies to", "zh": "适用于" },
              "enum": ["both", "prompt", "reply"],
              "enumTitles": [{ "en": "Prompts and replies", "zh": "请求和回复" }, { "en": "Prompts", "zh": "请求" }, { "en": "Replies", "zh": "回复" }],
              "default": "both"
            },
            "caseSensitive": {
              "type": "boolean",
              "title": { "en": "Case sensitive", "zh": "区分大小写" },
              "default": false
            }
          }
        }
      },
      "disabledCategories": {
        "type": "array",
        "title": { "en": "Disabled categories", "zh": "停用的分类" },
        "description": { "en": "Rules and keyword lists of these categories are skipped", "zh": "跳过这些分类的规则和关键词列表" },
        "default": [],
        "maxItems": 64,
        "uniqueItems": true,
        "items": { "type": "string", "title": { "en": "Category", "zh": "分类" }, "pattern": "^[a-z0-9_-]{1,40}$" }
      },
      "checkPrompts": {
        "type": "boolean",
        "title": { "en": "Check prompts", "zh": "检查请求" },
        "default": true
      },
      "promptScope": {
        "type": "string",
        "title": { "en": "Prompt text to check", "zh": "检查的请求文本" },
        "enum": ["all", "user"],
        "enumTitles": [{ "en": "All messages", "zh": "全部消息" }, { "en": "User messages", "zh": "用户消息" }],
        "default": "all",
        "visibleWhen": { "checkPrompts": true }
      },
      "checkAttachments": {
        "type": "boolean",
        "title": { "en": "Check attached documents", "zh": "检查附带文档" },
        "description": { "en": "Also read text, PDF and DOCX files the request carries", "zh": "同时读取请求附带的文本、PDF 和 DOCX 文件" },
        "default": true,
        "visibleWhen": { "checkPrompts": true }
      },
      "checkReplies": {
        "type": "boolean",
        "title": { "en": "Check replies", "zh": "检查回复" },
        "default": true
      },
      "normalize": {
        "type": "boolean",
        "title": { "en": "Normalize text before matching", "zh": "匹配前规范化文本" },
        "description": { "en": "Folds full-width forms, drops zero-width characters and joins CJK characters split by spaces or symbols", "zh": "全角转半角、去掉零宽字符、合并被空格或符号隔开的中日韩字符" },
        "default": true
      },
      "blockMessage": {
        "type": "string",
        "title": { "en": "Rejection message", "zh": "拒绝提示" },
        "description": { "en": "Shown to the client for a rejected prompt; leave empty for the default", "zh": "请求被拒绝时返回给客户端，留空使用默认提示" },
        "default": "",
        "maxLength": 256,
        "examples": ["This request contains content that is not allowed"]
      },
      "replyMessage": {
        "type": "string",
        "title": { "en": "Stopped reply message", "zh": "回复中止提示" },
        "description": { "en": "Shown to the client for a stopped reply; leave empty for the default", "zh": "回复被中止时返回给客户端，留空使用默认提示" },
        "default": "",
        "maxLength": 256,
        "examples": ["The answer was stopped by the content policy"]
      },
      "maskText": {
        "type": "string",
        "title": { "en": "Prompt mask text", "zh": "请求遮盖文本" },
        "description": { "en": "Replaces masked prompt text; replies always use ***", "zh": "替换请求中被遮盖的文本，回复固定使用 ***" },
        "default": "***",
        "minLength": 1,
        "maxLength": 32
      },
      "streamHold": {
        "type": "integer",
        "title": { "en": "Stream hold", "zh": "流式保留长度" },
        "description": { "en": "Text held back per streamed chunk so a match split across chunks is still found; 0 picks it from the rules", "zh": "流式回复每次保留的文本长度，用于发现跨块的命中，0 时按规则自动计算" },
        "default": 0,
        "minimum": 0,
        "maximum": 8192,
        "unit": "character"
      },
      "maxScanChars": {
        "type": "integer",
        "title": { "en": "Maximum scanned text", "zh": "最大检查文本量" },
        "description": { "en": "Text of one request or reply call past this is not checked", "zh": "单个请求或单次回复检查超过此长度的文本不再检查" },
        "default": 1000000,
        "minimum": 1000,
        "maximum": 10000000,
        "unit": "character"
      },
      "oversize": {
        "type": "string",
        "title": { "en": "Prompt over the limit", "zh": "请求超过检查上限时" },
        "enum": ["scan_head", "block"],
        "enumTitles": [{ "en": "Check the first part", "zh": "只检查前面部分" }, { "en": "Reject", "zh": "拒绝" }],
        "default": "scan_head"
      }
    }
  },
  "samples": [
    {
      "name": { "en": "Internal memo", "zh": "内部备忘录" },
      "lang": "en",
      "format": "openai",
      "body": {
        "model": "gpt-4o-mini",
        "messages": [{ "role": "user", "content": "Summarize this memo. It is marked internal use only: Q3 revenue grew 12 percent." }]
      },
      "reply": "This memo is for internal use only. It reports that Q3 revenue grew 12 percent."
    },
    {
      "name": { "en": "Internal memo", "zh": "内部备忘录" },
      "lang": "zh",
      "format": "openai",
      "body": {
        "model": "gpt-4o-mini",
        "messages": [{ "role": "user", "content": "总结这份备忘录，它标注了仅限 内 部 使用：第三季度收入增长 12%。" }]
      },
      "reply": "这份备忘录仅限内部使用，内容是第三季度收入增长 12%。"
    }
  ]
};

// ---------------------------------------------------------------------------
// Constants

const CODE_PREFIX = "content_guard.";
const DEFAULT_BLOCK_MESSAGE = "The request contains content that is not allowed";
const DEFAULT_REPLY_MESSAGE = "The answer was stopped by the content policy";
const MASK_NOTICE = { en: "Some text in the request was masked by the content policy", zh: "请求中的部分文本已按内容策略遮盖" };
const REPLY_NOTICE = { en: "Some text in the answer was masked by the content policy", zh: "回答中的部分文本已按内容策略遮盖" };
const MEDIA_PLACEHOLDER = /^\[media:\d+\]$/;
const MEDIA_INSIDE = /\[media:\d+\]/;
const TEXT_PART_TYPES = ["text", "input_text", "output_text"];
const LIST_FIELDS = [
  { field: "blockKeywords", action: "block", categoryField: "blockCategory", rule: "block-keywords" },
  { field: "maskKeywords", action: "mask", categoryField: "maskCategory", rule: "mask-keywords" },
  { field: "logKeywords", action: "log", categoryField: "logCategory", rule: "log-keywords" },
];
// utils.keywords returns at most this many keywords per call.
const KEYWORDS_LIMIT = 32;
// Bounds on work per text: matches kept per rule and rounds of keyword search.
const MAX_MATCHES_PER_RULE = 256;
const MAX_KEYWORD_ROUNDS = 8;
const MAX_FINDINGS = 64;
const MAX_PATCH_OPS = 512;
const MAX_REPLY_MASKS = 1024;
// A regular expression can match text of any length; a stream holds back at
// least this much text for it.
const REGEX_HOLD = 256;
const HOLD_LIMIT = 8192;
const MAX_ATTACHMENT_CHARS = 131072;

// ---------------------------------------------------------------------------
// Normalization
//
// normalize returns the text to match against (text), a copy with letters
// lowered one code unit for one code unit (lower), and map, the index in the
// original text of each code unit of text, or null when text is the
// original. Every step is linear in the length of the input.

function isZeroWidth(c) {
  return (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || (c >= 0x2060 && c <= 0x2064) ||
    c === 0xfeff || c === 0x00ad || c === 0x180e || c === 0x034f;
}

function isCJK(c) {
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) || (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0x3040 && c <= 0x30ff) || (c >= 0xac00 && c <= 0xd7af);
}

// Characters that may split a word written in CJK characters. Line breaks are
// not among them: texts are joined by line breaks.
function isSeparator(c) {
  return c === 0x20 || c === 0x09 || c === 0x2e || c === 0x2d || c === 0x5f || c === 0x2a || c === 0xb7 ||
    c === 0x2022 || c === 0x7c || c === 0x2f || c === 0x5c || c === 0x7e || c === 0x2b || c === 0x30fb;
}

function fold(c) {
  if (c >= 0xff01 && c <= 0xff5e) return c - 0xfee0;
  if (c === 0x3000) return 0x20;
  return c;
}

const ASCII_ONLY = /^[\x00-\x7f]*$/;
const CHUNK = 8192;

function lowerSameLength(text) {
  const lowered = text.toLowerCase();
  if (lowered.length === text.length) return lowered;
  // A few letters lower to two code units; keep those as they are so every
  // position still matches.
  const parts = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const low = ch.toLowerCase();
    parts.push(low.length === 1 ? low : ch);
  }
  return parts.join("");
}

function normalize(text, enabled) {
  if (!enabled || ASCII_ONLY.test(text)) return { text: text, lower: lowerSameLength(text), map: null };
  const n = text.length;
  const map = new Int32Array(n);
  const out = [];
  let codes = [];
  let size = 0;
  let previous = 0;
  for (let i = 0; i < n; i++) {
    const c = fold(text.charCodeAt(i));
    if (isZeroWidth(c)) continue;
    if (isSeparator(c) && isCJK(previous)) {
      // Look past the run of separators and zero-width characters: when a
      // CJK character follows, the run is dropped.
      let j = i;
      while (j < n) {
        const d = fold(text.charCodeAt(j));
        if (!isSeparator(d) && !isZeroWidth(d)) break;
        j++;
      }
      if (j < n && isCJK(fold(text.charCodeAt(j)))) {
        i = j - 1;
        continue;
      }
    }
    codes.push(c);
    map[size++] = i;
    previous = c;
    if (codes.length === CHUNK) {
      out.push(String.fromCharCode.apply(null, codes));
      codes = [];
    }
  }
  if (codes.length > 0) out.push(String.fromCharCode.apply(null, codes));
  const normalized = out.join("");
  return { text: normalized, lower: lowerSameLength(normalized), map: map.subarray(0, size) };
}

// The span [start, end) of the normalized text in the original text.
function originalSpan(norm, start, end) {
  if (!norm.map) return [start, end];
  return [norm.map[start], norm.map[end - 1] + 1];
}

// A keyword as the normalized text spells it.
function normalizeKeyword(word, enabled, caseSensitive) {
  const norm = normalize(word, enabled);
  return caseSensitive ? norm.text : norm.lower;
}

// ---------------------------------------------------------------------------
// Rules

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Patterns with backreferences, lookarounds or a quantified group that holds a
// quantifier can take exponential time in a backtracking engine; they are
// refused when an instance is saved.
const UNSAFE_REGEX = [
  { test: /\\[1-9]|\\k</, reason: "backreferences" },
  { test: /\(\?<?[=!]/, reason: "lookaround" },
  { test: /\((?:[^()\\]|\\.)*(?:[+*]|\{\d+,\d*\})(?:[^()\\]|\\.)*\)(?:[+*]|\{\d+,\d*\})/, reason: "a repeated group that holds a repetition" },
];

function compileRegex(source, caseSensitive, id) {
  let insensitive = !caseSensitive;
  // Go-style patterns often start with (?i); JavaScript takes it as a flag.
  if (source.startsWith("(?i)")) {
    source = source.slice(4);
    insensitive = true;
  }
  for (const unsafe of UNSAFE_REGEX) {
    if (unsafe.test.test(source)) throw new Error('Rule "' + id + '" uses ' + unsafe.reason + ", which can make matching slow");
  }
  let regex;
  try {
    regex = new RegExp(source, insensitive ? "gi" : "g");
  } catch (error) {
    throw new Error('Rule "' + id + '" has an invalid regular expression');
  }
  if (regex.test("")) throw new Error('Rule "' + id + '" matches empty text');
  regex.lastIndex = 0;
  return regex;
}

function compileRules(config) {
  const rules = Array.isArray(config.rules) ? config.rules : [];
  const compiled = [];
  const ids = new Set();
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!isObject(rule) || typeof rule.pattern !== "string" || rule.pattern === "") continue;
    const id = rule.id || "rule-" + (i + 1);
    if (ids.has(id)) throw new Error('Rule ID "' + id + '" is used more than once');
    ids.add(id);
    const caseSensitive = rule.caseSensitive === true;
    const entry = {
      id: id,
      action: rule.action || "block",
      category: rule.category || "custom",
      scope: rule.scope || "both",
      caseSensitive: caseSensitive,
    };
    if (rule.type === "regex") entry.regex = compileRegex(rule.pattern, caseSensitive, id);
    else entry.keyword = normalizeKeyword(rule.pattern.trim(), config.normalize !== false, caseSensitive);
    if (entry.keyword === "") throw new Error('Rule "' + id + '" has no text to match');
    compiled.push(entry);
  }
  return compiled;
}

// Compiled rules are kept per rule list: the list is configuration, not
// request data, and compiling regular expressions on every call is waste.
const ruleCache = new Map();
const RULE_CACHE_LIMIT = 32;

function rulesOf(config) {
  const key = (config.normalize !== false ? "n" : "r") + JSON.stringify(config.rules || []);
  let rules = ruleCache.get(key);
  if (rules) return rules;
  rules = compileRules(config);
  if (ruleCache.size >= RULE_CACHE_LIMIT) ruleCache.clear();
  ruleCache.set(key, rules);
  return rules;
}

function hasList(config, field) {
  return isObject(config[field]) && config[field].count > 0;
}

// The checks that apply to a side ("prompt" or "reply"), with the categories
// the instance turned off left out.
function plan(config, side) {
  const disabled = new Set(Array.isArray(config.disabledCategories) ? config.disabledCategories : []);
  const rules = rulesOf(config).filter((rule) => (rule.scope === "both" || rule.scope === side) && !disabled.has(rule.category));
  const lists = [];
  for (const list of LIST_FIELDS) {
    const category = config[list.categoryField] || list.action;
    if (hasList(config, list.field) && !disabled.has(category)) {
      lists.push({ field: list.field, action: list.action, category: category, rule: list.rule });
    }
  }
  return {
    rules: rules,
    lists: lists,
    allow: hasList(config, "allowKeywords"),
    normalize: config.normalize !== false,
    caseSensitive: config.keywordsCaseSensitive === true,
  };
}

function isEmptyPlan(p) {
  return p.rules.length === 0 && p.lists.length === 0;
}

// ---------------------------------------------------------------------------
// Matching

// Every occurrence of needle in haystack, at most limit.
function occurrences(haystack, needle, limit) {
  const found = [];
  if (needle === "") return found;
  let at = haystack.indexOf(needle);
  while (at !== -1 && found.length < limit) {
    found.push(at);
    at = haystack.indexOf(needle, at + needle.length);
  }
  return found;
}

// keywordsIn returns the keywords of a list field found in a text, searching
// again with the found ones blanked out while the host returns a full batch.
function keywordsIn(field, norm, p) {
  const words = new Set();
  let text = p.caseSensitive ? norm.text : norm.lower;
  for (let round = 0; round < MAX_KEYWORD_ROUNDS; round++) {
    const found = utils.keywords(field, text, { caseSensitive: p.caseSensitive });
    for (const word of found) words.add(word);
    if (found.length < KEYWORDS_LIMIT) break;
    for (const word of found) {
      const needle = normalizeKeyword(word, p.normalize, p.caseSensitive);
      if (needle !== "") text = text.split(needle).join(" ".repeat(needle.length));
    }
  }
  return Array.from(words);
}

// keywordSpans returns the spans of the normalized text where a keyword occurs.
function keywordSpans(norm, word, p, caseSensitive) {
  const needle = normalizeKeyword(word, p.normalize, caseSensitive);
  const haystack = caseSensitive ? norm.text : norm.lower;
  return occurrences(haystack, needle, MAX_MATCHES_PER_RULE).map((at) => [at, at + needle.length]);
}

function regexSpans(norm, regex) {
  const spans = [];
  regex.lastIndex = 0;
  let match;
  while (spans.length < MAX_MATCHES_PER_RULE && (match = regex.exec(norm.text)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    spans.push([match.index, match.index + match[0].length]);
  }
  regex.lastIndex = 0;
  return spans;
}

// scan finds the hits of a plan in one text. A hit is {action, category,
// rule, start, end} in the original text's code units. listWords, when
// given, holds the words each list found in the text: the caller searched a
// larger text that holds this one.
function scan(text, p, listWords) {
  const hits = [];
  if (text === "" || MEDIA_PLACEHOLDER.test(text)) return hits;
  const norm = normalize(text, p.normalize);
  let allowed = [];
  if (p.allow) {
    const words = listWords ? listWords.allowKeywords : keywordsIn("allowKeywords", norm, p);
    for (const word of words) {
      allowed = allowed.concat(keywordSpans(norm, word, p, p.caseSensitive));
    }
  }
  const add = (spans, action, category, rule) => {
    for (const span of spans) {
      if (allowed.some((a) => a[0] <= span[0] && span[1] <= a[1])) continue;
      const original = originalSpan(norm, span[0], span[1]);
      hits.push({ action: action, category: category, rule: rule, start: original[0], end: original[1] });
    }
  };
  for (const list of p.lists) {
    const words = listWords ? listWords[list.field] : keywordsIn(list.field, norm, p);
    for (const word of words) add(keywordSpans(norm, word, p, p.caseSensitive), list.action, list.category, list.rule);
  }
  for (const rule of p.rules) {
    const spans = rule.regex
      ? regexSpans(norm, rule.regex)
      : occurrences(rule.caseSensitive ? norm.text : norm.lower, rule.keyword, MAX_MATCHES_PER_RULE).map((at) => [at, at + rule.keyword.length]);
    add(spans, rule.action, rule.category, rule.id);
  }
  return hits;
}

// Merges the spans of hits, sorted, overlapping ones joined.
function mergeSpans(hits) {
  const spans = hits.map((hit) => [hit.start, hit.end]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  return merged;
}

function maskString(text, spans, replacement) {
  const parts = [];
  let from = 0;
  for (const span of spans) {
    parts.push(text.slice(from, span[0]), replacement);
    from = span[1];
  }
  parts.push(text.slice(from));
  return parts.join("");
}

// Findings count hits by rule and category; the matched text is never kept.
function addFindings(findings, hits) {
  for (const hit of hits) {
    const key = hit.rule + "\n" + hit.category;
    const entry = findings.get(key);
    if (entry) entry.count++;
    else findings.set(key, { rule: hit.rule, category: hit.category, count: 1 });
  }
}

function findingList(findings) {
  return Array.from(findings.values()).slice(0, MAX_FINDINGS);
}

function blockCode(category) {
  return CODE_PREFIX + category;
}

// ---------------------------------------------------------------------------
// Prompt text

function pointer(parts) {
  return "/" + parts.map((p) => String(p).replace(/~/g, "~0").replace(/\//g, "~1")).join("/");
}

// Collects the text strings of a request body with their JSON Pointers and
// roles: chat, Claude, Responses and Gemini messages, system prompts and
// instructions, completion, embedding and image prompts, and task prompts.
// Tool definitions, tool call arguments and reasoning are not collected.
function collectSlots(body) {
  const slots = [];
  if (!isObject(body)) return slots;
  const push = (text, path, role) => {
    if (typeof text === "string" && text !== "" && !MEDIA_PLACEHOLDER.test(text)) slots.push({ text: text, path: pointer(path), role: role });
  };
  const content = (value, path, role) => {
    if (typeof value === "string") {
      push(value, path, role);
      return;
    }
    if (!Array.isArray(value)) return;
    value.forEach((part, j) => {
      if (typeof part === "string") push(part, path.concat(j), role);
      else if (!isObject(part) || part.thought === true) return;
      else if (typeof part.text === "string" && (part.type === undefined || TEXT_PART_TYPES.includes(part.type))) push(part.text, path.concat(j, "text"), role);
      else if (part.type === "tool_result") content(part.content, path.concat(j, "content"), "tool");
      else if (part.type === "document" && isObject(part.source) && part.source.type === "text") push(part.source.data, path.concat(j, "source", "data"), role);
    });
  };
  const roleOf = (role) => {
    if (role === "model") return "assistant";
    if (role === "developer") return "system";
    return typeof role === "string" ? role : "user";
  };
  if (Array.isArray(body.messages)) {
    body.messages.forEach((message, i) => {
      if (isObject(message)) content(message.content, ["messages", i, "content"], roleOf(message.role));
    });
  }
  content(body.system, ["system"], "system");
  if (typeof body.instructions === "string") push(body.instructions, ["instructions"], "system");
  if (typeof body.input === "string") push(body.input, ["input"], "user");
  else if (Array.isArray(body.input)) {
    body.input.forEach((item, k) => {
      if (typeof item === "string") push(item, ["input", k], "user");
      else if (!isObject(item)) return;
      else if (item.content !== undefined) content(item.content, ["input", k, "content"], roleOf(item.role));
      else if (TEXT_PART_TYPES.includes(item.type)) push(item.text, ["input", k, "text"], "user");
    });
  } else if (isObject(body.input)) {
    push(body.input.prompt, ["input", "prompt"], "user");
    push(body.input.negative_prompt, ["input", "negative_prompt"], "user");
    if (Array.isArray(body.input.messages)) {
      body.input.messages.forEach((message, i) => {
        if (isObject(message)) content(message.content, ["input", "messages", i, "content"], roleOf(message.role));
      });
    }
  }
  if (Array.isArray(body.contents)) {
    body.contents.forEach((entry, i) => {
      if (isObject(entry)) content(entry.parts, ["contents", i, "parts"], roleOf(entry.role));
    });
  }
  for (const key of ["systemInstruction", "system_instruction"]) {
    if (isObject(body[key])) content(body[key].parts, [key, "parts"], "system");
  }
  if (typeof body.prompt === "string") push(body.prompt, ["prompt"], "user");
  else if (Array.isArray(body.prompt)) body.prompt.forEach((item, k) => push(item, ["prompt", k], "user"));
  for (const key of ["negative_prompt", "negativePrompt", "lyrics", "gpt_description_prompt"]) {
    if (typeof body[key] === "string") push(body[key], [key], "user");
    else if (Array.isArray(body[key])) body[key].forEach((item, k) => push(item, [key, k], "user"));
  }
  if (isObject(body.parameters)) push(body.parameters.negative_prompt, ["parameters", "negative_prompt"], "user");
  if (Array.isArray(body.instances)) {
    body.instances.forEach((instance, i) => {
      if (isObject(instance)) push(instance.prompt, ["instances", i, "prompt"], "user");
    });
  }
  if (!Array.isArray(body.messages) && Array.isArray(body.content)) content(body.content, ["content"], "user");
  return slots;
}

// The words each keyword list finds in all the slots at once: most requests
// match nothing, and one host call per list is cheaper than one per slot.
// null means a list returned a full batch, so each slot is searched alone.
function listWordsForAll(slots, p) {
  const words = { allowKeywords: [] };
  const fields = p.lists.map((list) => list.field);
  if (p.allow) fields.push("allowKeywords");
  if (fields.length === 0) return words;
  const joined = slots.map((slot) => normalize(slot.text, p.normalize).text).join("\n");
  for (const field of fields) {
    const found = utils.keywords(field, joined, { caseSensitive: p.caseSensitive });
    if (found.length >= KEYWORDS_LIMIT) return null;
    words[field] = found;
  }
  return words;
}

// checkSlots scans the text of a request. It returns a reject result, or the
// json.patch operations of the masks and the findings.
function checkSlots(config, p, body) {
  const findings = new Map();
  let slots = collectSlots(body);
  if (config.promptScope === "user") slots = slots.filter((slot) => slot.role === "user" || slot.role === "tool");
  const limit = config.maxScanChars || 1000000;
  let budget = limit;
  const scanned = [];
  for (const slot of slots) {
    if (budget <= 0) break;
    if (slot.text.length > budget) {
      if (config.oversize === "block") return { reject: { action: "reject", code: CODE_PREFIX + "too_large", message: config.blockMessage || DEFAULT_BLOCK_MESSAGE, ruleId: "max-scan-chars" } };
      scanned.push({ text: slot.text.slice(0, budget), path: slot.path, full: slot.text, cut: true });
      budget = 0;
      break;
    }
    scanned.push({ text: slot.text, path: slot.path, full: slot.text, cut: false });
    budget -= slot.text.length;
  }
  if (config.oversize === "block" && scanned.length < slots.length) {
    return { reject: { action: "reject", code: CODE_PREFIX + "too_large", message: config.blockMessage || DEFAULT_BLOCK_MESSAGE, ruleId: "max-scan-chars" } };
  }
  // The words each list finds in the whole request; a slot without any of
  // them needs no keyword search of its own.
  const allWords = listWordsForAll(scanned, p);
  const anyListWord = allWords === null || p.lists.some((list) => allWords[list.field].length > 0);
  const ops = [];
  let blocked = null;
  for (const slot of scanned) {
    if (!anyListWord && p.rules.length === 0) break;
    const hits = scan(slot.text, p, allWords);
    if (hits.length === 0) continue;
    addFindings(findings, hits);
    const block = hits.find((hit) => hit.action === "block");
    if (block && !blocked) blocked = block;
    const masks = hits.filter((hit) => hit.action === "mask");
    if (masks.length === 0 || blocked) continue;
    const masked = maskString(slot.full, mergeSpans(masks), config.maskText || "***");
    // A patch value must not hold a media placeholder: such a text cannot be
    // masked, so it is rejected instead.
    if (MEDIA_INSIDE.test(masked) || ops.length >= MAX_PATCH_OPS) {
      blocked = masks[0];
      continue;
    }
    ops.push({ op: "replace", path: slot.path, value: masked });
  }
  if (blocked) {
    return { reject: { action: "reject", code: blockCode(blocked.category), message: config.blockMessage || DEFAULT_BLOCK_MESSAGE, ruleId: blocked.rule, findings: findingList(findings) } };
  }
  return { ops: ops, findings: findings };
}

// checkAttachments reads the documents of the request: a block hit rejects it,
// a mask hit rewrites a text file the host can rewrite and is only logged in
// any other file.
function checkAttachments(config, p, findings) {
  const effects = [];
  const list = utils.attachments();
  for (const attachment of list) {
    if (!attachment.ref || attachment.kind !== "document") continue;
    const read = utils.mediaText(attachment.ref, { maxChars: Math.min(MAX_ATTACHMENT_CHARS, config.maxScanChars || 1000000) });
    if (!read || typeof read.text !== "string" || read.text === "") continue;
    const hits = scan(read.text, p, null);
    if (hits.length === 0) continue;
    addFindings(findings, hits);
    const block = hits.find((hit) => hit.action === "block");
    if (block) return { reject: { action: "reject", code: blockCode(block.category), message: config.blockMessage || DEFAULT_BLOCK_MESSAGE, ruleId: block.rule, findings: findingList(findings) } };
    const masks = hits.filter((hit) => hit.action === "mask");
    if (masks.length > 0 && attachment.rewritable === true && read.truncated !== true) {
      effects.push({ type: "media.text", media: attachment.ref, text: maskString(read.text, mergeSpans(masks), config.maskText || "***") });
    }
  }
  return { effects: effects };
}

// ---------------------------------------------------------------------------
// Hooks

export function validateConfig(config) {
  const c = config || {};
  compileRules(c);
}

export function ingress(ctx, req) {
  const config = ctx.config || {};
  if (config.checkPrompts === false) return { action: "continue" };
  const p = plan(config, "prompt");
  if (isEmptyPlan(p)) return { action: "continue" };
  const result = checkSlots(config, p, req.body);
  if (result.reject) return result.reject;
  const findings = result.findings;
  const effects = [];
  if (result.ops.length > 0) effects.push({ type: "json.patch", ops: result.ops });
  if (config.checkAttachments !== false && typeof utils.attachments === "function") {
    const files = checkAttachments(config, p, findings);
    if (files.reject) return files.reject;
    for (const effect of files.effects) effects.push(effect);
  }
  const out = { action: "continue" };
  if (effects.length > 0) {
    out.effects = effects;
    out.notice = MASK_NOTICE;
  }
  if (findings.size > 0) out.findings = findingList(findings);
  return out;
}

// The hold of a stream: enough text for the longest keyword, with room for
// the characters normalization drops, or REGEX_HOLD with regular expressions.
function replyHold(config, p) {
  if (config.streamHold > 0) return Math.min(HOLD_LIMIT, config.streamHold);
  let longest = 0;
  for (const list of p.lists) longest = Math.max(longest, config[list.field].longest || 0);
  if (p.allow) longest = Math.max(longest, config.allowKeywords.longest || 0);
  let hold = 0;
  for (const rule of p.rules) {
    if (rule.regex) hold = Math.max(hold, REGEX_HOLD);
    else longest = Math.max(longest, rule.keyword.length);
  }
  if (longest > 0) hold = Math.max(hold, p.normalize ? longest * 4 : longest - 1);
  return Math.min(HOLD_LIMIT, hold);
}

export function reply(ctx, res) {
  const config = ctx.config || {};
  if (config.checkReplies === false) return { action: "pass" };
  const p = plan(config, "reply");
  if (isEmptyPlan(p)) return { action: "pass" };
  const findings = new Map();
  const masks = [];
  const limit = config.maxScanChars || 1000000;
  for (const output of res.outputs) {
    if (typeof output.text !== "string" || output.text === "") continue;
    const text = output.text.length > limit ? output.text.slice(0, limit) : output.text;
    const hits = scan(text, p, null);
    if (hits.length === 0) continue;
    addFindings(findings, hits);
    const block = hits.find((hit) => hit.action === "block");
    if (block) {
      return { action: "stop", code: blockCode(block.category), message: config.replyMessage || DEFAULT_REPLY_MESSAGE, findings: findingList(findings) };
    }
    for (const span of mergeSpans(hits.filter((hit) => hit.action === "mask"))) {
      if (masks.length < MAX_REPLY_MASKS) masks.push({ index: output.index, start: span[0], end: span[1] });
    }
  }
  const out = { action: "continue", hold: res.stream ? replyHold(config, p) : 0 };
  if (masks.length > 0) {
    out.mask = masks;
    out.notice = REPLY_NOTICE;
  }
  if (findings.size > 0) out.findings = findingList(findings);
  return out;
}
