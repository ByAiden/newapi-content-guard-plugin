import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Host utilities the hooks use. Keyword lists stay in the host: a test sets
// lists[field] to the lines of the list and the config carries {count, longest}.
let lists = {};
let files = [];
const keywordCalls = [];
globalThis.utils = {
  keywords(field, text, options) {
    keywordCalls.push(field);
    const words = lists[field] || [];
    const caseSensitive = options && options.caseSensitive === true;
    const hay = caseSensitive ? text : text.toLowerCase();
    const found = [];
    for (const word of words) {
      const at = hay.indexOf(caseSensitive ? word : word.toLowerCase());
      if (at !== -1) found.push({ word, end: at + word.length });
    }
    found.sort((a, b) => a.end - b.end);
    return found.slice(0, 32).map((f) => f.word);
  },
  attachments() {
    return files.map((f) => ({ ref: f.ref, kind: f.kind, mime: f.mime, path: f.path, rewritable: f.rewritable }));
  },
  mediaText(ref) {
    const f = files.find((x) => x.ref === ref);
    return f ? { text: f.text, truncated: f.truncated === true } : null;
  },
};

const plugin = await import("../plugin.js");
const { meta, ingress, reply, validateConfig } = plugin;
const source = readFileSync(new URL("../plugin.js", import.meta.url), "utf8");

// The instance config as the host passes it: schema defaults applied and each
// keyword list read as {count, longest}.
function config(overrides = {}, keywordLists = {}) {
  lists = keywordLists;
  const out = {};
  for (const [name, field] of Object.entries(meta.configSchema.properties)) {
    if (field.default !== undefined) out[name] = structuredClone(field.default);
  }
  Object.assign(out, overrides);
  if (Array.isArray(out.rules)) {
    const itemProps = meta.configSchema.properties.rules.items.properties;
    out.rules = out.rules.map((rule) => {
      const full = {};
      for (const [name, field] of Object.entries(itemProps)) if (field.default !== undefined) full[name] = field.default;
      return Object.assign(full, rule);
    });
  }
  for (const [name, field] of Object.entries(meta.configSchema.properties)) {
    if (field.format !== "keywords") continue;
    const words = [...new Set((keywordLists[name] || []).map((w) => w.trim()).filter(Boolean))];
    out[name] = { count: words.length, longest: words.reduce((m, w) => Math.max(m, w.length), 0) };
  }
  return out;
}

function ctx(cfg, extra = {}) {
  return { stage: "ingress", format: "openai", path: "/v1/chat/completions", model: "gpt-4o-mini", attempt: 0, instance: { id: "i1", name: "guard" }, config: cfg, ...extra };
}

function chat(content, more = {}) {
  return { model: "gpt-4o-mini", stream: false, messages: [{ role: "user", content }], ...more };
}

// Applies a json.patch replace list to a copy of body.
function applyOps(body, ops) {
  const copy = structuredClone(body);
  for (const op of ops) {
    assert.equal(op.op, "replace");
    const parts = op.path.split("/").slice(1).map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
    let node = copy;
    for (const part of parts.slice(0, -1)) node = node[part];
    assert.ok(parts.at(-1) in node, "replace targets an existing member: " + op.path);
    node[parts.at(-1)] = op.value;
  }
  return copy;
}

const join = (...parts) => parts.join("");
const ZWSP = "\u200b";

// ---------------------------------------------------------------------------
// Manifest

test("meta is a plain JSON object literal equal to the evaluated meta", () => {
  const start = source.indexOf("export const meta = ") + "export const meta = ".length;
  const end = source.indexOf("\n};\n", start) + 2;
  const literal = source.slice(start, end).replace(/^\s*\/\/[^\n]*\n/gm, "");
  assert.deepEqual(JSON.parse(literal), meta);
});

test("meta identifies the plugin for the community market", () => {
  assert.match(meta.key, /^[a-z0-9-]+_content_guard$/);
  assert.ok(meta.key.length <= 30);
  assert.equal(meta.version, "1.0.1");
  assert.equal(meta.apiVersion, 1);
  assert.equal(meta.optional, undefined, "fails closed: a broken instance stops the request");
  for (const field of ["routes", "protocols", "relay", "channelTypes", "models"]) assert.equal(meta[field], undefined);
  assert.ok(meta.samples.length <= 8);
  const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  assert.match(changelog, new RegExp('plugin: "?' + meta.key + '"?\n'));
  assert.match(changelog, new RegExp('version: "?' + meta.version.replaceAll(".", "\\.") + '"?\\n'));
});

test("schema titles exist in both languages and defaults are valid", () => {
  const walk = (field, path) => {
    assert.ok(field.title && field.title.en && field.title.zh, "title of " + path);
    if (field.enum) assert.equal(field.enumTitles.length, field.enum.length, path);
    if (field.pattern && typeof field.default === "string") assert.match(field.default, new RegExp(field.pattern), path);
    for (const [name, child] of Object.entries(field.properties || {})) walk(child, path + "." + name);
    if (field.items) walk(field.items, path + "[]");
  };
  for (const [name, field] of Object.entries(meta.configSchema.properties)) walk(field, name);
});

// ---------------------------------------------------------------------------
// validateConfig

test("validateConfig accepts the defaults and sound rules", () => {
  validateConfig(config());
  validateConfig(config({ rules: [{ pattern: "\\b[1-9]\\d{16}[0-9Xx]\\b", type: "regex", action: "mask", category: "pii" }, { pattern: "(?i)internal use only", type: "regex" }, { pattern: "secret plan" }] }));
});

test("validateConfig refuses rules that cannot run safely", () => {
  const cases = [
    [{ pattern: "(", type: "regex" }, /invalid regular expression/],
    [{ pattern: "(a)\\1", type: "regex" }, /backreferences/],
    [{ pattern: "foo(?=bar)", type: "regex" }, /lookaround/],
    [{ pattern: "(?<!x)y", type: "regex" }, /lookaround/],
    [{ pattern: "(a+)+$", type: "regex" }, /repeated group/],
    [{ pattern: "(\\w*x)*", type: "regex" }, /repeated group/],
    [{ pattern: "a*", type: "regex" }, /matches empty text/],
    [{ pattern: "   " }, /no text to match/],
  ];
  for (const [rule, error] of cases) assert.throws(() => validateConfig(config({ rules: [rule] })), error, rule.pattern);
  assert.throws(() => validateConfig(config({ rules: [{ id: "a", pattern: "x" }, { id: "a", pattern: "y" }] })), /used more than once/);
});

// ---------------------------------------------------------------------------
// Prompts

test("a request without rules or keywords runs no matching", () => {
  keywordCalls.length = 0;
  assert.deepEqual(ingress(ctx(config()), { body: chat("hello") }), { action: "continue" });
  assert.equal(keywordCalls.length, 0);
});

test("a blocked keyword rejects the request with a code and no matched text", () => {
  const cfg = config({}, { blockKeywords: ["forbidden topic"] });
  const result = ingress(ctx(cfg), { body: chat("Tell me about the Forbidden Topic please") });
  assert.equal(result.action, "reject");
  assert.equal(result.code, "content_guard.blocked");
  assert.equal(result.ruleId, "block-keywords");
  assert.equal(result.message, "The request contains content that is not allowed");
  assert.deepEqual(result.findings, [{ rule: "block-keywords", category: "blocked", count: 1 }]);
  assert.ok(!JSON.stringify(result).toLowerCase().includes("forbidden"));
});

test("the rejection message and category are configurable", () => {
  const cfg = config({ blockMessage: "Not allowed here", blockCategory: "policy" }, { blockKeywords: ["forbidden topic"] });
  const result = ingress(ctx(cfg), { body: chat("forbidden topic") });
  assert.equal(result.code, "content_guard.policy");
  assert.equal(result.message, "Not allowed here");
});

test("normalization defeats full-width, zero-width and spaced CJK tricks", () => {
  const cfg = config({}, { blockKeywords: ["badword", "违禁词"] });
  const tricks = [
    "ＢＡＤＷＯＲＤ",
    join("bad", ZWSP, "word"),
    "违 禁 词",
    "违.禁.词",
    join("违", ZWSP, " ", "禁", "\u3000", "词"),
    "违＊禁＊词",
  ];
  for (const text of tricks) assert.equal(ingress(ctx(cfg), { body: chat(text) }).action, "reject", JSON.stringify(text));
  const off = config({ normalize: false }, { blockKeywords: ["badword", "违禁词"] });
  for (const text of tricks) assert.equal(ingress(ctx(off), { body: chat(text) }).action, "continue", JSON.stringify(text));
});

test("separators are only dropped between CJK characters", () => {
  const cfg = config({}, { blockKeywords: ["ab"] });
  assert.equal(ingress(ctx(cfg), { body: chat("a b") }).action, "continue");
  const cjk = config({}, { blockKeywords: ["好吧"] });
  assert.equal(ingress(ctx(cjk), { body: chat("你好\n吧") }).action, "continue", "a line break is a boundary");
});

test("a masked keyword is replaced only in text parts of a multimodal message", () => {
  const cfg = config({}, { maskKeywords: ["project falcon"] });
  const body = chat([
    { type: "text", text: "Status of Project Falcon?" },
    { type: "image_url", image_url: { url: "[media:0]" } },
    { type: "text", text: join("And project", ZWSP, " falcon again") },
  ], { stream: true, temperature: 0.2 });
  const result = ingress(ctx(cfg), { body });
  assert.equal(result.action, "continue");
  assert.equal(result.effects.length, 1);
  const ops = result.effects[0].ops;
  assert.deepEqual(ops.map((op) => op.path), ["/messages/0/content/0/text", "/messages/0/content/2/text"]);
  const patched = applyOps(body, ops);
  assert.equal(patched.messages[0].content[0].text, "Status of ***?");
  assert.equal(patched.messages[0].content[2].text, "And *** again");
  assert.deepEqual(patched.messages[0].content[1], body.messages[0].content[1]);
  assert.equal(patched.model, body.model);
  assert.equal(patched.stream, true);
  assert.deepEqual(result.findings, [{ rule: "mask-keywords", category: "masked", count: 2 }]);
  assert.equal(result.notice.zh, "请求中的部分文本已按内容策略遮盖");
});

test("the prompt mask text is configurable", () => {
  const cfg = config({ maskText: "[hidden]" }, { maskKeywords: ["falcon"] });
  const result = ingress(ctx(cfg), { body: chat("falcon and FALCON") });
  assert.equal(result.effects[0].ops[0].value, "[hidden] and [hidden]");
});

test("log-only keywords record findings and change nothing", () => {
  const cfg = config({ logCategory: "watch" }, { logKeywords: ["refund"] });
  const result = ingress(ctx(cfg), { body: chat("I want a refund, a REFUND now") });
  assert.deepEqual(result, { action: "continue", findings: [{ rule: "log-keywords", category: "watch", count: 2 }] });
});

test("allowed phrases suppress hits inside them", () => {
  const cfg = config({}, { blockKeywords: ["secret"], allowKeywords: ["secretary", "victoria's secret"] });
  assert.equal(ingress(ctx(cfg), { body: chat("Ask the secretary about Victoria's Secret") }).action, "continue");
  assert.equal(ingress(ctx(cfg), { body: chat("Ask the secretary about the secret") }).action, "reject");
});

test("disabled categories skip their lists and rules", () => {
  const cfg = config({ disabledCategories: ["blocked", "pii"], rules: [{ pattern: "\\d{6}", type: "regex", action: "block", category: "pii" }] }, { blockKeywords: ["forbidden"] });
  assert.equal(ingress(ctx(cfg), { body: chat("forbidden 123456") }).action, "continue");
});

test("rules carry their own action, category and scope", () => {
  const cfg = config({
    rules: [
      { id: "id-number", pattern: "\\b[1-9]\\d{16}[0-9Xx]\\b", type: "regex", action: "mask", category: "pii" },
      { id: "reply-only", pattern: "launch code", action: "block", scope: "reply" },
      { pattern: "(?i)INTERNAL USE ONLY", type: "regex", action: "log", category: "confidential" },
    ],
  });
  const body = chat("ID 11010519491231002X, internal use only, launch code");
  const result = ingress(ctx(cfg), { body });
  assert.equal(result.action, "continue");
  assert.equal(applyOps(body, result.effects[0].ops).messages[0].content, "ID ***, internal use only, launch code");
  assert.deepEqual(result.findings, [
    { rule: "id-number", category: "pii", count: 1 },
    { rule: "rule-3", category: "confidential", count: 1 },
  ]);
});

test("a case-sensitive rule needs the exact case", () => {
  const cfg = config({ rules: [{ pattern: "ACME", caseSensitive: true }] });
  assert.equal(ingress(ctx(cfg), { body: chat("acme corp") }).action, "continue");
  assert.equal(ingress(ctx(cfg), { body: chat("ACME corp") }).action, "reject");
});

test("block wins over mask in the same request", () => {
  const cfg = config({}, { maskKeywords: ["falcon"], blockKeywords: ["forbidden"] });
  const result = ingress(ctx(cfg), { body: chat("falcon forbidden") });
  assert.equal(result.action, "reject");
  assert.deepEqual(result.findings.map((f) => f.rule).sort(), ["block-keywords", "mask-keywords"]);
});

test("user scope checks only user and tool text", () => {
  const cfg = config({ promptScope: "user" }, { blockKeywords: ["forbidden"] });
  const body = { model: "m", messages: [{ role: "system", content: "forbidden words list" }, { role: "assistant", content: "forbidden" }, { role: "user", content: "hi" }] };
  assert.equal(ingress(ctx(cfg), { body }).action, "continue");
  body.messages[2].content = "forbidden?";
  assert.equal(ingress(ctx(cfg), { body }).action, "reject");
});

test("Responses, Claude, Gemini and task bodies are read at the right paths", () => {
  const cfg = config({}, { maskKeywords: ["falcon"] });
  const bodies = {
    openai_responses: [{ model: "m", instructions: "about falcon", input: [{ role: "user", content: [{ type: "input_text", text: "falcon?" }, { type: "input_image", image_url: "[media:0]" }] }, { type: "function_call", name: "falcon", arguments: "{\"falcon\":1}" }] }, ["/instructions", "/input/0/content/0/text"]],
    responses_string: [{ model: "m", input: "falcon" }, ["/input"]],
    claude: [{ model: "m", max_tokens: 10, system: [{ type: "text", text: "falcon" }], messages: [{ role: "user", content: [{ type: "text", text: "a falcon" }, { type: "tool_result", tool_use_id: "t", content: "falcon data" }, { type: "image", source: { type: "base64", media_type: "image/png", data: "[media:0]" } }] }] }, ["/messages/0/content/0/text", "/messages/0/content/1/content", "/system/0/text"]],
    gemini: [{ contents: [{ role: "user", parts: [{ text: "falcon" }, { inlineData: { mimeType: "image/png", data: "[media:0]" } }] }, { role: "model", parts: [{ text: "thinking falcon", thought: true }, { text: "falcon!" }] }], systemInstruction: { parts: [{ text: "falcon" }] } }, ["/contents/0/parts/0/text", "/contents/1/parts/1/text", "/systemInstruction/parts/0/text"]],
    task: [{ model: "video-1", prompt: "a falcon flying", negative_prompt: "falcon", metadata: { note: "falcon" } }, ["/prompt", "/negative_prompt"]],
    image: [{ model: "img", prompt: "falcon", n: 1 }, ["/prompt"]],
  };
  for (const [name, [body, paths]] of Object.entries(bodies)) {
    const result = ingress(ctx(cfg, { format: name }), { body });
    assert.deepEqual(result.effects[0].ops.map((op) => op.path), paths, name);
    const patched = applyOps(body, result.effects[0].ops);
    for (const op of result.effects[0].ops) assert.ok(!op.value.toLowerCase().includes("falcon"), name + " " + op.path);
    assert.equal(patched.model, body.model, name);
  }
});

test("form bodies are read as text fields", () => {
  const cfg = config({}, { maskKeywords: ["falcon"] });
  const body = { model: "gpt-image-1", prompt: "a falcon", n: "1" };
  const result = ingress(ctx(cfg, { format: "openai_image" }), { body, form: true });
  assert.deepEqual(result.effects[0].ops, [{ op: "replace", path: "/prompt", value: "a ***" }]);
});

test("a text that names a media placeholder is rejected instead of masked", () => {
  const cfg = config({}, { maskKeywords: ["falcon"] });
  const result = ingress(ctx(cfg), { body: chat("falcon near [media:0] marker") });
  assert.equal(result.action, "reject");
  assert.equal(result.code, "content_guard.masked");
});

test("more than 32 distinct masked keywords are all masked", () => {
  const words = Array.from({ length: 50 }, (_, i) => "word" + String(i).padStart(2, "0") + "x");
  const cfg = config({}, { maskKeywords: words });
  const body = chat(words.join(" "));
  const result = ingress(ctx(cfg), { body });
  const text = applyOps(body, result.effects[0].ops).messages[0].content;
  assert.ok(!/word\d\dx/.test(text), text.slice(0, 80));
  assert.equal(result.findings[0].count, 50);
});

test("a prompt over the scan limit is checked in part or rejected", () => {
  const big = "a".repeat(5000) + " forbidden";
  const head = config({ maxScanChars: 1000 }, { blockKeywords: ["forbidden"] });
  assert.equal(ingress(ctx(head), { body: chat(big) }).action, "continue");
  const block = config({ maxScanChars: 1000, oversize: "block" }, { blockKeywords: ["forbidden"] });
  const result = ingress(ctx(block), { body: chat(big) });
  assert.equal(result.code, "content_guard.too_large");
});

test("attached documents are checked and rewritable text files masked", () => {
  const cfg = config({}, { blockKeywords: ["forbidden"], maskKeywords: ["falcon"] });
  files = [
    { ref: "[media:0]", kind: "document", mime: "text/plain", path: "/messages/0/content/1/file/file_data", rewritable: true, text: "notes on falcon" },
    { ref: "[media:1]", kind: "document", mime: "application/pdf", path: "/messages/0/content/2/file/file_data", text: "falcon in a pdf" },
    { ref: "[media:2]", kind: "image", mime: "image/png", path: "/x" },
  ];
  try {
    const result = ingress(ctx(cfg), { body: chat("hello") });
    assert.deepEqual(result.effects, [{ type: "media.text", media: "[media:0]", text: "notes on ***" }]);
    assert.equal(result.findings[0].count, 2);
    files[1].text = "forbidden in a pdf";
    assert.equal(ingress(ctx(cfg), { body: chat("hello") }).code, "content_guard.blocked");
    assert.equal(ingress(ctx(config({ checkAttachments: false }, { blockKeywords: ["forbidden"] })), { body: chat("hello") }).action, "continue");
  } finally {
    files = [];
  }
});

test("checkPrompts off skips the prompt check", () => {
  const cfg = config({ checkPrompts: false }, { blockKeywords: ["forbidden"] });
  assert.deepEqual(ingress(ctx(cfg), { body: chat("forbidden") }), { action: "continue" });
});

test("hooks do not change their arguments", () => {
  const cfg = config({ rules: [{ pattern: "\\d{4}", type: "regex", action: "mask" }] }, { maskKeywords: ["falcon"] });
  const body = chat([{ type: "text", text: "falcon 1234" }]);
  const req = { body };
  const before = JSON.stringify({ cfg, req });
  ingress(ctx(cfg), req);
  reply(ctx(cfg, { stage: "reply" }), { stream: false, outputs: [{ index: 0, text: "falcon 1234", offset: 0, final: true }] });
  assert.equal(JSON.stringify({ cfg, req }), before);
});

// ---------------------------------------------------------------------------
// Replies

function replyCtx(cfg) {
  return ctx(cfg, { stage: "reply" });
}

test("replies pass when reply checks are off or nothing applies", () => {
  assert.deepEqual(reply(replyCtx(config({ checkReplies: false }, { blockKeywords: ["x"] })), { stream: true, outputs: [] }), { action: "pass" });
  assert.deepEqual(reply(replyCtx(config({ rules: [{ pattern: "x", scope: "prompt" }] })), { stream: true, outputs: [] }), { action: "pass" });
});

test("a non-stream reply is masked at the right spans", () => {
  const cfg = config({}, { maskKeywords: ["falcon"] });
  const text = join("Project ", "Ｆａｌｃｏｎ", " and fal", ZWSP, "con.");
  const result = reply(replyCtx(cfg), { stream: false, outputs: [{ index: 0, text, offset: 0, final: true }, { index: 1, text: "clean", offset: 0, final: true }] });
  assert.equal(result.hold, 0);
  assert.deepEqual(result.mask, [{ index: 0, start: 8, end: 14 }, { index: 0, start: 19, end: 26 }]);
  assert.equal(result.findings[0].count, 2);
});

test("a blocked reply is stopped with the configured message", () => {
  const cfg = config({ replyMessage: "Stopped" }, { blockKeywords: ["forbidden"] });
  const result = reply(replyCtx(cfg), { stream: false, outputs: [{ index: 0, text: "this is forbidden", offset: 0, final: true }] });
  assert.deepEqual(result, { action: "stop", code: "content_guard.blocked", message: "Stopped", findings: [{ rule: "block-keywords", category: "blocked", count: 1 }] });
});

// The host's release of a reply result (relay/requestplugin/reply.go
// releaseReply): masks past the release point are not applied, and the held
// text comes back at the start of the next call.
function release(text, final, result) {
  const masks = (result.mask || []).slice().sort((a, b) => a.start - b.start);
  let cut = final ? text.length : Math.max(0, text.length - (result.hold || 0));
  for (const m of masks) if (m.start < cut && cut < m.end) cut = m.end;
  let out = "";
  let from = 0;
  for (const m of masks) {
    if (m.end > cut) break;
    out += text.slice(from, m.start) + "***";
    from = m.end;
  }
  out += text.slice(from, cut);
  return { released: out, held: text.slice(cut) };
}

function streamThrough(cfg, chunks) {
  let held = "";
  let client = "";
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    const final = i === chunks.length - 1;
    const text = held + chunks[i];
    const result = reply(replyCtx(cfg), { stream: true, outputs: [{ index: 0, text, offset, final }] });
    if (result.action === "stop") return { stopped: true, client };
    if (result.action === "pass") return { client: client + text + chunks.slice(i + 1).join("") };
    const r = release(text, final, result);
    client += r.released;
    offset += r.released.length;
    held = r.held;
  }
  return { client };
}

test("a streamed keyword split across chunks is still masked", () => {
  const cfg = config({}, { maskKeywords: ["project falcon"] });
  const full = "We talked about project falcon yesterday and Project Falcon today.";
  for (let size = 1; size <= 9; size++) {
    const chunks = [];
    for (let i = 0; i < full.length; i += size) chunks.push(full.slice(i, i + size));
    const { client } = streamThrough(cfg, chunks);
    assert.equal(client, "We talked about *** yesterday and *** today.", "chunk size " + size);
  }
});

test("a streamed keyword split by zero-width characters across chunks is masked", () => {
  const cfg = config({}, { maskKeywords: ["违禁词"] });
  const chunks = ["前文", "违", ZWSP, " 禁", " ", "词", "后文"];
  assert.equal(streamThrough(cfg, chunks).client, "前文***后文");
});

test("a streamed blocked keyword stops the reply before it reaches the client", () => {
  const cfg = config({}, { blockKeywords: ["forbidden"] });
  const { stopped, client } = streamThrough(cfg, ["This is ", "forb", "idden text"]);
  assert.equal(stopped, true);
  assert.ok(!client.includes("forb"), client);
});

test("the stream hold follows the rules and the setting", () => {
  const out = (cfg) => reply(replyCtx(cfg), { stream: true, outputs: [{ index: 0, text: "x", offset: 0, final: false }] }).hold;
  assert.equal(out(config({}, { maskKeywords: ["abcdef"] })), 24);
  assert.equal(out(config({ normalize: false }, { maskKeywords: ["abcdef"] })), 5);
  assert.equal(out(config({ rules: [{ pattern: "\\d+", type: "regex", action: "mask" }] })), 256);
  assert.equal(out(config({ streamHold: 40 }, { maskKeywords: ["abcdef"] })), 40);
});

test("a regex mask in a stream holds enough text", () => {
  const cfg = config({ rules: [{ pattern: "\\b[1-9]\\d{16}[0-9Xx]\\b", type: "regex", action: "mask", category: "pii" }] });
  const full = "id 11010519491231002X ok";
  const chunks = full.match(/.{1,3}/g);
  assert.equal(streamThrough(cfg, chunks).client, "id *** ok");
});

// ---------------------------------------------------------------------------
// Cost

test("a large mixed-script prompt is checked quickly", () => {
  const cfg = config({ rules: [{ pattern: "\\b\\d{17}[0-9Xx]\\b", type: "regex", action: "mask" }] }, { blockKeywords: ["forbidden"], maskKeywords: ["falcon"] });
  const text = "普通的中文内容 with English words, ＦＵＬＬ width 和 空 格。".repeat(20000);
  const started = Date.now();
  const result = ingress(ctx(cfg), { body: chat(text) });
  const elapsed = Date.now() - started;
  assert.equal(result.action, "continue");
  assert.ok(elapsed < 2000, "took " + elapsed + " ms for " + text.length + " characters");
});
