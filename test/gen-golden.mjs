// Writes test/golden.json from the plugin's own results in Node. The host
// replays it with `new-api plugin test plugin.js --fixture test/golden.json`,
// so the cases prove the host's JavaScript engine gives the same results.
// Keyword lists and attachments need a request context the fixture runner
// does not have, so the cases use rules only and checkAttachments off.
import { writeFileSync } from "node:fs";

globalThis.utils = {};
const { meta, ingress, reply, validateConfig } = await import("../plugin.js");

function config(overrides) {
  const out = {};
  for (const [name, field] of Object.entries(meta.configSchema.properties)) {
    if (field.default !== undefined && field.format !== "keywords") out[name] = field.default;
  }
  out.checkAttachments = false;
  return Object.assign(out, overrides);
}

const rule = (r) => Object.assign({ type: "keyword", action: "block", category: "custom", scope: "both", caseSensitive: false }, r);
const ctx = (cfg, extra) => Object.assign({ stage: "ingress", format: "openai", path: "/v1/chat/completions", model: "gpt-4o-mini", attempt: 0, instance: { id: "fixture", name: "fixture" }, config: cfg }, extra || {});
const chat = (content) => ({ model: "gpt-4o-mini", stream: false, messages: [{ role: "user", content }] });

const blockCfg = config({ rules: [rule({ id: "cjk", pattern: "违禁词", category: "policy" }), rule({ id: "word", pattern: "forbidden topic" })] });
const maskCfg = config({ maskText: "[x]", rules: [rule({ id: "id-number", pattern: "\\b[1-9]\\d{16}[0-9Xx]\\b", type: "regex", action: "mask", category: "pii" }), rule({ id: "falcon", pattern: "project falcon", action: "mask", category: "codename" }), rule({ id: "watch", pattern: "(?i)REFUND", type: "regex", action: "log", category: "support" })] });
const replyCfg = config({ rules: [rule({ id: "falcon", pattern: "falcon", action: "mask", category: "codename" }), rule({ id: "stop", pattern: "launch code", scope: "reply" })] });

const cases = [];
const add = (name, hook, args) => {
  let expected;
  try {
    expected = hook === "validateConfig" ? null : { ingress, reply }[hook](...args);
    if (hook === "validateConfig") validateConfig(...args);
  } catch (error) {
    cases.push({ name, hook, args, expectedError: error.message });
    return;
  }
  cases.push({ name, hook, args, expected: expected === undefined ? null : expected });
};

add("block: CJK keyword split by full-width spaces and zero-width characters", "ingress", [ctx(blockCfg), { body: chat("请解释 违　禁\u200b词 的含义") }]);
add("block: keyword ignores letter case", "ingress", [ctx(blockCfg), { body: chat("About the FORBIDDEN TOPIC") }]);
add("continue: clean text", "ingress", [ctx(blockCfg), { body: chat("A normal question about the weather") }]);
add("mask: regex and keyword in multimodal text parts, log-only finding", "ingress", [ctx(maskCfg), { body: chat([{ type: "text", text: "ID 11010519491231002X, Project \u200bFalcon? Refund please" }, { type: "image_url", image_url: { url: "[media:0]" } }, { type: "text", text: "ＰＲＯＪＥＣＴ ＦＡＬＣＯＮ" }]) }]);
add("mask: Claude system and Gemini parts", "ingress", [ctx(maskCfg, { format: "claude" }), { body: { model: "claude-x", max_tokens: 8, system: "about project falcon", messages: [{ role: "user", content: [{ type: "text", text: "project falcon" }] }] } }]);
add("mask: Gemini contents", "ingress", [ctx(maskCfg, { format: "gemini" }), { body: { contents: [{ role: "user", parts: [{ text: "project falcon" }] }] } }]);
add("reply: non-stream mask", "reply", [ctx(replyCfg, { stage: "reply" }), { stream: false, outputs: [{ index: 0, text: "The Falcon and the fal\u200bcon", offset: 0, final: true }] }]);
add("reply: stream holds text for a split keyword", "reply", [ctx(replyCfg, { stage: "reply" }), { stream: true, outputs: [{ index: 0, text: "Our project fal", offset: 0, final: false }] }]);
add("reply: stop", "reply", [ctx(replyCfg, { stage: "reply" }), { stream: true, outputs: [{ index: 0, text: "here is the launch code", offset: 10, final: false }] }]);
add("reply: pass when replies are not checked", "reply", [ctx(config({ checkReplies: false, rules: [rule({ pattern: "x" })] }), { stage: "reply" }), { stream: true, outputs: [] }]);
add("validateConfig: sound rules", "validateConfig", [maskCfg]);
add("validateConfig: refuses nested repetition", "validateConfig", [config({ rules: [rule({ id: "slow", pattern: "(a+)+$", type: "regex" })] })]);
add("validateConfig: refuses invalid expression", "validateConfig", [config({ rules: [rule({ id: "bad", pattern: "(", type: "regex" })] })]);

for (const c of cases) if (c.expectedError === undefined && c.hook !== "validateConfig" && c.expected === null) throw new Error("no result for " + c.name);
writeFileSync(new URL("./golden.json", import.meta.url), JSON.stringify({ cases }, null, 2) + "\n");
console.log("wrote", cases.length, "cases");
