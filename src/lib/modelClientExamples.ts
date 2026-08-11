import type { SupportedEngineEntry } from './inferenceCommands';

/** Matches inference panel `data-engine` labels (e.g. "Ollama" → "ollama"). */
export function normalizeInferenceEngineKey(name: string): string {
	return name.toLowerCase().replace(/[.\-_]/g, '');
}

function normEngine(name: string): string {
	return normalizeInferenceEngineKey(name);
}

function pickRunSample(e: SupportedEngineEntry): string {
	return (
		e.serve_command_orin ||
		e.serve_command_thor ||
		e.run_command_orin ||
		e.run_command_thor ||
		e.run_command ||
		''
	);
}

/** Normalized `engine` field from model front matter — matches inference panel selection. */
export type ClientCallEngineKey = 'vllm' | 'sglang' | 'ollama' | 'llamacpp';

/** For Ollama only: OpenAI-compatible `/v1` vs native `/api/generate`. */
export type ClientCallApiStyle = 'openai_compat' | 'ollama_native';

export interface ClientCallExample {
	engineLabel: string;
	intro: string;
	command: string;
	/** Syntax highlighting / continuation handling */
	lang?: 'shell' | 'python';
	/** When false, engineLabel is still used for analytics but not shown as a heading */
	showEngineHeading?: boolean;
	/**
	 * When set, this snippet is shown only if that inference engine is selected above.
	 * Omit for frontmatter examples (always visible).
	 */
	callEngineKey?: ClientCallEngineKey;
	/** When set (Ollama), shown only when the Call section API-style tab matches. */
	callApiStyle?: ClientCallApiStyle;
}

export interface ClientExampleOptions {
	modelId: string;
	hfCheckpoint?: string;
}

function openaiSdkPythonExample(
	port: number,
	model: string,
	kind: 'compat' | 'ollama',
	userContent: string,
): string {
	const keyLine =
		kind === 'ollama'
			? '    api_key="ollama",  # required by the client; Ollama ignores it'
			: '    api_key="not-needed",  # vLLM / llama.cpp typically do not enforce a key';
	const contentEsc = userContent.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `from openai import OpenAI

client = OpenAI(
    base_url="http://\${JETSON_HOST}:${port}/v1",
${keyLine}
)

completion = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "${contentEsc}"}],
)
print(completion.choices[0].message.content)`;
}

function pythonNativeOllamaExample(tag: string): string {
	return `import json
import urllib.request

url = "http://\${JETSON_HOST}:11434/api/generate"
payload = json.dumps(
    {
        "model": "${tag}",
        "prompt": "Why is the sky blue?",
        "stream": False,
    }
).encode("utf-8")
req = urllib.request.Request(
    url,
    data=payload,
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req) as resp:
    body = json.load(resp)
    print(body.get("response", body))`;
}

/**
 * Minimal HTTP + OpenAI Python SDK examples (not per Jetson module — caller may be another machine).
 */
export function buildClientCallExamples(
	engines: SupportedEngineEntry[],
	opts: ClientExampleOptions,
): ClientCallExample[] {
	const out: ClientCallExample[] = [];
	const seen = new Set<string>();

	for (const e of engines) {
		const key = normEngine(e.engine);
		if (seen.has(key)) continue;

		const runSample = pickRunSample(e);

		if (key === 'vllm') {
			seen.add(key);
			const servedModelMatch = runSample.match(
				/--served-model-name(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/,
			);
			const model =
				servedModelMatch?.[1] ||
				servedModelMatch?.[2] ||
				servedModelMatch?.[3] ||
				opts.hfCheckpoint?.trim() ||
				opts.modelId.replace(/-/g, '_') ||
				'your-model-id';
			out.push({
				callEngineKey: 'vllm',
				engineLabel: 'vLLM (OpenAI-compatible HTTP API)',
				lang: 'shell',
				intro: '',
				showEngineHeading: false,
				command: `curl -s http://\${JETSON_HOST}:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
			});
			out.push({
				callEngineKey: 'vllm',
				engineLabel: 'Python (OpenAI SDK)',
				lang: 'python',
				intro: '',
				showEngineHeading: false,
				command: openaiSdkPythonExample(8000, model, 'compat', 'Hello!'),
			});
			continue;
		}

		if (key === 'sglang') {
			seen.add('sglang');
			const model =
				opts.hfCheckpoint?.trim() ||
				opts.modelId.replace(/-/g, '_') ||
				'your-model-id';
			out.push({
				callEngineKey: 'sglang',
				engineLabel: 'SGLang (OpenAI-compatible HTTP API)',
				lang: 'shell',
				intro: '',
				showEngineHeading: false,
				command: `curl -s http://\${JETSON_HOST}:30000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
			});
			out.push({
				callEngineKey: 'sglang',
				engineLabel: 'Python (OpenAI SDK)',
				lang: 'python',
				intro: '',
				showEngineHeading: false,
				command: openaiSdkPythonExample(30000, model, 'compat', 'Hello!'),
			});
			continue;
		}

		if (key === 'llamacpp') {
			seen.add('llamacpp');
			const aliasMatch = runSample.match(/--alias\s+(\S+)/);
			const modelName = aliasMatch?.[1] || 'my_model';
			out.push({
				callEngineKey: 'llamacpp',
				engineLabel: 'llama.cpp server (OpenAI-compatible API)',
				lang: 'shell',
				intro:
					'After llama-server is running with --network host, call it from another machine on the LAN (set <code class="text-xs bg-nvidia-gray-100 px-1 rounded">${JETSON_HOST}</code> or use the field). Default port is often 8080 unless you set --port.',
				command: `curl -s http://\${JETSON_HOST}:8080/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelName}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
			});
			out.push({
				callEngineKey: 'llamacpp',
				engineLabel: 'Python (OpenAI SDK)',
				lang: 'python',
				intro: '',
				showEngineHeading: false,
				command: openaiSdkPythonExample(8080, modelName, 'compat', 'Hello!'),
			});
			continue;
		}

		if (key === 'ollama') {
			seen.add('ollama');
			const tag =
				opts.hfCheckpoint?.split('/').pop() ||
				opts.modelId.replace(/_/g, '-') ||
				'your-model';
			const ollamaIntro =
				'With <code class="text-xs bg-nvidia-gray-100 px-1 rounded">ollama serve</code> on the Jetson, call from another host (set <code class="text-xs bg-nvidia-gray-100 px-1 rounded">${JETSON_HOST}</code> or use the field). Match the model name to what you pulled on device.';
			out.push({
				callEngineKey: 'ollama',
				callApiStyle: 'openai_compat',
				engineLabel: 'cURL (OpenAI-compatible /v1)',
				lang: 'shell',
				intro: ollamaIntro,
				showEngineHeading: false,
				command: `curl -s http://\${JETSON_HOST}:11434/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${tag}",
    "messages": [{"role": "user", "content": "Why is the sky blue?"}]
  }'`,
			});
			out.push({
				callEngineKey: 'ollama',
				callApiStyle: 'ollama_native',
				engineLabel: 'cURL (Ollama /api/generate)',
				lang: 'shell',
				intro: ollamaIntro,
				showEngineHeading: false,
				command: `curl -s http://\${JETSON_HOST}:11434/api/generate -d '{
  "model": "${tag}",
  "prompt": "Why is the sky blue?",
  "stream": false
}'`,
			});
			out.push({
				callEngineKey: 'ollama',
				callApiStyle: 'openai_compat',
				engineLabel: 'Python (OpenAI SDK · /v1)',
				lang: 'python',
				intro: '',
				showEngineHeading: false,
				command: openaiSdkPythonExample(11434, tag, 'ollama', 'Why is the sky blue?'),
			});
			out.push({
				callEngineKey: 'ollama',
				callApiStyle: 'ollama_native',
				engineLabel: 'Python (urllib · /api/generate)',
				lang: 'python',
				intro: '',
				showEngineHeading: false,
				command: pythonNativeOllamaExample(tag),
			});
		}
	}

	return out;
}
