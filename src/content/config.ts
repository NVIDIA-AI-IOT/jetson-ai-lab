import { defineCollection, z } from 'astro:content';

const tutorials = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		category: z.enum([
			'Text',
			'Image',
			'Audio',
			'Applications',
			'VLM',
			'VLA',
			'Fundamentals',
			'Setup',
			'Workshops',
			'Model Optimization',
		]),
		section: z.string().optional(), // For sub-grouping within categories (e.g., "Inference Engines", "Getting Started")
		order: z.number().optional(), // For custom ordering within sections
		tags: z.array(z.string()),
		model: z.string().optional(),
		featured: z.boolean().optional(),
		isNew: z.boolean().optional(), // Mark as new tutorial
		hero_image: z.string().optional(), // Optional background image for hero section
		authors: z
			.array(
				z.object({
					name: z.string(),
					github: z.string().optional(),
				})
			)
			.optional(),
	}),
});

/** Legacy matrix + Run modal (still the default for all existing models). */
const supportedInferenceEngineEntrySchema = z.object({
	engine: z.string(),
	type: z.string(),
	install_command: z.string().optional(),
	run_command: z.string().optional(),
	install_command_orin: z.string().optional(),
	serve_command_orin: z.string().optional(),
	install_command_thor: z.string().optional(),
	serve_command_thor: z.string().optional(),
	run_command_orin: z.string().optional(),
	run_command_thor: z.string().optional(),
	modules_supported: z.array(z.string()).optional(),
	run_commands_by_module: z.record(z.string()).optional(),
});

/** New shape: when `serving.entries` is non-empty it overrides `supported_inference_engines` in the UI adapter. */
const servingEntrySchema = z.object({
	engine: z.string(),
	type: z.string().optional(),
	modules_supported: z.array(z.string()).optional(),
	install_command: z.string().optional(),
	run_command: z.string().optional(),
	serve_command_orin: z.string().optional(),
	serve_command_thor: z.string().optional(),
	run_command_orin: z.string().optional(),
	run_command_thor: z.string().optional(),
	run_commands_by_module: z.record(z.string()).optional(),
});

const benchmarkPlatformSchema = z.object({
	concurrency1: z.number(),
	concurrency8: z.number(),
	ttftMs: z.number().optional(),
});

const modelsSchema = z.object({
	title: z.string(),
	model_id: z.string().optional(),
	short_description: z.string(),
	family: z.string().optional(),
	icon: z.string().optional(),
	is_new: z.boolean().optional(),
	hide_run_button: z.boolean().optional(),
	order: z.number().optional(),
	type: z.string().optional(),
	/** True if the model accepts image/video (or other visual) inputs — VLM / vision-capable. */
	vision_capable: z.boolean().optional(),
	hf_checkpoint: z.string().optional(),
	huggingface_url: z.string().url().optional(),
	build_nvidia_url: z.string().url().optional(),
	memory_requirements: z.string().optional(),
	precision: z.string(),
	model_size: z.string().optional(),
	/** Free-text parameter count, e.g. "~9B" or "35B total / 3B activated" */
	parameters: z.string().optional(),
	/** Modalities the model supports, e.g. ["Text", "Image", "Audio"] */
	modalities: z.array(z.string()).optional(),
	/** Maximum context window, e.g. "128K" */
	context_length: z.string().optional(),
	/** License name, e.g. "Apache 2.0" or "NVIDIA AI Foundations" */
	license: z.string().optional(),
	minimum_jetson: z.string().optional(),
	/** Matrix tab ids to show grayed / non-clickable (e.g. not validated for this model yet). */
	matrix_modules_disabled: z.array(z.string()).optional(),
	/** Key matching the `name` field in benchmarks.json — links this model to its benchmark data. */
	benchmark_key: z.string().optional(),
	/** Other benchmark_key names to show as side-by-side reference bars (lineup/series comparison). */
	benchmark_series: z.array(z.string()).optional(),
	supported_inference_engines: z.array(supportedInferenceEngineEntrySchema).optional(),
	serving: z
		.object({
			entries: z.array(servingEntrySchema),
		})
		.optional(),
	client_call: z
		.object({
			shell: z.string().optional(),
			python: z.string().optional(),
			intro: z.string().optional(),
		})
		.optional(),
	one_shot_inference: z
		.object({
			modules_supported: z.array(z.string()).optional(),
			run_command_orin: z.string().optional(),
			run_command_thor: z.string().optional(),
			shell: z.string().optional(),
			python: z.string().optional(),
			intro: z.string().optional(),
			shell_by_module: z.record(z.string()).optional(),
			python_by_module: z.record(z.string()).optional(),
		})
		.optional(),
	benchmark: z
		.object({
			orin: benchmarkPlatformSchema.optional(),
			thor: benchmarkPlatformSchema.optional(),
		})
		.optional(),
});

export type ModelCollectionData = z.infer<typeof modelsSchema>;

const models = defineCollection({
	type: 'content',
	schema: modelsSchema.superRefine((data, ctx) => {
		if (data.hide_run_button) return;
		const hasServing = (data.serving?.entries?.length ?? 0) > 0;
		const hasLegacy = (data.supported_inference_engines?.length ?? 0) > 0;
		const os = data.one_shot_inference;
		const hasEval =
			!!os &&
			(!!os.run_command_orin?.trim() ||
				!!os.run_command_thor?.trim() ||
				!!os.shell?.trim() ||
				!!os.python?.trim() ||
				!!(os.shell_by_module && Object.values(os.shell_by_module).some((s) => String(s).trim())) ||
				!!(os.python_by_module && Object.values(os.python_by_module).some((s) => String(s).trim())));
		if (!hasServing && !hasLegacy && !hasEval) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					'Provide supported_inference_engines and/or serving.entries (non-empty), one_shot_inference commands, or set hide_run_button: true.',
				path: ['supported_inference_engines'],
			});
		}
	}),
});

const projects = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		author: z.string(),
		date: z.string(),
		source: z.enum(['GitHub', 'Hackster', 'YouTube', 'NVIDIA', 'JetsonHacks', 'Medium', 'Seeed', 'Other']),
		link: z.string().url(),
		image: z.string().optional(),
		video: z.string().optional(),
		featured: z.boolean().optional(),
		tags: z.array(z.string()).optional(),
		jetson: z.array(z.enum(['Jetson Thor', 'Jetson AGX Orin', 'Jetson Orin Nano'])).optional(),
	}),
});

const researchMemberSchema = z.object({
	name: z.string(),
	role: z.string(),
	org: z.string(),
	location: z.string(),
	image: z.string(),
	linkedin: z.string().optional(),
	github: z.string().optional(),
	expertise: z.array(z.string()),
});

const pages = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		seo_description: z.string().optional(),
		discord_url: z.string().url(),
		forum_url: z.string().url(),
		meeting_time: z.string(),
		meeting_platform: z.string(),
		recordings_url: z.string().url(),
		research_topics: z.array(z.object({
			left: z.string(),
			right: z.string(),
		})),
		past_meetings: z.array(z.object({
			date: z.string(),
			title: z.string(),
			videoId: z.string(),
			topics: z.array(z.string()),
		})),
		team_members: z.array(researchMemberSchema),
		emeritus_members: z.array(researchMemberSchema).optional(),
	}),
});

const gtc26 = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		labNumber: z.number().optional(),
		duration: z.string(),
		type: z.string().optional(),
		order: z.number(),
	}),
});

export const collections = { tutorials, models, projects, pages, gtc26 };
