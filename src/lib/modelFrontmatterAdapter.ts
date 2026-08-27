import { normalizeEngineKey, type SupportedEngineEntry } from './inferenceCommands';

/** Shape needed to resolve engines (matches model collection data; avoid importing content/config from lib). */
export interface ModelEnginesSource {
	supported_inference_engines?: SupportedEngineEntry[];
	serving?: {
		entries: ServingEntryInput[];
	};
}

export type ServingEntryInput = {
	engine: string;
	type?: string;
	modules_supported?: string[];
	install_command?: string;
	run_command?: string;
	serve_command_orin?: string;
	serve_command_thor?: string;
	run_command_orin?: string;
	run_command_thor?: string;
	run_commands_by_module?: Record<string, string>;
};

export function servingEntryToSupportedEngine(e: ServingEntryInput): SupportedEngineEntry {
	return {
		engine: e.engine,
		type: e.type ?? 'Container',
		install_command: e.install_command,
		run_command: e.run_command,
		serve_command_orin: e.serve_command_orin,
		serve_command_thor: e.serve_command_thor,
		run_command_orin: e.run_command_orin,
		run_command_thor: e.run_command_thor,
		install_command_orin: undefined,
		install_command_thor: undefined,
		modules_supported: e.modules_supported,
		run_commands_by_module: e.run_commands_by_module,
	};
}

/** Prefer new `serving.entries` when present; otherwise legacy `supported_inference_engines`. */
export function getSupportedInferenceEngines(data: ModelEnginesSource): SupportedEngineEntry[] {
	const n = data.serving?.entries?.length ?? 0;
	if (n > 0) {
		return data.serving!.entries.map(servingEntryToSupportedEngine);
	}
	return data.supported_inference_engines ?? [];
}


const ENGINE_ORDER: Record<string, number> = {
	vllm: 0,
	sglang: 1,
	llamacpp: 2,
	ollama: 3,
	edgellm: 4,
};

function engineSortKey(engine: string): number {
	const key = normalizeEngineKey(engine);
	return ENGINE_ORDER[key] ?? 99;
}

/**
 * Order engines for the serve matrix / Run modal.
 * Fixed order: vLLM > SGLang > llama.cpp > Ollama > TensorRT Edge-LLM > everything else (alphabetical).
 */
export function sortEnginesForUi(engines: SupportedEngineEntry[]): SupportedEngineEntry[] {
	if (engines.length <= 1) return [...engines];
	return [...engines].sort((a, b) => {
		const ka = engineSortKey(a.engine);
		const kb = engineSortKey(b.engine);
		if (ka !== kb) return ka - kb;
		return a.engine.localeCompare(b.engine);
	});
}
