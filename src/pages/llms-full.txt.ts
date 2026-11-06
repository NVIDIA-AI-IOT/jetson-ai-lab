import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
	getSupportedInferenceEngines,
	sortEnginesForUi,
} from '../lib/modelFrontmatterAdapter';

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
	'model-optimization/speculative-decoding': 'speculative-decoding',
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

function appendCommand(
	sections: string[],
	label: string,
	command: string | undefined,
	language = 'shell',
): void {
	if (!command?.trim()) return;
	sections.push(`${label}:`);
	sections.push(`\`\`\`${language}`);
	sections.push(command.trim());
	sections.push('```');
	sections.push('');
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
		if (model.data.memory_requirements) {
			sections.push(`Memory: ${model.data.memory_requirements}`);
		}
		sections.push(`Precision: ${model.data.precision}`);
		if (model.data.model_size) {
			sections.push(`Size: ${model.data.model_size}`);
		}
		if (model.data.vision_capable) {
			sections.push(`Vision capable: yes`);
		}
		if (model.data.hf_checkpoint) {
			sections.push(`HuggingFace: ${model.data.hf_checkpoint}`);
		}
		sections.push('');

		const engines = sortEnginesForUi(getSupportedInferenceEngines(model.data));
		if (engines.length) {
			sections.push('#### Serving');
			sections.push('');
			for (const engine of engines) {
				sections.push(`##### ${engine.engine}`);
				if (engine.type) sections.push(`Type: ${engine.type}`);
				if (engine.modules_supported?.length) {
					sections.push(`Modules supported: ${engine.modules_supported.join(', ')}`);
				}
				sections.push('');
				appendCommand(sections, 'Install command', engine.install_command);
				appendCommand(sections, 'Orin install command', engine.install_command_orin);
				appendCommand(sections, 'Thor install command', engine.install_command_thor);
				appendCommand(sections, 'Run command', engine.run_command);
				appendCommand(
					sections,
					'Orin serve command',
					engine.serve_command_orin ?? engine.run_command_orin,
				);
				appendCommand(
					sections,
					'Thor serve command',
					engine.serve_command_thor ?? engine.run_command_thor,
				);
				for (const [moduleId, command] of Object.entries(
					engine.run_commands_by_module ?? {},
				)) {
					appendCommand(sections, `${moduleId} run command`, command);
				}
			}
		}

		const oneShot = model.data.one_shot_inference;
		if (oneShot) {
			const oneShotCommands = [
				oneShot.run_command_orin,
				oneShot.run_command_thor,
				oneShot.shell,
				oneShot.python,
				...Object.values(oneShot.shell_by_module ?? {}),
				...Object.values(oneShot.python_by_module ?? {}),
			];
			if (oneShotCommands.some((command) => command?.trim())) {
				sections.push('#### One-shot inference');
				sections.push('');
				if (oneShot.modules_supported?.length) {
					sections.push(`Modules supported: ${oneShot.modules_supported.join(', ')}`);
					sections.push('');
				}
				if (oneShot.intro) {
					sections.push(oneShot.intro);
					sections.push('');
				}
				appendCommand(sections, 'Orin run command', oneShot.run_command_orin);
				appendCommand(sections, 'Thor run command', oneShot.run_command_thor);
				appendCommand(sections, 'Shell command', oneShot.shell);
				appendCommand(sections, 'Python command', oneShot.python, 'python');
				for (const [moduleId, command] of Object.entries(oneShot.shell_by_module ?? {})) {
					appendCommand(sections, `${moduleId} shell command`, command);
				}
				for (const [moduleId, command] of Object.entries(oneShot.python_by_module ?? {})) {
					appendCommand(sections, `${moduleId} Python command`, command, 'python');
				}
			}
		}

		const clientCall = model.data.client_call;
		if (clientCall?.shell?.trim() || clientCall?.python?.trim()) {
			sections.push('#### Call the model');
			sections.push('');
			if (clientCall.intro) {
				sections.push(clientCall.intro);
				sections.push('');
			}
			appendCommand(sections, 'Shell command', clientCall.shell);
			appendCommand(sections, 'Python command', clientCall.python, 'python');
		}

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
