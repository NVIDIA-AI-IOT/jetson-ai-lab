import type { InferenceCategory } from './engines';
import type { SupportedEngineEntry } from './inferenceCommands';
import {
	JETSON_MATRIX_TAB_MODULE_IDS,
	applyMatrixModuleDisabledFlags,
	engineSupportsModule,
	filterEnginesForModel,
	matchSupportedEngine,
	matrixRunnableModuleIdsForModel,
	serveCommandForMatrixCell,
	visibleModulesForEngines,
} from './inferenceCommands';
import {
	evalMatrixModuleSpecs,
	evalSnippetByModule,
	oneShotHasRunModalContent,
	type OneShotForRunModal,
} from './evalRunModal';

/** Catalog table / filter chips — UI ids match {@link matchSupportedEngine} / INFERENCE_ENGINES. */
export const CATALOG_ENGINE_FILTERS: readonly { uiId: string; label: string }[] = [
	{ uiId: 'vllm', label: 'vLLM' },
	{ uiId: 'ollama', label: 'Ollama' },
	{ uiId: 'llamacpp', label: 'llama.cpp' },
	{ uiId: 'edgemllm', label: 'TensorRT Edge-LLM' },
];

function oneShotModuleIdsWithContent(o: OneShotForRunModal): string[] {
	if (!oneShotHasRunModalContent(o)) return [];
	const specs = evalMatrixModuleSpecs(o);
	const specIds = new Set(specs.map((m) => m.id));
	const out: string[] = [];
	for (const id of JETSON_MATRIX_TAB_MODULE_IDS) {
		if (!specIds.has(id)) continue;
		const snip = evalSnippetByModule(o, [id])[id];
		if ((snip?.shell || '').trim() || (snip?.python || '').trim()) out.push(id);
	}
	return out;
}

function inferEngineUiIdsFromOneShot(o: OneShotForRunModal | undefined): string[] {
	if (!oneShotHasRunModalContent(o)) return [];
	const blobs: string[] = [];
	if (o.run_command_orin?.trim()) blobs.push(o.run_command_orin);
	if (o.run_command_thor?.trim()) blobs.push(o.run_command_thor);
	if (o.shell?.trim()) blobs.push(o.shell);
	if (o.python?.trim()) blobs.push(o.python);
	for (const v of Object.values(o.shell_by_module || {})) {
		if (String(v).trim()) blobs.push(String(v));
	}
	for (const v of Object.values(o.python_by_module || {})) {
		if (String(v).trim()) blobs.push(String(v));
	}
	const text = blobs.join('\n');
	const found = new Set<string>();
	const checks: { id: string; re: RegExp }[] = [
		{ id: 'ollama', re: /\boolama\b/i },
		{ id: 'vllm', re: /\bvllm\b/i },
		{ id: 'llamacpp', re: /\b(llama\.cpp|llamacpp)\b/i },
		{ id: 'edgemllm', re: /\b(edge[\s-]?llm|edgemllm|tensorrt[\s-]?llm|trt_llm)\b/i },
	];
	for (const { id, re } of checks) {
		if (re.test(text)) found.add(id);
	}
	return [...found];
}

function serveEngineUiIdsForModel(
	category: InferenceCategory,
	engines: SupportedEngineEntry[],
	matrixModulesDisabled?: readonly string[] | null
): Set<string> {
	const out = new Set<string>();
	const catalogUiIds = new Set(CATALOG_ENGINE_FILTERS.map((e) => e.uiId));
	const mods = applyMatrixModuleDisabledFlags(visibleModulesForEngines(engines), matrixModulesDisabled);
	const uiEngines = filterEnginesForModel(category, engines);
	for (const ui of uiEngines) {
		if (!catalogUiIds.has(ui.id)) continue;
		const entry = matchSupportedEngine(engines, ui.id);
		if (!entry) continue;
		for (const mod of mods) {
			if (mod.disabled) continue;
			if (!engineSupportsModule(entry, mod.id)) continue;
			if (serveCommandForMatrixCell(entry, mod).trim()) {
				out.add(ui.id);
				break;
			}
		}
	}
	return out;
}

/** Matrix tab modules where the model has a runnable serve matrix cell and/or one-shot snippet for that tab. */
export function catalogModuleIdsForModel(
	category: InferenceCategory,
	engines: SupportedEngineEntry[],
	matrixModulesDisabled: readonly string[] | undefined | null,
	oneShot: OneShotForRunModal | undefined | null
): string[] {
	const set = new Set(matrixRunnableModuleIdsForModel(category, engines, matrixModulesDisabled));
	if (oneShot) {
		for (const id of oneShotModuleIdsWithContent(oneShot)) {
			set.add(id);
		}
	}
	return JETSON_MATRIX_TAB_MODULE_IDS.filter((id) => set.has(id));
}

/** Catalog engine UI ids where the model has a serve command on some matrix module and/or one-shot text implies that runtime. */
export function catalogEngineUiIdsForModel(
	category: InferenceCategory,
	engines: SupportedEngineEntry[],
	matrixModulesDisabled: readonly string[] | undefined | null,
	oneShot: OneShotForRunModal | undefined | null
): string[] {
	const s =
		engines.length > 0
			? serveEngineUiIdsForModel(category, engines, matrixModulesDisabled)
			: new Set<string>();
	for (const id of inferEngineUiIdsFromOneShot(oneShot ?? undefined)) {
		s.add(id);
	}
	return CATALOG_ENGINE_FILTERS.map((e) => e.uiId).filter((id) => s.has(id));
}
