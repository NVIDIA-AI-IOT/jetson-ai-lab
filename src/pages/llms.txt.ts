import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://www.jetson-ai-lab.com';

/**
 * Supported Models index — sectioned by vendor. Each section gathers one or
 * more `family` values from `src/content/models/*.md` frontmatter.
 *
 * When adding a new model, set the existing `family` value and the model is
 * picked up automatically. When introducing a new vendor, add a section here.
 *
 * Section order = display order. Family order within a section = the order
 * given in `families`. Models within a family are sorted by frontmatter
 * `order` (then `title`).
 */
const MODEL_SECTIONS: { name: string; families: string[] }[] = [
	{
		name: 'NVIDIA Models',
		families: ['NVIDIA Nemotron', 'NVIDIA Cosmos Reason'],
	},
	{
		name: 'Google Gemma Models',
		families: ['Google Gemma3', 'Google Gemma4'],
	},
	{
		name: 'Meta Llama Models',
		families: ['Meta Llama 3'],
	},
	{
		name: 'Alibaba Qwen Models',
		families: ['Alibaba Qwen3', 'Alibaba Qwen3.5', 'Alibaba Qwen3.6'],
	},
	{
		name: 'OpenAI Models',
		families: ['OpenAI GPT OSS'],
	},
	{
		name: 'Mistral Models',
		families: ['Mistral AI Ministral 3'],
	},
	{
		name: 'MiniMax Models',
		families: ['MiniMax M2.7'],
	},
];

/**
 * Static, hand-curated header (intro + tutorials + applications + workshops).
 * Tutorial copy is intentionally curated rather than auto-generated — it
 * carries section-specific phrasing that is more concise than tutorial
 * frontmatter `description`. When tutorials change, edit the string below.
 */
const HEADER = `# Jetson AI Lab

> Jetson AI Lab is NVIDIA's open-source resource for deploying generative AI on NVIDIA Jetson edge devices (Orin Nano, AGX Orin, Thor). It provides tutorials, model deployment guides, and benchmarks for running LLMs, VLMs, and VLA models locally on Jetson hardware.

Jetson AI Lab covers the full workflow: initial device setup, inference engine installation (vLLM, Ollama, llama.cpp, TensorRT), model deployment, fine-tuning, and benchmarking. All content targets on-device edge AI — no cloud required.

- Source code: https://github.com/NVIDIA-AI-IOT/jetson-ai-lab
- Full documentation: ${SITE}/llms-full.txt

## Getting Started

- [Getting Started with Jetson](${SITE}/tutorials/getting-started-with-jetson/): Official developer kit user guides and remote SSH setup with VS Code or Cursor
- [Jetson Agent Skills](${SITE}/tutorials/jetson-agent-skills/): Install Jetson Device Skills and Jetson BSP Skills so Cursor, Claude Code, or Codex can inspect a live Jetson and customize a Jetson Linux BSP
- [SSD + Docker Setup](${SITE}/tutorials/ssd-docker-setup/): Set up NVMe SSD storage and configure Docker on Jetson for optimal performance with AI containers
- [RAM Optimization](${SITE}/tutorials/ram-optimization/): Optimize system RAM by disabling desktop GUI, unnecessary services, and mounting swap for large model workloads

## Inference Engines & Fundamentals

- [Introduction to GenAI on Jetson](${SITE}/tutorials/genai-on-jetson-llms-vlms/): Practical intro to running LLMs and VLMs on Jetson using Ollama for experimentation and vLLM for production performance
- [Ollama on Jetson](${SITE}/tutorials/ollama/): Install and run Ollama for easy local LLM deployment, covering native installation, Docker containers, and Open WebUI
- [GenAI Benchmarking](${SITE}/tutorials/genai-benchmarking/): Benchmark LLMs and VLMs on Jetson using vLLM — measure throughput, latency, TTFT, and key performance metrics

## Model Optimization

- [Speculative Decoding on Jetson](${SITE}/tutorials/speculative-decoding/): Learn how MTP, DFlash, and DSpark accelerate local LLM generation and how to run compatible checkpoints with vLLM and llama.cpp
- [Fine-tune LLMs on Jetson](${SITE}/tutorials/finetune-on-jetson/): Fine-tune large language models directly on Jetson using PyTorch and Hugging Face TRL — Full SFT (4B), LoRA (9B), and QLoRA (27B)
- [TensorRT Edge-LLM on Jetson](${SITE}/tutorials/tensorrt-edge-llm/): Use NVIDIA TensorRT Edge-LLM for quantization, ONNX export, engine builds, and pure C++ on-device inference

## Applications

- [Multi-Modal AI Studio on Jetson](${SITE}/tutorials/multi-modal-ai-studio/): Run a conversational AI pipeline on Jetson Thor with on-device ASR, LLM/VLM, and TTS
- [Live VLM WebUI](${SITE}/tutorials/live-vlm-webui/): Real-time Vision Language Model interface with WebRTC webcam streaming, OpenAI-compatible API, and interactive prompt editor
- [OpenClaw on Jetson](${SITE}/tutorials/openclaw/): Fully local AI personal assistant on Jetson with OpenClaw and WhatsApp, no cloud APIs needed
- [NanoOWL](${SITE}/tutorials/nanoowl/): OWL-ViT optimized for real-time open-vocabulary object detection on Jetson with TensorRT

## Vision Language Models (VLMs)

- [Gemma 4 on Jetson](${SITE}/tutorials/gemma4-on-jetson/): Run Google Gemma 4 models (E2B, E4B, 26B-A4B, 31B) on Jetson with vLLM or llama.cpp — reasoning, tool calling, and audio
- [Cosmos Reason2 on Jetson](${SITE}/tutorials/cosmos-reason2-vlm/): Run NVIDIA Cosmos Reason2 (2B/8B) with vLLM and Live VLM WebUI for real-time vision inference

## Vision-Language-Action (VLA) Models

- [OpenPi on Jetson Thor](${SITE}/tutorials/openpi_on_thor/): Deploy Physical Intelligence's OpenPi VLA model on Jetson Thor with TensorRT NVFP4 quantization for low-latency robotics inference

## Workshops

- [GTC 2026 Workshop](${SITE}/tutorials/gtc26/): 100-minute hands-on workshop — deploy AI microservices, run VLMs, and build conversational AI pipelines on Jetson Thor
- [GTC DC 2025 Workshop](${SITE}/tutorials/workshop-gtc-dc-2025/): Inference optimization on Jetson Thor with vLLM — production-grade LLM serving, quantization (FP16/FP8/FP4), speculative decoding
- [Hackathon Guide](${SITE}/tutorials/hackathon-guide/): Setup tips, project ideas, and resources for building AI projects on Jetson at hackathons
`;

const FOOTER = `## Other Pages

- [Model Catalog](${SITE}/models/): Browse all supported models with one-click deployment commands for Jetson Orin and Thor
- [Community Projects](${SITE}/community/): Community-contributed projects, demos, and integrations built on Jetson
- [Jetson AI Lab Discord Community & Research Group](${SITE}/research/): Join the Jetson community for monthly research meetings, open-source edge AI collaboration, robotics projects, and the official Discord server
`;

export const GET: APIRoute = async () => {
	const models = await getCollection('models');

	const sections: string[] = [];
	sections.push(HEADER);
	sections.push('## Supported Models');
	sections.push('');
	sections.push(`The full model catalog with deployment commands is at ${SITE}/models/`);
	sections.push('');

	const seenSlugs = new Set<string>();

	for (const section of MODEL_SECTIONS) {
		const sectionModels = models
			.filter((m) => m.data.family && section.families.includes(m.data.family))
			.sort((a, b) => {
				// Sort by family order in the section, then frontmatter `order`, then title
				const fa = section.families.indexOf(a.data.family ?? '');
				const fb = section.families.indexOf(b.data.family ?? '');
				if (fa !== fb) return fa - fb;
				const oa = a.data.order ?? 999;
				const ob = b.data.order ?? 999;
				if (oa !== ob) return oa - ob;
				return a.data.title.localeCompare(b.data.title);
			});

		if (sectionModels.length === 0) continue;

		sections.push(`### ${section.name}`);
		for (const model of sectionModels) {
			seenSlugs.add(model.slug);
			sections.push(
				`- [${model.data.title}](${SITE}/models/${model.slug}/): ${model.data.short_description}`,
			);
		}
		sections.push('');
	}

	// Catch-all so a brand-new family is never silently dropped from the index.
	const orphans = models.filter((m) => !seenSlugs.has(m.slug));
	if (orphans.length > 0) {
		orphans.sort((a, b) => a.data.title.localeCompare(b.data.title));
		sections.push('### Other Models');
		for (const model of orphans) {
			sections.push(
				`- [${model.data.title}](${SITE}/models/${model.slug}/): ${model.data.short_description}`,
			);
		}
		sections.push('');
	}

	sections.push(FOOTER);

	const body = sections.join('\n');
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
