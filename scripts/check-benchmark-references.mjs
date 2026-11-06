import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBenchmarkReferences } from './lib/benchmark-validation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelDirectory = path.join(root, 'src/content/models');
const benchmarkPath = path.join(root, 'src/data/benchmarks.json');

const modelFiles = await Promise.all(
	(await readdir(modelDirectory))
		.filter((file) => file.endsWith('.md'))
		.sort()
		.map(async (file) => ({
			file,
			source: await readFile(path.join(modelDirectory, file), 'utf8'),
		})),
);
const benchmarkData = JSON.parse(await readFile(benchmarkPath, 'utf8'));
const errors = validateBenchmarkReferences(modelFiles, benchmarkData);

if (errors.length) {
	console.error(`Benchmark reference validation failed:\n- ${errors.join('\n- ')}`);
	process.exit(1);
}

console.log(
	`Benchmark references valid (${modelFiles.length} model files; ${benchmarkData.models.length} benchmark entries; ${benchmarkData.products.length} products).`,
);
