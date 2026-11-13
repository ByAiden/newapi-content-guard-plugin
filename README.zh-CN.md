---
locale: zh-CN
---

# Content Guard

[English](README.md) | **简体中文**

New API 的请求处理插件：在请求计价和发送之前检查提示词，在客户端收到之前检查模型回复。管理员导入自己的关键词列表和正则表达式，每次命中都属于一个分类，并对应一个动作：

- **拦截**：请求以 HTTP 400 `request_rejected` 拒绝；回复以 `response_rejected` 中止（流式回复为一个错误事件）。
- **遮盖**：替换命中的文本。请求中的替换文本可配置（默认 `***`），回复中由网关固定写为 `***`。
- **仅记录**：命中只计入日志，文本原样通过。

匹配前会先规范化文本，常见的绕过写法仍能命中：全角字母数字、零宽字符，以及被空格或符号隔开的中日韩字符（`违 禁 词`、`违.禁.词`、`违＊禁＊词`）。

插件不内置任何词库。需要拦截的内容因司法辖区、行业和用户群体而异，由管理员自行导入适用的列表。

需要 new-api v1.0.0-rc.50 或更高版本（请求处理插件、`utils.keywords`）。更早的版本无法加载只有请求处理部分的插件。

## 安装

1. 在管理后台的插件页面上传 `plugin.js`（或从社区市场安装），然后启用。
2. 打开请求插件设置，添加一个 Content Guard 实例。

本插件不是渠道类型，不会绑定为类型 61 的任务插件渠道。

## 添加实例

实例是插件的一份配置。可以同时运行多个实例，例如面向公开分组的严格实例和面向内部用户的宽松实例。

- **全局**：对所有请求生效。
- **分组**：对所列用户分组的请求生效。
- **模型**：只对所列模型生效（精确匹配，忽略 `@` 修饰）；留空表示所有模型。
- **渠道绑定**：渠道可在请求插件设置中按 id 绑定实例。绑定的实例在每次渠道尝试时，对为该渠道构建的请求体检查提示词。

先运行全局实例，再运行分组实例，最后运行渠道绑定的实例。保存前可以用试运行和内置示例验证配置。

## 配置项

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `blockKeywords` | 空 | 关键词列表，每行一个。命中的请求被拒绝，命中的回复被中止 |
| `blockCategory` | `blocked` | 拦截列表命中时记录的分类，也是错误码 `content_guard.CATEGORY` 的后缀 |
| `maskKeywords` | 空 | 关键词列表，请求和回复中的每处命中都被遮盖 |
| `maskCategory` | `masked` | 遮盖列表的分类 |
| `logKeywords` | 空 | 关键词列表，命中只计入日志 |
| `logCategory` | `flagged` | 仅记录列表的分类 |
| `allowKeywords` | 空 | 放行短语。完全落在其中某个短语内部的命中被忽略（例如拦截 `secret` 时放行 `secretary`） |
| `keywordsCaseSensitive` | 关 | 四个列表匹配时区分大小写 |
| `rules` | 空 | 最多 200 条规则，每条含 `id`、`pattern`、`type`（`keyword` 或 `regex`）、`action`（`block`、`mask`、`log`）、`category`、`scope`（`both`、`prompt`、`reply`）和 `caseSensitive` |
| `disabledCategories` | 空 | 跳过的分类，对列表和规则都生效。要临时关闭某个分类时在这里填写，无需删除规则 |
| `checkPrompts` | 开 | 检查请求文本 |
| `promptScope` | `all` | `all` 检查 system、user、assistant 和工具文本；`user` 只检查用户消息和工具结果 |
| `checkAttachments` | 开 | 同时读取请求附带的文本、PDF 和 DOCX 文件 |
| `checkReplies` | 开 | 检查模型回复 |
| `normalize` | 开 | 匹配前规范化文本（见下文） |
| `blockMessage` | 空 | 请求被拒绝时的提示；留空使用 "The request contains content that is not allowed" |
| `replyMessage` | 空 | 回复被中止时的提示；留空使用 "The answer was stopped by the content policy" |
| `maskText` | `***` | 请求中被遮盖文本的替换内容 |
| `streamHold` | `0` | 流式回复每次保留的字符数，用于发现跨块的命中；`0` 时按规则自动计算 |
| `maxScanChars` | `1000000` | 每个请求（以及每次回复检查）检查的文本量，超出部分不检查 |
| `oversize` | `scan_head` | 请求超过上限时：`scan_head` 只检查前面部分，`block` 拒绝请求 |

分类名只能使用小写字母、数字、`_` 和 `-`，最多 40 个字符。

### 导入关键词列表

把列表粘贴到关键词字段中，每行一条。列表保存在网关内部：插件只能看到列表的大小，并通过网关的多模式匹配器查询某段文本包含哪些条目，所以几万条的列表和短列表开销相近。重复行和空行会被忽略。

条目要按规范化后的样子书写：

- 使用半角字母和数字（写 `abc`，不写 `ａｂｃ`）；
- 中日韩词语的字符之间不加空格或符号（写 `违禁词`，不写 `违 禁 词`）；
- 不区分大小写时（默认），条目的大小写无关紧要。

需要不同作用范围、模型或分组的列表，请分别建实例。

### 规则

关键词规则在规范化后按字面匹配。正则规则使用 JavaScript 正则表达式，开头的 `(?i)` 表示不区分大小写。示例：

```json
[
  {"id": "id-card-number", "pattern": "\\b[1-9]\\d{16}[0-9Xx]\\b", "type": "regex", "action": "mask", "category": "pii"},
  {"id": "internal-memo", "pattern": "(?i)internal use only", "type": "regex", "action": "log", "category": "confidential"},
  {"id": "reply-only", "pattern": "launch code", "type": "keyword", "action": "block", "category": "weapons", "scope": "reply"}
]
```

保存实例时会编译每条规则。无法编译、能匹配空文本，或使用了可能导致匹配缓慢的写法（反向引用、前后断言、本身含重复的重复分组如 `(a+)+`）的规则会被拒绝，并给出规则名。

### 规范化

开启 `normalize` 时，匹配前：

- 全角 ASCII 字符和全角空格转为半角；
- 删除零宽和不可见格式字符（U+200B 至 U+200F、U+202A 至 U+202E、U+2060 至 U+2064、U+FEFF、软连字符）；
- 删除两个中日韩字符之间的空格、制表符以及符号 `. - _ * · • | / \ ~ + ・`。换行保留。

遮盖作用于原始文本，并覆盖命中范围内被规范化删除的字符。

## 日志内容

每个有发现、遮盖或中止动作的实例，会在用户的消费日志或错误日志中留下一条记录：阶段、各分类及次数、回复中被遮盖的片段数和拒绝码。管理员还能看到规则 ID。插件从不记录命中的文本、提示词或回复。拒绝提示是配置中的固定文本。

## 错误响应

- 请求被拒绝：HTTP 400，错误码 `request_rejected`，消息为 `BLOCK_MESSAGE (code: content_guard.CATEGORY)`，格式与路由一致（OpenAI、Claude 或 Gemini）。不扣费，也不会换渠道重试。
- 非流式回复被中止：HTTP 400，错误码 `response_rejected`，消息为 `REPLY_MESSAGE (code: content_guard.CATEGORY)`。流式回复被中止：先收到客户端格式的错误事件，然后流结束。计费按上游用量，与客户端中途断开相同。
- `oversize` 为 `block` 且请求超过 `maxScanChars`：错误码 `content_guard.too_large`。

## 失败时的行为

插件没有声明 `optional`，因此失败即拦截：实例出错（超时、hook 异常、返回无效结果）时，请求以 HTTP 500 `request_plugin_failed` 结束，而不是未经检查放行。规则在保存实例时编译，错误的规则会在保存时被拒绝，不会让请求失败。

## 覆盖范围

- 请求：Chat Completions、Responses（instructions 和 input）、Claude Messages（system、文本块、工具结果、文本文档）、Gemini（`contents`、`systemInstruction`）、Completions、Embeddings、图片提示词、表单字段（图片编辑、语音转写），以及任务提交的提示词（`prompt`、`negative_prompt`、`lyrics`、`input.prompt`、`instances[].prompt`）。只读取文本部分，图片、音频等媒体原样通过。
- 附件：网关能读取的文本、PDF 和 DOCX 文件。拦截命中会拒绝请求；遮盖命中会改写纯文本文件，PDF、DOCX 和表单文件网关无法改写，只记录。
- 回复：Chat Completions、Responses、Claude Messages 以及 Gemini `generateContent` / `streamGenerateContent`，流式和非流式，以及 Responses WebSocket 和 Realtime 会话中的文本。

## 限制

- 关键词列表只按条目原文整体匹配，不做词形还原、音译、拼音、谐音或图片识别。需要外部审核模型（OpenAI moderation 或兼容服务）时，请同时使用网关内置的 `content-moderation` 插件；本插件不发起任何外部调用。
- 不检查：工具定义、工具调用参数、推理和思考文本、图片、音频，以及上述四类之外的回复接口（Embeddings、图片、音频、重排序、任务）。Chat Completions 回复的 `content` 为分段数组时，网关不检查。
- 回复中的遮盖固定为 `***`，网关不允许插件自定义替换文本。
- 流式：每次保留 `streamHold` 个字符（自动：开启规范化时为最长关键词的 4 倍，关闭时为最长关键词长度减一，有正则规则时至少 256），这部分文本会延迟发出。长于保留长度的正则命中可能未遮盖就已发出，长模式请调大 `streamHold`。
- `utils.keywords` 每次最多返回 32 个不同条目；插件会继续查找，最多 8 轮，因此每段文本最多能找到 256 个不同条目。
- 拉丁字母之间的分隔符不会删除（`b a d` 不会命中 `bad`），以免把普通单词拼在一起。
- 正则表达式在插件的 JavaScript 引擎中运行。保存时的检查能拦下常见的慢模式，但不能保证全部拦下；请保持模式简单。hook 运行超过 5 秒会使请求失败（失败即拦截）。

### 误报

- 短条目会命中更长单词的一部分（`ass` 命中 `class`）；把长单词加入 `allowKeywords`，或改用带 `\b` 单词边界的正则规则。
- 跨空格和符号合并中日韩字符，可能把相邻的两个词拼成一个命中；可在该实例关闭 `normalize`，或把该短语加入 `allowKeywords`。
- `promptScope` 为 `all` 时，之前的助手回复或 system 提示词中的词也会拦截下一轮对话；只想检查用户输入时用 `user`。

### 漏报

- `oversize` 为 `scan_head` 时超过 `maxScanChars` 的文本。
- 分散在两条消息或两个分段里的内容，或用其他文字中形近字母拼写的内容。
- 以全角形式录入，或中日韩字符之间带空格的列表条目（见导入关键词列表）。

## 开发

```sh
npm test                                              # 单元测试（node --test）
new-api plugin lint plugin.js                         # 网关编译检查
new-api plugin test plugin.js --fixture test/golden.json
node test/gen-golden.mjs                              # 重新生成 fixture
```

关键词列表和附件需要请求上下文，fixture 运行器不提供，所以 fixture 用例只使用规则；单元测试对 `utils.keywords` 做了桩实现。
