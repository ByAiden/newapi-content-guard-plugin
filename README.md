---
locale: en
translations:
  zh-CN: README.zh-CN.md
---

# Content Guard

**English** | [简体中文](README.zh-CN.md)

A request processing plugin for New API that checks prompts before they are priced and sent, and model replies before the client sees them. Administrators load their own keyword lists and regular expressions; every hit belongs to a category and has an action:

- **Block**: a prompt is rejected with HTTP 400 `request_rejected`; a reply is stopped with `response_rejected` (an error event in a stream).
- **Mask**: the matched text is replaced. In prompts the replacement is configurable (default `***`); in replies the host always writes `***`.
- **Log only**: the hit is counted in the logs and the text passes unchanged.

Text is normalized before matching, so common evasions still match: full-width letters and digits, zero-width characters, and CJK characters split by spaces or symbols (`违 禁 词`, `违.禁.词`, `违＊禁＊词`).

The plugin ships with no word lists. What must be blocked differs by jurisdiction, industry and audience, so each administrator loads the lists that apply to them.

Requires new-api v1.0.0-rc.50 or later (request processing plugins, `utils.keywords`). Older hosts refuse to load a plugin with only a request processing part.

## Install

1. In the admin console open the plugin page and upload `plugin.js` (or install it from the community market), then switch it on.
2. Open the request plugin settings and add an instance of Content Guard.

The plugin is not a channel type and is never bound as a type-61 Task Plugin channel.

## Adding an instance

An instance is one configured use of the plugin. Several instances may run side by side, for example a strict one for a public group and a lighter one for internal users.

- **Global**: runs on every request.
- **Groups**: runs on requests of the listed user groups.
- **Models**: limits the instance to the listed models (exact names, `@` modifiers ignored); empty means every model.
- **Channel binding**: a channel can bind instances by id in its request plugin setting. A bound instance checks the prompt on each channel attempt, on the body built for that channel.

Global instances run first, then group instances, then the ones the channel binds. Use the dry run button with the built-in samples to try a configuration before saving it.

## Settings

| Field | Default | Meaning |
| --- | --- | --- |
| `blockKeywords` | empty | Keyword list, one per line. A prompt that holds one is rejected; a reply is stopped |
| `blockCategory` | `blocked` | Category recorded for hits of the blocked list; also the suffix of the error code `content_guard.CATEGORY` |
| `maskKeywords` | empty | Keyword list; every occurrence is masked in prompts and replies |
| `maskCategory` | `masked` | Category of the masked list |
| `logKeywords` | empty | Keyword list; hits are only counted in the logs |
| `logCategory` | `flagged` | Category of the logged list |
| `allowKeywords` | empty | Allowed phrases. A hit that lies completely inside one of them is ignored (for example `secretary` when `secret` is blocked) |
| `keywordsCaseSensitive` | off | Letter case must match for the four lists |
| `rules` | empty | Up to 200 rules, each with `id`, `pattern`, `type` (`keyword` or `regex`), `action` (`block`, `mask`, `log`), `category`, `scope` (`both`, `prompt`, `reply`) and `caseSensitive` |
| `disabledCategories` | empty | Categories to skip, for lists and rules alike. Turn a category off here instead of deleting its rules |
| `checkPrompts` | on | Check request text |
| `promptScope` | `all` | `all` checks system, user, assistant and tool text; `user` checks user messages and tool results only |
| `checkAttachments` | on | Also read text, PDF and DOCX files attached to the request |
| `checkReplies` | on | Check the model's answer |
| `normalize` | on | Normalize text before matching (see below) |
| `blockMessage` | empty | Message of a rejected prompt; empty uses "The request contains content that is not allowed" |
| `replyMessage` | empty | Message of a stopped reply; empty uses "The answer was stopped by the content policy" |
| `maskText` | `***` | Replacement for masked prompt text |
| `streamHold` | `0` | Characters held back per streamed chunk so a match split across chunks is still found; `0` picks it from the rules |
| `maxScanChars` | `1000000` | Text checked per request (and per reply call); the rest is not checked |
| `oversize` | `scan_head` | When a prompt is longer: `scan_head` checks the first part, `block` rejects the request |

Category names use lowercase letters, digits, `_` and `-`, at most 40 characters.

### Loading keyword lists

Paste a list into a keyword field, one entry per line. The list stays inside the gateway: the plugin only sees its size and asks the gateway's multi-pattern matcher which entries a text holds, so lists with tens of thousands of entries cost about the same as short ones. Duplicates and blank lines are ignored.

Write entries the way normalized text looks:

- half-width letters and digits (`abc`, not `ａｂｃ`);
- CJK words without spaces or symbols between the characters (`违禁词`, not `违 禁 词`);
- with case-insensitive matching (the default) the case of an entry does not matter.

Use separate instances when lists need different scopes, models or groups.

### Rules

A keyword rule matches its text literally after normalization. A regex rule is a JavaScript regular expression; a leading `(?i)` makes it case-insensitive. Example rules:

```json
[
  {"id": "id-card-number", "pattern": "\\b[1-9]\\d{16}[0-9Xx]\\b", "type": "regex", "action": "mask", "category": "pii"},
  {"id": "internal-memo", "pattern": "(?i)internal use only", "type": "regex", "action": "log", "category": "confidential"},
  {"id": "reply-only", "pattern": "launch code", "type": "keyword", "action": "block", "category": "weapons", "scope": "reply"}
]
```

Saving an instance compiles every rule. A pattern that does not compile, matches empty text, or uses constructs that can make matching slow (backreferences, lookarounds, a repeated group that itself holds a repetition such as `(a+)+`) is refused with a message naming the rule.

### Normalization

With `normalize` on, before matching:

- full-width ASCII forms and the ideographic space become half-width;
- zero-width and invisible format characters (U+200B to U+200F, U+202A to U+202E, U+2060 to U+2064, U+FEFF, soft hyphen) are dropped;
- spaces, tabs and the symbols `. - _ * · • | / \ ~ + ・` between two CJK characters are dropped. Line breaks are kept.

Masks are applied to the original text and cover the characters normalization dropped inside a match.

## What the logs show

Every instance that found, masked or stopped something adds an entry to the user's consume or error log: the stage, the categories with their counts, the number of masked spans in the reply, and the rejection code. Administrators also see the rule ids. Matched text, prompts and replies are never written by the plugin. Rejection messages are fixed strings from the settings.

## Error responses

- Rejected prompt: HTTP 400, error code `request_rejected`, message `BLOCK_MESSAGE (code: content_guard.CATEGORY)`, in the error format of the route (OpenAI, Claude or Gemini). Nothing is charged and no other channel is tried.
- Stopped reply, non-stream: HTTP 400, code `response_rejected`, message `REPLY_MESSAGE (code: content_guard.CATEGORY)`. Stopped stream: an error event in the client's format, then the stream ends. Billing follows the upstream usage, as for a client that disconnects.
- A prompt over `maxScanChars` with `oversize: block`: code `content_guard.too_large`.

## Failure behavior

The plugin does not declare `optional`, so it fails closed: if an instance fails (a timeout, a hook error, an invalid result), the request is answered with HTTP 500 `request_plugin_failed` instead of going through unchecked. Rules are compiled when the instance is saved, so a bad rule is refused there rather than failing requests.

## Coverage

- Prompts: chat completions, Responses (instructions and input), Claude Messages (system, text blocks, tool results, text documents), Gemini (`contents`, `systemInstruction`), completions, embeddings, image prompts, form fields (image edits, transcriptions), and task submission prompts (`prompt`, `negative_prompt`, `lyrics`, `input.prompt`, `instances[].prompt`). Only text parts are read; images, audio and other media pass unchanged.
- Attachments: text, PDF and DOCX files the gateway can read. A blocked hit rejects the request; a masked hit rewrites a plain text file and is logged only in a PDF, DOCX or form file, which the gateway cannot rewrite.
- Replies: chat completions, Responses, Claude Messages and Gemini `generateContent` / `streamGenerateContent`, streamed or not, and the text of Responses WebSocket and Realtime sessions.

## Limitations

- Keyword lists only match whole entries as written. There is no stemming, transliteration, pinyin, homophone or image matching. Pair this plugin with the built-in `content-moderation` plugin when an external moderation model (OpenAI moderation or a compatible service) is wanted; this plugin makes no outbound calls.
- Not checked: tool definitions, tool call arguments, reasoning and thinking text, images, audio, and reply endpoints other than the four above (embeddings, images, audio, rerank, tasks). Chat completions replies whose `content` comes as parts are left unchecked by the gateway.
- Reply masks are always `***`; the host does not let a plugin choose the replacement.
- Streaming: text is held back by `streamHold` characters (auto: four times the longest keyword with normalization on, the longest keyword minus one with it off, and at least 256 with regex rules), which delays that much text. A regex match longer than the hold may be released unmasked; raise `streamHold` for long patterns.
- `utils.keywords` returns at most 32 distinct entries per call; the plugin searches again, up to 8 rounds, so up to 256 distinct entries per text are found.
- Separators between Latin letters are not dropped (`b a d` does not match `bad`), to avoid joining ordinary words.
- Regular expressions run in the plugin's JavaScript engine. The checks on save catch the usual slow patterns but not every one; keep patterns simple. A hook that runs past 5 seconds fails the request (fail closed).

### False positives

- Short entries match inside longer words (`ass` in `class`); add the longer words to `allowKeywords`, or use a regex rule with `\b` word boundaries.
- Joining CJK characters across spaces and symbols can create a match from two neighbouring words; turn `normalize` off for that instance or add the phrase to `allowKeywords`.
- With `promptScope: all`, a word in an earlier assistant answer or a system prompt blocks the next turn too; use `user` to check only what users write.

### False negatives

- Text past `maxScanChars` with `oversize: scan_head`.
- Content split across two messages or two parts, or spelled with look-alike letters from other scripts.
- Lists entered in full-width forms or with spaces between CJK characters (see Loading keyword lists).

## Development

```sh
npm test                                              # unit tests (node --test)
new-api plugin lint plugin.js                         # host compile check
new-api plugin test plugin.js --fixture test/golden.json
node test/gen-golden.mjs                              # rebuild the fixture
```

The fixture cases use rules only, because keyword lists and attachments need a request context the fixture runner does not provide; the unit tests stub `utils.keywords`.
