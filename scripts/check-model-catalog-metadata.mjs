import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelDirectory = path.join(root, 'src/content/models');
const legacyEntries = new Set(
	JSON.parse(await readFile(path.join(root, 'scripts/legacy-model-catalog-entries.json'), 'utf8'))
);
const files = (await readdir(modelDirectory)).filter((file) => file.endsWith('.md')).sort();
const errors = [];

for (const file of files) {
	const source = await readFile(path.join(modelDirectory, file), 'utf8');
	const match = source.match(/^catalog_added_at:\s*(?:"\d{4}-\d{2}-\d{2}"|'\d{4}-\d{2}-\d{2}'|\d{4}-\d{2}-\d{2})\s*$/m);
	if (!match && !legacyEntries.has(file)) {
		errors.push(`${file}: newly added model entries require catalog_added_at: YYYY-MM-DD`);
	}
	if (match && legacyEntries.has(file)) {
		errors.push(`${file}: remove migrated entry from scripts/legacy-model-catalog-entries.json`);
	}
}

for (const file of legacyEntries) {
	if (!files.includes(file)) errors.push(`${file}: stale entry in scripts/legacy-model-catalog-entries.json`);
}

if (errors.length) {
	console.error(`Model catalog metadata validation failed:\n- ${errors.join('\n- ')}`);
	process.exit(1);
}

console.log(`Model catalog metadata valid (${files.length} entries; ${legacyEntries.size} legacy entries).`);
