import assert from 'node:assert/strict';
import test from 'node:test';
import {
	parseBenchmarkReferences,
	validateBenchmarkReferences,
} from './lib/benchmark-validation.mjs';

const validBenchmarks = {
	products: [{ id: 't5000' }],
	models: [
		{
			name: 'Example Model',
			engines: {
				vLLM: {
					FP4: {
						concurrency1: { t5000: 1 },
						concurrency8: { t5000: 2 },
						oom: ['t5000'],
					},
				},
			},
		},
		{ name: 'Comparison Model', engines: {} },
	],
};

function modelSource(key = 'Example Model', series = 'Comparison Model') {
	return `---
title: Example
benchmark_key: "${key}"
benchmark_series:
  - "${series}"
---
`;
}

test('parses block and inline benchmark references', () => {
	assert.deepEqual(parseBenchmarkReferences(modelSource()), {
		benchmarkKey: 'Example Model',
		benchmarkSeries: ['Comparison Model'],
	});
	assert.deepEqual(
		parseBenchmarkReferences(`---
benchmark_series: ["Example Model", "Comparison Model"]
---
`),
		{
			benchmarkKey: undefined,
			benchmarkSeries: ['Example Model', 'Comparison Model'],
		},
	);
});

test('accepts valid benchmark references and product ids', () => {
	assert.deepEqual(
		validateBenchmarkReferences([{ file: 'example.md', source: modelSource() }], validBenchmarks),
		[],
	);
});

test('rejects unresolved model keys and series keys', () => {
	const errors = validateBenchmarkReferences(
		[{ file: 'example.md', source: modelSource('Typo Model', 'Typo Series') }],
		validBenchmarks,
	);
	assert(errors.some((error) => error.includes('example.md: benchmark_key "Typo Model"')));
	assert(errors.some((error) => error.includes('example.md: benchmark_series key "Typo Series"')));
});

test('rejects unknown product ids in values and status markers', () => {
	const benchmarks = structuredClone(validBenchmarks);
	const quant = benchmarks.models[0].engines.vLLM.FP4;
	quant.concurrency1.typo_product = 3;
	quant.dnr = ['missing_product'];

	const errors = validateBenchmarkReferences([], benchmarks);
	assert(errors.some((error) => error.includes('concurrency1 uses unknown product id "typo_product"')));
	assert(errors.some((error) => error.includes('dnr uses unknown product id "missing_product"')));
});
