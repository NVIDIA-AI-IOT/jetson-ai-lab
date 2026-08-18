import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://www.jetson-ai-lab.com';

const TUTORIAL_SLUG_MAP: Record<string, string> = {
	'applications/live-vlm-webui': 'live-vlm-webui',
	'applications/nanoowl': 'nanoowl',
	'applications/openclaw': 'openclaw',
	'fundamentals/gemma4-on-jetson': 'gemma4-on-jetson',
	'fundamentals/genai-benchmarking': 'genai-benchmarking',
	'fundamentals/genai-on-jetson-llms-vlms': 'genai-on-jetson-llms-vlms',
	'fundamentals/ollama': 'ollama',
	'model-optimization/finetune-on-jetson': 'finetune-on-jetson',
	'model-optimization/tensorrt-edge-llm': 'tensorrt-edge-llm',
	'setup/getting-started-with-jetson': 'getting-started-with-jetson',
	'setup/jetson-agent-skills': 'jetson-agent-skills',
	'setup/ram-optimization': 'ram-optimization',
	'setup/ssd-docker-setup': 'ssd-docker-setup',
	'vla/openpi_on_thor': 'openpi_on_thor',
	'vlm/cosmos-reason2-vlm': 'cosmos-reason2-vlm',
	'workshops/gtc26': 'gtc26',
	'workshops/hackathon-guide': 'hackathon-guide',
	'workshops/workshop-gtc-dc-2025': 'workshop-gtc-dc-2025',
};

function tutorialUrl(slug: string): string {
	const mapped = TUTORIAL_SLUG_MAP[slug] ?? slug.split('/').pop();
	return `${SITE}/tutorials/${mapped}/`;
}

export const GET: APIRoute = async () => {
	const tutorials = await getCollection('tutorials');
	const models = await getCollection('models');

	const sections: string[] = [];

	sections.push(`# Jetson AI Lab — Full Documentation`);
	sections.push('');
	sections.push(
		`> Complete reference for deploying generative AI on NVIDIA Jetson edge devices (Orin Nano, AGX Orin, Thor). This file contains the full text of all tutorials and model documentation.`
	);
	sections.push('');
	sections.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
	sections.push(`Source: ${SITE}`);
	sections.push('');

	const categoryOrder = [
		'Setup',
		'Fundamentals',
		'Model Optimization',
		'Applications',
		'VLM',
		'VLA',
		'Workshops',
	];

	const grouped = new Map<string, typeof tutorials>();
	for (const cat of categoryOrder) {
		grouped.set(cat, []);
	}
	for (const t of tutorials) {
		const list = grouped.get(t.data.category) ?? [];
		list.push(t);
		grouped.set(t.data.category, list);
	}

	sections.push('---');
	sections.push('');
	sections.push('## Tutorials');
	sections.push('');

	for (const [category, items] of grouped) {
		if (items.length === 0) continue;
		items.sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));

		sections.push(`### ${category}`);
		sections.push('');

		for (const tutorial of items) {
			const url = tutorialUrl(tutorial.slug);
			const { Content } = await tutorial.render();

			sections.push(`#### ${tutorial.data.title}`);
			sections.push('');
			sections.push(`URL: ${url}`);
			sections.push(`Description: ${tutorial.data.description}`);
			if (tutorial.data.tags?.length) {
				sections.push(`Tags: ${tutorial.data.tags.join(', ')}`);
			}
			sections.push('');
			sections.push(tutorial.body ?? '');
			sections.push('');
			sections.push('---');
			sections.push('');
		}
	}

	sections.push('## Supported Models');
	sections.push('');

	const sortedModels = [...models].sort((a, b) =>
		a.data.title.localeCompare(b.data.title)
	);

	for (const model of sortedModels) {
		sections.push(`### ${model.data.title}`);
		sections.push('');
		sections.push(`URL: ${SITE}/models/${model.slug}/`);
		sections.push(`Description: ${model.data.short_description}`);
		sections.push(`Memory: ${model.data.memory_requirements}`);
		sections.push(`Precision: ${model.data.precision}`);
		sections.push(`Size: ${model.data.model_size}`);
		if (model.data.vision_capable) {
			sections.push(`Vision capable: yes`);
		}
		if (model.data.hf_checkpoint) {
			sections.push(`HuggingFace: ${model.data.hf_checkpoint}`);
		}
		sections.push('');
		if (model.body?.trim()) {
			sections.push(model.body);
			sections.push('');
		}
		sections.push('---');
		sections.push('');
	}

	const body = sections.join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
