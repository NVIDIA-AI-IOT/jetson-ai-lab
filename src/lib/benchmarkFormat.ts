
export const fmtValue = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : String(Math.round(n * 10) / 10));

export function niceScale(max: number, steps = 4) {
	if (!(max > 0)) return { step: 1, top: 5 };
	const raw = max / steps;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => x >= raw)!;
	return { step, top: Math.ceil(max / step) * step };
}

const FAMILIES: { key: string; label: string; color: string; match: RegExp }[] = [
	{ key: 'nemotron', label: 'Nemotron', color: '#76B900', match: /nemotron/i },
	{ key: 'qwen', label: 'Qwen', color: '#1976D2', match: /qwen/i },
	{ key: 'gemma', label: 'Gemma', color: '#8E24AA', match: /gemma/i },
	{ key: 'cosmos', label: 'Cosmos', color: '#00ACC1', match: /cosmos/i },
	{ key: 'gpt-oss', label: 'GPT OSS', color: '#F57C00', match: /gpt[ -]?oss/i },
	{ key: 'minimax', label: 'MiniMax', color: '#E53935', match: /minimax/i },
	{ key: 'llama', label: 'Llama', color: '#D81B60', match: /llama|muse/i },
	{ key: 'pi', label: 'Pi', color: '#8D6E63', match: /^pi\b/i },
];
const OTHER_FAMILY = { key: 'other', label: 'Other', color: '#78909C' };
export const familyOf = (...hints: (string | undefined)[]) =>
	FAMILIES.find((f) => hints.some((h) => h && f.match.test(h))) ?? OTHER_FAMILY;

const ENGINES: { key: string; label: string; color: string }[] = [
	{ key: 'vLLM', label: 'vLLM', color: '#1F6FD1' },
	{ key: 'vLLM-Omni', label: 'vLLM-Omni', color: '#0097A7' },
	{ key: 'Edge-LLM', label: 'TensorRT Edge-LLM', color: '#76B900' },
	{ key: 'TRT', label: 'TensorRT', color: '#3F6B00' },
	{ key: 'llama.cpp', label: 'llama.cpp', color: '#E0892B' },
	{ key: 'SGLang', label: 'SGLang', color: '#8E24AA' },
];
export const engineOf = (key: string) =>
	ENGINES.find((e) => e.key === key || e.label === key) ?? { key, label: key, color: '#78909C' };
export const engineOrder = (key: string) => {
	const i = ENGINES.findIndex((e) => e.key === key || e.label === key);
	return i < 0 ? ENGINES.length : i;
};
