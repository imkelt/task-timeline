import { existsSync, readFileSync } from "node:fs";

const errors = [];
const required = ["main.js", "manifest.json", "styles.css", "README.md", "LICENSE"];

for (const file of required) {
	if (!existsSync(file)) {
		errors.push(`Missing required file: ${file}`);
	}
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

if (!/^[a-z-]+$/.test(manifest.id)) {
	errors.push("manifest.id may contain only lowercase letters and hyphens.");
}
if (manifest.id.endsWith("plugin")) {
	errors.push('manifest.id cannot end with "plugin".');
}
if (manifest.id.includes("obsidian")) {
	errors.push('manifest.id cannot contain "obsidian".');
}
if (manifest.version !== pkg.version) {
	errors.push(`Version mismatch: manifest=${manifest.version}, package=${pkg.version}`);
}
if (!(manifest.version in versions)) {
	errors.push(`versions.json does not contain ${manifest.version}.`);
}
if (versions[manifest.version] !== manifest.minAppVersion) {
	errors.push("versions.json minAppVersion does not match manifest.json.");
}
if (typeof manifest.description !== "string" || manifest.description.length > 250) {
	errors.push("manifest.description must be 250 characters or fewer.");
}
if (!manifest.description.endsWith(".")) {
	errors.push("manifest.description must end with a period.");
}
if (!manifest.author || /openai|your name|todo/i.test(manifest.author)) {
	errors.push("Set a real public author name in manifest.json.");
}
if ("fundingUrl" in manifest) {
	errors.push("Remove fundingUrl unless the plugin actually accepts financial support.");
}

if (errors.length) {
	console.error("Release check failed:\n");
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log(`Release check passed for Task Timeline ${manifest.version}.`);
