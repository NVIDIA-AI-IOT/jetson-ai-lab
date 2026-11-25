import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validator = new URL('./check-llms-full-output.mjs', import.meta.url);
const command = 'Run command:\n```shell\necho example\n```\n';

async function validate(output) {
	const root = await mkdtemp(path.join(tmpdir(), 'jal-llms-full-'));
	try {
		await mkdir(path.join(root, 'scripts'));
		await mkdir(path.join(root, 'src/content/models'), { recursive: true });
		await mkdir(path.join(root, 'dist'));
		await copyFile(validator, path.join(root, 'scripts/check-llms-full-output.mjs'));
		await writeFile(path.join(root, 'src/content/models/example.md'), [
			'---', 'title: "Example Model"', 'serving:', '  entries:',
			'    - engine: "test"', '      run_command: |-', '        echo example', '---',
		].join('\n'));
		await writeFile(path.join(root, 'dist/llms-full.txt'), output);
		return spawnSync(process.execPath, [path.join(root, 'scripts/check-llms-full-output.mjs')], {
			encoding: 'utf8',
		});
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

test('validates catalog commands despite an earlier same-name tutorial heading', async () => {
	const result = await validate('# Documentation\n### Example Model\nTutorial prose.\n\n## Supported Models\n### Example Model\n' + command);
	assert.equal(result.status, 0, result.stderr);
});

test('a tutorial command cannot mask a missing catalog command', async () => {
	const result = await validate('# Documentation\n### Example Model\n' + command + '\n## Supported Models\n### Example Model\nNo serving commands.\n');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /no emitted runnable command/);
});

test('requires the generated catalog section', async () => {
	const result = await validate('# Documentation\n### Example Model\n' + command);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Supported Models section not found/);
});

test('requires the expected model inside the catalog', async () => {
	const result = await validate('# Documentation\n### Example Model\n' + command + '\n## Supported Models\n### Another Model\n' + command);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /model section not found/);
});

test('continues to reject undefined values', async () => {
	const result = await validate('# Documentation\n## Supported Models\n### Example Model\nundefined\n' + command);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /occurrence\(s\) of "undefined"/);
});
