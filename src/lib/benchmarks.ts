import { z } from 'astro/zod';
import { getCollection } from 'astro:content';
import raw from '../data/benchmarks.json';

export const JETSONS = [
	{ id: 'thor', label: 'AGX Thor', memory: '128 GB', engine: 'vLLM' },
	{ id: 'orin', label: 'AGX Orin', memory: '64 GB', engine: 'vLLM' },
	{ id: 'orin-nano', label: 'Orin Nano', memory: '8 GB', engine: 'llama.cpp' },
] as const;

export const BENCHMARKS = [
	{ id: 'throughput', title: 'Throughput', summary: '2K input · 128 output tokens' },
	{ id: 'speedbench', title: 'SPEED-Bench', summary: 'Writing and summarization · up to 256 output tokens' },
] as const;

export const CONCURRENCY = [
	{ id: 'c1', label: '1' },
	{ id: 'c8', label: '8' },
] as const;

export const OFF = 'off';

export type Result = { model: string; jetson: string; engine: string; method: string; bench: string; c: string; value: number };

const value = z.number().positive();
const perConcurrency = z.object({ c1: value, c8: value }).partial().strict();
const variant = z.object({ throughput: perConcurrency, speedbench: perConcurrency }).partial().strict();
const engines = z.record(z.record(variant));
const file = z.record(z.object({ released: z.string().date(), thor: engines, orin: engines, 'orin-nano': engines }).partial({ thor: true, orin: true, 'orin-nano': true }).strict());

let cache: { results: Result[]; released: Record<string, string> } | null = null;

export async function getBenchmarks() {
	if (cache) return cache;
	const parsed = file.safeParse(raw);
	if (!parsed.success) throw new Error(`src/data/benchmarks.json is not valid:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
	const slugs = new Set((await getCollection('models')).map((m) => m.slug));
	const results: Result[] = [];
	const released: Record<string, string> = {};
	for (const [slug, m] of Object.entries(parsed.data)) {
		if (!slugs.has(slug)) throw new Error(`src/data/benchmarks.json: no model page "${slug}" in src/content/models/`);
		released[slug] = m.released;
		for (const j of JETSONS)
			for (const [engine, methods] of Object.entries(m[j.id] ?? {}))
				for (const [method, benches] of Object.entries(methods))
					for (const [bench, cs] of Object.entries(benches))
						for (const [c, value] of Object.entries(cs ?? {}))
							if (value != null) results.push({ model: slug, jetson: j.id, engine, method, bench, c, value });
	}
	cache = { results, released };
	return cache;
}
