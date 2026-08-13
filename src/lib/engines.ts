export type InferenceCategory = 'Text' | 'Image' | 'Audio' | 'Multimodal';

export interface InferenceEngine {
	id: string;
	label: string;
	supports: InferenceCategory[];
	buildCommand: (args: { modelId: string; modelName?: string; options?: Record<string, string | number | boolean> }) => string;
}

const sanitizeModelForCli = (modelId: string, fallback?: string) => {
	// Best-effort mapping to something CLI-friendly
	return (modelId || fallback || '').toLowerCase().replace(/\s+/g, '-');
};

export const INFERENCE_ENGINES: Record<string, InferenceEngine> = {
	ollama: {
		id: 'ollama',
		label: 'Ollama',
		supports: ['Text', 'Multimodal'],
		buildCommand: ({ modelId }) => {
			const cliModel = sanitizeModelForCli(modelId);
			return `ollama run ${cliModel}`;
		}
	},
	vllm: {
		id: 'vllm',
		label: 'vLLM',
		supports: ['Text', 'Multimodal'],
		buildCommand: ({ options }) => {
			// This placeholder is largely handled by Layout.astro logic now
            // But we can put a default here
            const checkpoint = options?.checkpoint || 'model/checkpoint';
			return `vllm serve ${checkpoint}`;
		}
	},
	sglang: {
		id: 'sglang',
		label: 'SGLang',
		supports: ['Text', 'Multimodal'],
		buildCommand: ({ options }) => {
			const checkpoint = options?.checkpoint || 'model/checkpoint';
			return `sglang serve ${checkpoint}`;
		}
	},
	edgellm: {
		id: 'edgellm',
		label: 'TensorRT Edge-LLM',
		supports: ['Text', 'Multimodal'],
		buildCommand: ({ modelId }) => {
			const cliModel = sanitizeModelForCli(modelId);
			return `echo "Configure TensorRT Edge-LLM for ${cliModel} (see model YAML run commands)"`;
		}
	},
	llamacpp: {
		id: 'llamacpp',
		label: 'llama.cpp',
		supports: ['Text', 'Multimodal'],
		buildCommand: ({ modelId, options }) => {
			const threads = options?.threads ?? 4;
			const ctx = options?.ctx ?? 4096;
			const cliModel = sanitizeModelForCli(modelId);
			return `./main -m ./models/${cliModel}.gguf -t ${threads} -c ${ctx} -p "Hello from Jetson"`;
		}
	},
	tensorrtllm: {
		id: 'tensorrtllm',
		label: 'TensorRT-LLM',
		supports: ['Text', 'Multimodal'],
		buildCommand: ({ modelId, options }) => {
			const precision = options?.precision ?? 'fp16';
			const cliModel = sanitizeModelForCli(modelId);
			return `trtllm-run --engine-dir ./engines/${cliModel} --precision ${precision} --input "Hello from Jetson"`;
		}
	},
	diffusers: {
		id: 'diffusers',
		label: 'Diffusers',
		supports: ['Image'],
		buildCommand: ({ modelId, options }) => {
			const steps = options?.steps ?? 25;
			const out = options?.output ?? './outputs';
			const cliModel = sanitizeModelForCli(modelId);
			return `python run_${cliModel}.py --steps ${steps} --output ${out}`;
		}
	},
	comfyui: {
		id: 'comfyui',
		label: 'ComfyUI',
		supports: ['Image'],
		buildCommand: () => {
			return `python main.py --listen --enable-cuda-graphs`;
		}
	},
	whispercpp: {
		id: 'whispercpp',
		label: 'whisper.cpp',
		supports: ['Audio'],
		buildCommand: ({ options }) => {
			const model = options?.model ?? 'ggml-base.en.bin';
			const file = options?.file ?? 'sample.wav';
			return `./main -m ./models/${model} -f ${file}`;
		}
	},
	riva: {
		id: 'riva',
		label: 'NVIDIA Riva',
		supports: ['Audio'],
		buildCommand: () => {
			return `riva_start.sh`;
		}
	}
};

export function enginesForCategory(category: InferenceCategory): InferenceEngine[] {
	return Object.values(INFERENCE_ENGINES).filter((e) => e.supports.includes(category));
}

export function defaultEngineForCategory(category: InferenceCategory): InferenceEngine | undefined {
	const candidates = enginesForCategory(category);
	// Preference ordering per category
	if (category === 'Text' || category === 'Multimodal') {
		return candidates.find((e) => e.id === 'ollama') ?? candidates[0];
	}
	if (category === 'Image') {
		return candidates.find((e) => e.id === 'comfyui') ?? candidates[0];
	}
	if (category === 'Audio') {
		return candidates.find((e) => e.id === 'whispercpp') ?? candidates[0];
	}
	return candidates[0];
}

export function buildCommandForEngine(engineId: string, args: Parameters<InferenceEngine['buildCommand']>[0]): string {
	const engine = INFERENCE_ENGINES[engineId];
	if (!engine) return '';
	return engine.buildCommand(args);
}


