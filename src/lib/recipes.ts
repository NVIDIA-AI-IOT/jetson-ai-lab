import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { getSupportedInferenceEngines, sortEnginesForUi } from './modelFrontmatterAdapter';
import { JETSON_MATRIX_MODULES, serveCommandForMatrixCell } from './inferenceCommands';

export type Platform = 'thor' | 'orin';

export interface RecipeDevice {
	id: string;
	label: string;
	platform: Platform;
	memory: string;
}

export const RECIPE_DEVICES: RecipeDevice[] = [
	{ id: 'thor_t5000', label: 'AGX Thor', platform: 'thor', memory: '128GB' },
	{ id: 'orin_agx_64', label: 'AGX Orin 64GB', platform: 'orin', memory: '64GB' },
	{ id: 'orin_nano_8', label: 'Orin Nano 8GB', platform: 'orin', memory: '8GB' },
];

export interface SdInfo {
	method: string;
	tokens: number | null;
	draft: string | null;
}

export interface Recipe {
	engine: string;
	deviceId: string;
	platform: Platform;
	quant: string | null;
	setup: string | null;
	command: string;
	checkpoint: string | null;
	sd: SdInfo | null;
	commandNoSd: string | null;
}

export interface RecipeModel {
	slug: string;
	name: string;
	recipes: Recipe[];
	defaults: Record<string, string>;
}

const SD_METHOD_LABEL: Record<string, string> = {
	mtp: 'MTP',
	qwen3_next_mtp: 'MTP',
	'draft-mtp': 'MTP',
	dspark: 'DSpark',
	dflash: 'DFlash',
	'draft-dflash': 'DFlash',
	eagle: 'EAGLE',
	eagle3: 'EAGLE-3',
	ngram: 'N-gram',
	'draft-simple': 'Draft model',
	draft_model: 'Draft model',
};

function detectSd(cmd: string): SdInfo | null {
	const json = cmd.match(/--speculative-config\s+'([^']+)'/);
	if (json) {
		try {
			const cfg = JSON.parse(json[1]);
			return {
				method: SD_METHOD_LABEL[cfg.method] ?? cfg.method,
				tokens: cfg.num_speculative_tokens ?? null,
				draft: cfg.model ?? null,
			};
		} catch {
		}
	}
	const dotted = cmd.match(/--speculative_config\.method\s+(\S+)/);
	if (dotted) {
		return {
			method: SD_METHOD_LABEL[dotted[1]] ?? dotted[1],
			tokens: Number(cmd.match(/--speculative_config\.num_speculative_tokens\s+(\d+)/)?.[1]) || null,
			draft: cmd.match(/--speculative_config\.model\s+(\S+)/)?.[1] ?? null,
		};
	}
	const llama = cmd.match(/--spec-type\s+(\S+)/);
	if (llama) {
		return {
			method: SD_METHOD_LABEL[llama[1]] ?? llama[1],
			tokens: Number(cmd.match(/--draft-max\s+(\d+)/)?.[1]) || null,
			draft: cmd.match(/-hfd\s+(\S+)/)?.[1] ?? null,
		};
	}
	return null;
}

function stripSd(cmd: string): string {
	return tidyEnd(cmd
		.replace(/\s*--speculative-config\s+'[^']*'/g, '')
		.replace(/\n?[ \t]*--speculative_config\.\S+\s+\S+[ \t]*\\?/g, '')
		.replace(/\n?[ \t]*--spec-type\s+\S+[ \t]*\\?/g, '')
		.replace(/\n?[ \t]*-hfd\s+\S+[ \t]*\\?/g, '')
		.replace(/\n?[ \t]*-ngld\s+\S+[ \t]*\\?/g, '')
		.replace(/\n?[ \t]*--draft-max\s+\S+[ \t]*\\?/g, '')
		.replace(/\n?[ \t]*--spec-draft-[\w-]+\s+\S+[ \t]*\\?/g, '')
		.replace(/\n?[ \t]*(?:-md|--model-draft)\s+\S+[ \t]*\\?/g, ''));
}

const GATED_REPOS = [/^google\/gemma-3-/, /^meta-llama\//, /^nvidia\/Cosmos-Reason2-/];

function addTokenStep(setup: string | null, command: string): { setup: string | null; command: string } {
	const repo = command.match(/\b[A-Za-z0-9][\w.-]*\/[\w.-]+/g)?.find((r) => GATED_REPOS.some((g) => g.test(r)));
	if (!repo || /HF_TOKEN/.test(command)) return { setup, command };
	const step = [
		`# This model is gated. Accept its license at`,
		`# https://huggingface.co/${repo}, then paste a read token from`,
		`# https://huggingface.co/settings/tokens:`,
		`read -rsp "Hugging Face token: " t`,
		`echo`,
		`mkdir -p $HOME/.cache/huggingface`,
		`(umask 077; printf %s "$t" > $HOME/.cache/huggingface/token); unset t`,
	].join('\n');
	return { setup: setup ? `${step}\n\n${setup}` : step, command };
}

const shellTokens = (line: string) => line.match(/(?:'[^']*'|"[^"]*"|[^\s'"]+)+/g) ?? [];

const DOCKER_VALUE_FLAGS = new Set(['-v', '--volume', '-e', '--env', '--env-file', '--name', '--network', '--runtime', '--pull', '--ipc', '--gpus', '-p', '--publish', '--shm-size', '--entrypoint', '--device', '--ulimit', '-w', '--workdir', '-u', '--user', '--mount']);

const isSdOpt = (o: string) => /^(--speculative|--spec-|--draft-|-hfd\b|-ngld\b|-md\b|--model-draft\b)/.test(o);

function formatDockerRun(line: string): string | null {
	const t = shellTokens(line.trim());
	let i = 0;
	const head: string[] = [];
	if (t[i] === 'sudo') head.push(t[i++]);
	if (t[i] !== 'docker' || t[i + 1] !== 'run') return null;
	head.push(t[i++], t[i++]);
	const dockerOpts: string[] = [];
	while (i < t.length && t[i].startsWith('-')) {
		const f = t[i++];
		dockerOpts.push(!f.includes('=') && DOCKER_VALUE_FLAGS.has(f) && i < t.length ? `${f} ${t[i++]}` : f);
	}
	if (i >= t.length) return null;
	const image = t[i++];
	const program: string[] = [];
	while (i < t.length && !t[i].startsWith('-')) program.push(t[i++]);
	let opts: string[] = [];
	while (i < t.length) {
		const unit = [t[i++]];
		while (i < t.length && !t[i].startsWith('-')) unit.push(t[i++]);
		opts.push(unit.join(' '));
	}
	const dotted = opts.filter((o) => o.startsWith('--speculative_config.'));
	if (dotted.length) {
		const cfg: Record<string, string | number> = {};
		for (const o of dotted) {
			const [, key, val] = o.match(/^--speculative_config\.(\S+) (\S+)$/) ?? [];
			if (key) cfg[key] = /^\d+$/.test(val) ? Number(val) : val;
		}
		opts = opts.filter((o) => !o.startsWith('--speculative_config.'));
		opts.push(`--speculative-config '${JSON.stringify(cfg)}'`);
	}
	opts = [...opts.filter((o) => !isSdOpt(o)), ...opts.filter(isSdOpt)];
	opts = opts.map((o) => {
		const m = o.match(/^(--speculative-config) '(\{.*\})'$/);
		if (!m || o.length <= 90) return o;
		try {
			const cfg = JSON.parse(m[2]);
			const body = Object.entries(cfg).map(([k, v]) => `        ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
			return `${m[1]} '{\n${body}\n      }'`;
		} catch {
			return o;
		}
	});
	const control = (o: string) => /^(-it|-i|-t|-d|--rm|--init|--pull[ =]\S+)$/.test(o);
	const first = [...head, '-it', '--rm', '--pull always'].join(' ');
	const rank = (o: string) => ['--name', '--runtime', '--network', '--ipc', '--gpus', '-e', '-v'].findIndex((f) => o === f || o.startsWith(`${f} `) || o.startsWith(`${f}=`));
	const rest = dockerOpts
		.filter((o) => !control(o) && !/^--name[ =]/.test(o))
		.map((o) => o.replace(/^(--[\w-]+)=(\S+)$/, '$1 $2'))
		.map((o, i) => ({ o, i, r: rank(o) < 0 ? 99 : rank(o) }))
		.sort((a, b) => a.r - b.r || a.i - b.i)
		.map((x) => x.o);
	dockerOpts.splice(0, dockerOpts.length, ...rest);
	const lines = [first, ...dockerOpts.map((o) => `  ${o}`), `  ${image}`];
	if (program.length) lines.push(`    ${program.join(' ')}`);
	lines.push(...opts.map((o) => `    ${splitQuoted(o)}`));
	return lines.join(' \\\n');
}

function splitQuoted(opt: string): string {
	const m = opt.match(/^(\S+ )"([^"]{80,})"$/);
	if (!m) return opt;
	const parts = m[2].split(/ (?=--[A-Za-z])| (?=&& )/);
	return `${m[1]}"${parts.join(' \\\n      ')}"`;
}

function formatShell(text: string): string {
	return text
		.replace(/[ \t]*\\\n[ \t]*/g, ' ')
		.split('\n')
		.map((line) => {
			if (line.trim().startsWith('#')) return line;
			const docker = formatDockerRun(line);
			if (docker) return docker;
			if (line.length <= 88) return line;
			const units: string[] = [];
			for (const tok of shellTokens(line)) {
				if (!units.length || (tok.startsWith('-') && units.length > 0)) units.push(tok);
				else units[units.length - 1] += ` ${tok}`;
			}
			while (units.length > 1 && `${units[0]} ${units[1]}`.length <= 88) units.splice(0, 2, `${units[0]} ${units[1]}`);
			return units.map((u, k) => (k ? `  ${u}` : u)).join(' \\\n');
		})
		.join('\n');
}

const hfHome = (command: string) =>
	/ghcr\.io\/nvidia-ai-iot\/vllm:\S*jetson-orin/.test(command) ? '/data/models/huggingface' : '/root/.cache/huggingface';

function addCacheMount(engine: string, command: string): string {
	const cmd = command.replace(/(-v\s+)~\//g, '$1$HOME/');
	if ((engine !== 'vLLM' && engine !== 'llama.cpp') || !/docker run/.test(cmd)) return cmd;
	const mount = `$HOME/.cache/huggingface:${hfHome(cmd)}`;
	const existing = /(-v\s+"?)\$HOME\/\.cache\/huggingface:[^\s"]+/;
	if (existing.test(cmd)) return cmd.replace(existing, `$1${mount}`);
	return cmd.replace(/(sudo docker run)\b/, `$1 -v ${mount}`);
}

const tidyEnd = (cmd: string) => cmd.replace(/[ \t]*\\\s*$/, '').trimEnd();

function splitCommand(raw: string): { setup: string | null; command: string } {
	const lines = raw.split('\n').filter((l) => !l.trim().startsWith('#') || /^#\s*(Installation|Serve command)\s*$/.test(l.trim()));
	let text = lines.join('\n')
		.replace(/^(\s*)docker run /gm, '$1sudo docker run ')
		.replace(/\n{3,}/g, '\n\n');
	const m = text.match(/^#\s*Installation\s*\n([\s\S]*?)\n\s*#\s*Serve command\s*\n([\s\S]*)$/);
	if (m) return { setup: m[1].trim() || null, command: tidyEnd(m[2].trim()) };
	return { setup: null, command: tidyEnd(text.replace(/^#\s*Serve command\s*\n/, '').trim()) };
}

function detectQuant(cmd: string): string | null {
	const c = cmd.toLowerCase();
	if (/nvfp4/.test(c)) return 'NVFP4';
	if (/mxfp4/.test(c)) return 'MXFP4';
	if (/fp8/.test(c) && !/kv-cache-dtype fp8/.test(c)) return 'FP8';
	if (/w4a16|awq|gptq|quantized\.w4/.test(c)) return 'W4A16';
	const gguf = cmd.match(/:(Q\d[\w_]*|UD-[\w_]+|IQ[\w_]+)/i) ??
		cmd.match(/[-_.]((?:UD-)?(?:Q\d_[A-Z0-9_]*?|IQ\d[A-Z0-9_]*?))(?:-\d{5}-of-\d{5})?\.gguf\b/i);
	if (gguf) return `GGUF ${gguf[1].toUpperCase()}`;
	if (/gguf/.test(c)) return 'GGUF';
	if (/bf16/.test(c)) return 'BF16';
	return null;
}

function readHelperHead(path: string): string {
	try {
		return readFileSync(new URL(`../../public/${path}`, import.meta.url), 'utf8').split('\n').slice(0, 20).join('\n');
	} catch {
		return '';
	}
}

const ENGINE_NAME: Record<string, string> = { 'TensorRT Edge-LLM': 'Edge-LLM' };

let cache: RecipeModel[] | null = null;

export async function getRecipeModels(): Promise<RecipeModel[]> {
	if (cache) return cache;
	const entries = await getCollection('models');
	const out: RecipeModel[] = [];
	for (const entry of entries) {
		const d = entry.data;
		if (d.hide_run_button) continue;
		const engines = sortEnginesForUi(getSupportedInferenceEngines(d));
		const recipes: Recipe[] = [];
		for (const dev of RECIPE_DEVICES) {
			const mod = JETSON_MATRIX_MODULES.find((m) => m.id === dev.id)!;
			if (d.matrix_modules_disabled?.includes(dev.id)) continue;
			for (const e of engines) {
				const raw = serveCommandForMatrixCell(e, mod).trim();
				if (!raw) continue;
				const engineName = ENGINE_NAME[e.engine] ?? e.engine;
				if (engineName === 'Ollama') continue;
				const split = splitCommand(raw);
				const withToken = addTokenStep(split.setup, addCacheMount(engineName, split.command));
				const setup = withToken.setup && formatShell(withToken.setup);
				const command = formatShell(withToken.command);

				const sd = detectSd(command);
				const helper = (withToken.setup ?? '').match(/jetson-ai-lab\.com\/(code-samples\/[\w./-]+\.sh)/)?.[1];
				const helperHead = helper ? readHelperHead(helper) : '';
				recipes.push({
					engine: engineName,
					deviceId: dev.id,
					platform: dev.platform,
					quant: detectQuant(command) ?? (helperHead ? detectQuant(helperHead) : null),
					setup,
					command,
					checkpoint: helperHead.match(/^readonly MODEL_ID='([^']+)'/m)?.[1] ?? null,
					sd,
					commandNoSd: sd ? stripSd(command) : null,
				});
			}
		}
		if (recipes.length === 0) continue;

		const defaults: Record<string, string> = {};
		for (const dev of RECIPE_DEVICES) {
			const r = recipes.find((x) => x.deviceId === dev.id);
			if (r) defaults[dev.id] = r.engine;
		}

		out.push({
			slug: entry.slug,
			name: d.title,
			recipes,
			defaults,
		});
	}
	cache = out;
	return out;
}
