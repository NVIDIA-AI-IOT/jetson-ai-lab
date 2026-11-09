import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = process.argv[2]
	? path.resolve(process.argv[2])
	: path.join(root, 'dist/llms-full.txt');
const modelDirectory = path.join(root, 'src/content/models');
const output = await readFile(outputPath, 'utf8');

const undefinedCount = (output.match(/\bundefined\b/g) ?? []).length;
if (undefinedCount) {
	console.error(`${outputPath}: found ${undefinedCount} occurrence(s) of "undefined"`);
	process.exit(1);
}

const commandField =
	/^\s+(?:install_command(?:_orin|_thor)?|serve_command_(?:orin|thor)|run_command(?:_orin|_thor)?|shell|python):\s*(?:\S|[>|]-?)\s*$/m;
const commandOutput =
	/^[^\r\n]*command:\r?\n```(?:shell|python)\r?\n/m;
const modelsWithCommands = [];

for (const file of (await readdir(modelDirectory)).filter((name) => name.endsWith('.md'))) {
	const source = await readFile(path.join(modelDirectory, file), 'utf8');
	const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
	if (!commandField.test(frontmatter)) continue;
	const title = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
	if (title) modelsWithCommands.push({ file, title });
}

const missing = [];
for (const { file, title } of modelsWithCommands) {
	const start = output.indexOf(`### ${title}\n`);
	if (start < 0) {
		missing.push(`${file}: model section not found`);
		continue;
	}
	const next = output.indexOf('\n### ', start + 5);
	const section = output.slice(start, next < 0 ? output.length : next);
	if (!commandOutput.test(section)) missing.push(`${file}: no emitted runnable command`);
}

if (missing.length) {
	console.error(`llms-full.txt validation failed:\n- ${missing.join('\n- ')}`);
	process.exit(1);
}

console.log(
	`llms-full.txt valid (${modelsWithCommands.length} models with frontmatter commands; no undefined values).`,
);
