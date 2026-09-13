import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const dir = join("release", manifest.version);

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
	cpSync(file, join(dir, file));
}

console.log(`Prepared release assets in ${dir}`);
