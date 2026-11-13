---
changelogVersion: 1
plugin: "byaiden_content_guard"
version: "1.0.0"
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---

# Changelog

## [1.0.0]

### Added

- Request processing plugin that checks prompts at ingress and model replies before the client gets them, on chat completions, Responses, Claude Messages and Gemini, streamed or not.
- Administrator keyword lists for block, mask and log-only actions, matched by the gateway's multi-pattern matcher, with an allowed-phrase list to suppress false positives.
- Up to 200 keyword or regular expression rules, each with its own action, category, scope (prompts, replies or both) and case sensitivity; categories can be switched off per instance.
- Text normalization against common evasions: full-width forms, zero-width characters and CJK characters split by spaces or symbols.
- Masking of prompt text parts with a configurable replacement, streaming-safe reply masking with an automatic hold, and checks of attached text, PDF and DOCX files.
- Configurable rejection and stop messages with error codes `content_guard.CATEGORY`, findings by rule and category in the logs without matched text, and rule checks when an instance is saved.
