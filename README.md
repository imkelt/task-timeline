# Task Timeline

Task Timeline keeps a simple to-do note and a chronological completed-task note in sync.

When you check a task in your configured to-do note, the plugin moves the completed task into a date group in your completed note. In Reading view, the completed note is rendered as a compact timeline.

## Features

- Automatically archives completed Markdown checklist items.
- Groups completed tasks by the completion date.
- Keeps the newest date group at the top by default.
- Preserves indented child content under a completed task.
- Supports custom vault-relative file paths such as `0 待办` or `Tasks/0 待办.md`.
- Supports `YYYY`, `MM`, and `DD` in the date format.
- Adds a manual **Archive completed tasks now** command.
- Uses ordinary Markdown; the archive remains readable even if the plugin is disabled.
- Works locally and does not use the network, telemetry, or external services.

## Example

To-do note:

```md
# 待办

- [ ] Learn LoRA
- [x] Deploy Qwen with vLLM
```

After archiving, the completed note contains:

```md
# 已完成

## 20260913
- [x] Deploy Qwen with vLLM
```

If more tasks are completed on the same day, they are appended under the same date.

## Setup

1. Enable **Task Timeline** in **Settings -> Community plugins**.
2. Open **Settings -> Task Timeline**.
3. Choose the to-do note and completed note.
4. Check a task in the to-do note.

The `.md` extension is optional in settings. For example, both `0 待办` and `0 待办.md` resolve to the same Markdown file.

## Timeline appearance

The timeline styling is applied in **Reading view**. Live Preview remains intentionally close to Obsidian's normal editor so task editing stays stable across themes.

The underlying Markdown is never replaced by custom HTML.

## Manual installation

Copy these release files into:

```text
<Vault>/.obsidian/plugins/task-timeline/
```

Files:

```text
main.js
manifest.json
styles.css
```

Restart Obsidian or reload community plugins, then enable **Task Timeline**.

## Development

Requirements:

- Node.js 18 or newer
- npm

Install dependencies:

```bash
npm install
```

Build `src/main.ts` into the release `main.js`:

```bash
npm run build
```

Watch while developing:

```bash
npm run dev
```

Validate the release metadata and required files:

```bash
npm run check-release
```

Prepare a folder containing the three release assets:

```bash
npm run release:assets
```

There are no runtime npm dependencies; the generated `main.js` only imports the Obsidian API.

## Privacy

Task Timeline operates only on files inside the current Obsidian vault. It does not send network requests, collect telemetry, display ads, or access files outside the vault.

## License

MIT. See [LICENSE](./LICENSE).

---

## 中文说明

Task Timeline 用来维护两个笔记：一个“待办”，一个“已完成”。

当你在待办笔记中把：

```md
- [ ] 学习 vLLM
```

勾选为：

```md
- [x] 学习 vLLM
```

插件会自动把任务从待办中移走，并按当天日期写入“已完成”笔记：

```md
## 20260913
- [x] 学习 vLLM
```

同一天完成多个任务会自动归到同一个日期下面。阅读视图中会显示为时间线样式，底层仍然保持普通 Markdown。
