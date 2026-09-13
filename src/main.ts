import {
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	normalizePath,
} from "obsidian";

interface TaskTimelineSettings {
	todoFile: string;
	doneFile: string;
	dateFormat: string;
	newestFirst: boolean;
	showArchiveNotice: boolean;
}

interface ExtractResult {
	remaining: string;
	completedBlocks: string[];
}

const DEFAULT_SETTINGS: TaskTimelineSettings = {
	todoFile: "待办.md",
	doneFile: "已完成.md",
	dateFormat: "YYYYMMDD",
	newestFirst: true,
	showArchiveNotice: true,
};

class TaskTimelinePlugin extends Plugin {
	settings: TaskTimelineSettings = DEFAULT_SETTINGS;
	private isProcessing = false;
	private decorationTimers = new Set<number>();

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new TaskTimelineSettingTab(this.app, this));

		this.registerMarkdownPostProcessor((_el, ctx) => {
			if (ctx.sourcePath !== this.getDonePath()) return;
			this.scheduleTimelineDecoration();
		});

		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.scheduleTimelineDecoration();
			}),
		);

		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.scheduleTimelineDecoration();
			}),
		);

		this.app.workspace.onLayoutReady(() => {
			this.scheduleTimelineDecoration();
		});

		this.registerEvent(
			this.app.vault.on("modify", async (file) => {
				if (this.isProcessing) return;
				if (file.path !== this.getTodoPath()) return;
				await this.archiveCompletedTasks(false);
			}),
		);

		this.addCommand({
			id: "archive-completed-tasks-now",
			name: "Archive completed tasks now",
			callback: async () => {
				await this.archiveCompletedTasks(true);
			},
		});
	}

	onunload(): void {
		for (const timer of this.decorationTimers) {
			window.clearTimeout(timer);
		}
		this.decorationTimers.clear();
	}

	private getTodoPath(): string {
		return this.resolveMarkdownPath(this.settings.todoFile, DEFAULT_SETTINGS.todoFile);
	}

	private getDonePath(): string {
		return this.resolveMarkdownPath(this.settings.doneFile, DEFAULT_SETTINGS.doneFile);
	}

	private resolveMarkdownPath(value: string, fallback: string): string {
		const raw = value.trim() || fallback;
		let path = normalizePath(raw);
		if (!path.toLowerCase().endsWith(".md")) {
			path += ".md";
		}
		return path;
	}

	private scheduleTimelineDecoration(): void {
		for (const delay of [0, 80]) {
			const timer = window.setTimeout(() => {
				this.decorationTimers.delete(timer);
				this.decorateTimelineViews();
			}, delay);
			this.decorationTimers.add(timer);
		}
	}

	private decorateTimelineViews(): void {
		const donePath = this.getDonePath();
		const leaves = this.app.workspace.getLeavesOfType("markdown");

		for (const leaf of leaves) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;
			if (!view.file || view.file.path !== donePath) continue;

			const preview = view.contentEl.querySelector<HTMLElement>(".markdown-preview-view");
			if (!preview) continue;

			preview.querySelectorAll(".tt-date-wrap").forEach((element) => {
				element.classList.remove("tt-date-wrap");
			});
			preview.querySelectorAll(".tt-tasks-wrap").forEach((element) => {
				element.classList.remove("tt-tasks-wrap");
			});

			const headings = Array.from(preview.querySelectorAll<HTMLHeadingElement>("h2"));

			for (const heading of headings) {
				const dateWrap = heading.closest<HTMLElement>(".el-h2") ?? heading.parentElement;
				if (!dateWrap) continue;

				let next = dateWrap.nextElementSibling;
				let tasksWrap: Element | null = null;

				while (next) {
					if (next.classList.contains("el-h2") || next.querySelector("h2")) {
						break;
					}
					if (next.querySelector("ul.contains-task-list")) {
						tasksWrap = next;
						break;
					}
					next = next.nextElementSibling;
				}

				if (!tasksWrap) continue;

				dateWrap.classList.add("tt-date-wrap");
				tasksWrap.classList.add("tt-tasks-wrap");
			}
		}
	}

	private async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) as Partial<TaskTimelineSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.scheduleTimelineDecoration();
	}

	private formatDate(date: Date): string {
		const year = String(date.getFullYear());
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return this.settings.dateFormat
			.replace(/YYYY/g, year)
			.replace(/MM/g, month)
			.replace(/DD/g, day);
	}

	private extractCompletedTaskBlocks(content: string): ExtractResult {
		const lines = content.replace(/\r\n/g, "\n").split("\n");
		const keep: string[] = [];
		const completedBlocks: string[] = [];

		let index = 0;

		while (index < lines.length) {
			const line = lines[index];
			const match = line.match(/^(\s*)[-*+]\s+\[[xX]\]\s+.+$/);

			if (!match) {
				keep.push(line);
				index += 1;
				continue;
			}

			const baseIndent = match[1].length;
			const block: string[] = [line.slice(baseIndent)];
			index += 1;

			while (index < lines.length) {
				const next = lines[index];

				if (next.trim() === "") {
					let lookahead = index;
					while (lookahead < lines.length && lines[lookahead].trim() === "") {
						lookahead += 1;
					}

					if (lookahead < lines.length) {
						const nextIndent = this.leadingWhitespace(lines[lookahead]);
						if (nextIndent > baseIndent) {
							while (index < lookahead) {
								block.push("");
								index += 1;
							}
							continue;
						}
					}
					break;
				}

				const indent = this.leadingWhitespace(next);
				if (indent <= baseIndent) break;

				block.push(next.slice(Math.min(baseIndent, next.length)));
				index += 1;
			}

			completedBlocks.push(block.join("\n").trimEnd());
		}

		const remaining = keep
			.join("\n")
			.replace(/\n{3,}/g, "\n\n")
			.trimEnd();

		return {
			remaining: remaining ? `${remaining}\n` : "",
			completedBlocks,
		};
	}

	private leadingWhitespace(line: string): number {
		return line.match(/^\s*/)?.[0].length ?? 0;
	}

	private async ensureFile(filePath: string, initialContent: string): Promise<TFile> {
		const existing = this.app.vault.getAbstractFileByPath(filePath);
		if (existing instanceof TFile) return existing;
		if (existing) {
			throw new Error(`The path "${filePath}" exists but is not a Markdown file.`);
		}

		const parts = filePath.split("/");
		if (parts.length > 1) {
			let current = "";
			for (const folder of parts.slice(0, -1)) {
				current = current ? `${current}/${folder}` : folder;
				if (!this.app.vault.getAbstractFileByPath(current)) {
					await this.app.vault.createFolder(current);
				}
			}
		}

		return this.app.vault.create(filePath, initialContent);
	}

	private repairLegacyFrontmatter(content: string): string {
		const normalized = content.replace(/\r\n/g, "\n");

		if (/^---\n[\s\S]*?\n---(?:\n|$)/.test(normalized)) {
			return normalized;
		}

		const legacy =
			/(?:^|\n)(---\ncssclasses:\n(?:[ \t]*-[ \t]*task-timeline[ \t]*\n)+---)(?=\n|$)/;
		const match = legacy.exec(normalized);
		if (!match) return normalized;

		const block = match[1];
		const before = normalized.slice(0, match.index).trimEnd();
		const after = normalized.slice(match.index + match[0].length).trimStart();
		const body = [before, after].filter(Boolean).join("\n\n");

		return `${block}\n\n${body}`.trimEnd() + "\n";
	}

	private splitDocumentHeader(content: string): { header: string; body: string } {
		const text = content.replace(/\r\n/g, "\n");
		let offset = 0;
		let header = "";

		const frontmatter = text.match(/^---\n[\s\S]*?\n---(?:\n|$)/);
		if (frontmatter) {
			header += `${frontmatter[0].trimEnd()}\n\n`;
			offset = frontmatter[0].length;
		}

		const rest = text.slice(offset);
		const h1 = rest.match(/^\s*(#(?!#)\s+.+)\n?/);
		if (h1) {
			header += `${h1[1].trimEnd()}\n`;
			offset += h1[0].length;
		}

		return {
			header: header.trimEnd(),
			body: text.slice(offset).trim(),
		};
	}

	private insertIntoDoneContent(
		doneContent: string,
		dateHeading: string,
		blocks: string[],
	): string {
		let content = this.repairLegacyFrontmatter(doneContent);

		// Clean up spacing left by early development versions.
		content = content.replace(
			/^(##\s+.+)\n(?:[ \t]*\n)+(?=[ \t]*[-*+]\s+\[[xX]\])/gm,
			"$1\n",
		);

		const heading = `## ${dateHeading}`;
		const payload = blocks.join("\n");
		const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const headingPattern = new RegExp(`(^|\\n)${escapedHeading}\\s*\\n`, "m");
		const existingHeading = headingPattern.exec(content);

		if (existingHeading) {
			const start = existingHeading.index + existingHeading[0].length;
			const rest = content.slice(start);
			const nextHeading = rest.search(/\n##\s+/);
			const insertAt = nextHeading === -1 ? content.length : start + nextHeading;

			const before = content.slice(0, insertAt).replace(/\s*$/, "");
			const after = content.slice(insertAt).replace(/^\s*/, "");

			return `${before}\n${payload}${after ? `\n\n${after}` : ""}`.trimEnd() + "\n";
		}

		const { header, body } = this.splitDocumentHeader(content);
		const section = `${heading}\n${payload}`;
		const newBody = this.settings.newestFirst
			? body
				? `${section}\n\n${body}`
				: section
			: body
				? `${body}\n\n${section}`
				: section;

		return `${header}${header ? "\n\n" : ""}${newBody}`.trimEnd() + "\n";
	}

	private async archiveCompletedTasks(forceNotice: boolean): Promise<void> {
		if (this.isProcessing) return;
		this.isProcessing = true;

		try {
			const todoPath = this.getTodoPath();
			const donePath = this.getDonePath();

			if (todoPath === donePath) {
				new Notice("Task Timeline: the to-do and completed files must be different.");
				return;
			}

			const todo = this.app.vault.getAbstractFileByPath(todoPath);
			if (!(todo instanceof TFile)) {
				if (forceNotice) {
					new Notice(`Task Timeline: cannot find ${todoPath}`);
				}
				return;
			}

			const todoContent = await this.app.vault.read(todo);
			const { remaining, completedBlocks } =
				this.extractCompletedTaskBlocks(todoContent);

			if (completedBlocks.length === 0) {
				if (forceNotice) {
					new Notice("Task Timeline: no completed tasks found.");
				}
				return;
			}

			const done = await this.ensureFile(donePath, "# 已完成\n");
			const doneContent = await this.app.vault.read(done);
			const today = this.formatDate(new Date());
			const newDoneContent = this.insertIntoDoneContent(
				doneContent,
				today,
				completedBlocks,
			);

			// Archive first so a write failure cannot silently lose completed tasks.
			await this.app.vault.modify(done, newDoneContent);
			await this.app.vault.modify(todo, remaining);

			if (forceNotice || this.settings.showArchiveNotice) {
				new Notice(
					`Task Timeline: archived ${completedBlocks.length} task${
						completedBlocks.length === 1 ? "" : "s"
					} to ${today}.`,
				);
			}

			this.scheduleTimelineDecoration();
		} catch (error) {
			console.error("[Task Timeline]", error);
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Task Timeline: archive failed. ${message}`);
		} finally {
			window.setTimeout(() => {
				this.isProcessing = false;
			}, 250);
		}
	}
}

class TaskTimelineSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: TaskTimelinePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("To-do file")
			.setDesc("Vault-relative path. The .md extension is optional.")
			.addText((text) =>
				text
					.setPlaceholder("0 待办")
					.setValue(this.plugin.settings.todoFile)
					.onChange(async (value) => {
						this.plugin.settings.todoFile = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Completed file")
			.setDesc("Completed tasks are moved into this note.")
			.addText((text) =>
				text
					.setPlaceholder("已完成")
					.setValue(this.plugin.settings.doneFile)
					.onChange(async (value) => {
						this.plugin.settings.doneFile = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Date format")
			.setDesc("Supports YYYY, MM, and DD, for example YYYYMMDD or YYYY-MM-DD.")
			.addText((text) =>
				text
					.setPlaceholder("YYYYMMDD")
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat =
							value.trim() || DEFAULT_SETTINGS.dateFormat;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Newest date first")
			.setDesc("Add new date groups to the top of the completed note.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.newestFirst)
					.onChange(async (value) => {
						this.plugin.settings.newestFirst = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show archive notice")
			.setDesc("Show a notice after completed tasks are moved.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showArchiveNotice)
					.onChange(async (value) => {
						this.plugin.settings.showArchiveNotice = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}

export = TaskTimelinePlugin;
