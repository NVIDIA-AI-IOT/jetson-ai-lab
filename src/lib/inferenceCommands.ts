import { enginesForCategory, type InferenceCategory } from './engines';
import type { InferenceEngine } from './engines';

/** Mirrors model frontmatter `supported_inference_engines` / `serving.entries` */
export interface SupportedEngineEntry {
	engine: string;
	type?: string;
	install_command?: string;
	run_command?: string;
	install_command_orin?: string;
	/** Long-running serve command (vLLM serve, `ollama serve`, etc.). Preferred over legacy `run_command_orin`. */
	serve_command_orin?: string;
	install_command_thor?: string;
	serve_command_thor?: string;
	/** @deprecated Prefer `serve_command_orin`; still accepted as fallback for serve matrix. */
	run_command_orin?: string;
	/** @deprecated Prefer `serve_command_thor`. */
	run_command_thor?: string;
	/** If set and non-empty, only these matrix module ids are enabled for this engine (others grayed). */
	modules_supported?: string[];
	/** Per-module run command (optional). Key = module id, e.g. `orin_agx_64`. */
	run_commands_by_module?: Record<string, string>;
}

export type PlatformKey = 'orin' | 'thor';

/** Jetson hardware row in the matrix UI (icons: set `iconSrc` when Figma assets land). */
export interface JetsonModuleSpec {
	/** Canonical id for front matter / analytics, e.g. `thor_t5000`, `orin_nano_4` */
	id: string;
	/** Accessible name, e.g. for tooltips */
	label: string;
	/** Short text next to the icon in the matrix tab */
	shortLabel: string;
	/** Matrix tab first line — small type (e.g. “Jetson”) */
	tabKicker: string;
	/** Matrix tab second line — bold (e.g. “T5000 module”) */
	tabTitleBold: string;
	/** Matrix tab third line — muted gray (e.g. developer kit name), if any */
	tabSubtitleGray?: string;
	platformKey: PlatformKey;
	/** Optional path under `public/` e.g. `/images/jetson-soms/thor_t5000.png` */
	iconSrc?: string;
	/** Small label on the icon frame (top-left), e.g. Thor / Orin */
	iconBadgeFamily?: string;
	/** Small label on the icon frame (bottom-right), e.g. 128GB */
	iconBadgeMemory?: string;
	/** When true, tab is shown but not selectable (e.g. coming soon). */
	disabled?: boolean;
	/**
	 * When false, id is valid for front matter and `moduleById`, but no Serve/Run matrix tab is shown.
	 * Commands still resolve via `platformKey` (orin vs thor).
	 */
	showInMatrixUi?: boolean;
}

/**
 * Canonical Jetson module ids (front matter, analytics). Thor / Orin command strings still map by `platformKey`.
 *
 * Matrix tabs: by default only modules with `showInMatrixUi !== false` appear in Serve + Run modal
 * (`thor_t5000`, `thor_t4000`, `orin_agx_64`, `orin_nx_16`, `orin_nano_8`). Others are data-only.
 */
export const JETSON_MATRIX_MODULES: readonly JetsonModuleSpec[] = [
	{
		id: 'thor_t5000',
		label: 'Jetson AGX Thor Developer Kit / T5000 module',
		shortLabel: 'T5000',
		tabKicker: 'Jetson',
		tabTitleBold: 'T5000 module',
		tabSubtitleGray: 'Jetson AGX Thor Developer Kit',
		platformKey: 'thor',
		iconSrc: '/images/jetson-soms/thor_t5000.png',
		iconBadgeFamily: 'Thor',
		iconBadgeMemory: '128GB',
	},
	{
		id: 'thor_t4000',
		label: 'T4000 module',
		shortLabel: 'T4000',
		tabKicker: 'Jetson',
		tabTitleBold: 'T4000 module',
		platformKey: 'thor',
		iconSrc: '/images/jetson-soms/thor_t4000.png',
		iconBadgeFamily: 'Thor',
		iconBadgeMemory: '64GB',
	},
	{
		id: 'orin_agx_64',
		label: 'Jetson AGX Orin 64GB Developer Kit / AGX Orin 64GB module',
		shortLabel: 'AGX Orin 64GB',
		tabKicker: 'Jetson',
		tabTitleBold: 'AGX Orin 64GB module',
		tabSubtitleGray: 'Jetson AGX Orin 64GB Developer Kit',
		platformKey: 'orin',
		iconSrc: '/images/jetson-soms/orin_agx_64.png',
		iconBadgeFamily: 'Orin',
		iconBadgeMemory: '64GB',
	},
	{
		id: 'orin_agx_32',
		label: 'Jetson AGX Orin 32GB Developer Kit / AGX Orin 32GB module',
		shortLabel: 'AGX Orin 32GB',
		tabKicker: 'Jetson',
		tabTitleBold: 'AGX Orin 32GB module',
		tabSubtitleGray: 'Jetson AGX Orin 32GB Developer Kit',
		platformKey: 'orin',
		showInMatrixUi: false,
		iconBadgeFamily: 'Orin',
		iconBadgeMemory: '32GB',
	},
	{
		id: 'orin_nx_16',
		label: 'Orin NX 16GB module',
		shortLabel: 'Orin NX 16GB',
		tabKicker: 'Jetson',
		tabTitleBold: 'Orin NX 16GB module',
		platformKey: 'orin',
		iconSrc: '/images/jetson-soms/orin_nx_16.png',
		iconBadgeFamily: 'Orin',
		iconBadgeMemory: '16GB',
	},
	{
		id: 'orin_nx_8',
		label: 'Orin NX 8GB module',
		shortLabel: 'Orin NX 8GB',
		tabKicker: 'Jetson',
		tabTitleBold: 'Orin NX 8GB module',
		platformKey: 'orin',
		showInMatrixUi: false,
		iconBadgeFamily: 'Orin',
		iconBadgeMemory: '8GB',
	},
	{
		id: 'orin_nano_8',
		label: 'Jetson Orin Nano 8GB Developer Kit / Orin Nano 8GB module',
		shortLabel: 'Orin Nano 8GB',
		tabKicker: 'Jetson',
		tabTitleBold: 'Orin Nano 8GB module',
		tabSubtitleGray: 'Jetson Orin Nano 8GB Developer Kit',
		platformKey: 'orin',
		iconSrc: '/images/jetson-soms/orin_nano_8.png',
		iconBadgeFamily: 'Orin',
		iconBadgeMemory: '8GB',
	},
	{
		id: 'orin_nano_4',
		label: 'Jetson Orin Nano 4GB Developer Kit / Orin Nano 4GB module',
		shortLabel: 'Orin Nano 4GB',
		tabKicker: 'Jetson',
		tabTitleBold: 'Orin Nano 4GB module',
		tabSubtitleGray: 'Jetson Orin Nano 4GB Developer Kit',
		platformKey: 'orin',
		showInMatrixUi: false,
		iconBadgeFamily: 'Orin',
		iconBadgeMemory: '4GB',
	},
] as const;

/** Ids that appear as matrix tabs (subset of {@link JETSON_MATRIX_MODULES} with {@link JetsonModuleSpec.showInMatrixUi} !== false). */
export const JETSON_MATRIX_TAB_MODULE_IDS: readonly string[] = JETSON_MATRIX_MODULES.filter(
	(m) => m.showInMatrixUi !== false
).map((m) => m.id);

export function moduleById(id: string): JetsonModuleSpec | undefined {
	return JETSON_MATRIX_MODULES.find((m) => m.id === id);
}

const ENGINE_KEY_ALIASES: Readonly<Record<string, string>> = {
	edgemllm: 'edgemllm',
	edgellm: 'edgemllm',
	tensorrtedgellm: 'edgemllm',
};

export function normalizeEngineKey(s: string): string {
	const key = s.trim().toLowerCase().replace(/[.\-_\s]/g, '');
	return ENGINE_KEY_ALIASES[key] ?? key;
}

/** Install + run for one platform (same strings the model page and modal must show). */
/** True if this engine lists the module as supported (omit `modules_supported` = all modules). */
export function engineSupportsModule(e: SupportedEngineEntry, moduleId: string): boolean {
	const ms = e.modules_supported;
	if (ms === undefined || ms === null) return true;
	if (ms.length === 0) return false;
	return ms.includes(moduleId);
}

function combineInstallAndRunBody(
	e: SupportedEngineEntry,
	platform: PlatformKey,
	runBody: string
): string {
	const install =
		platform === 'thor'
			? (e.install_command_thor ?? e.install_command)
			: (e.install_command_orin ?? e.install_command);
	let combined = '';
	if (install) combined += `# Installation\n${install}`;
	if (runBody?.trim()) {
		if (combined) combined += '\n\n';
		combined += `# Serve command\n${runBody.trim()}`;
	}
	return combined;
}

/** Orin/Thor row has content: platform run fields and/or per-module run for any module on that platform. */
export function engineHasPlatformContent(e: SupportedEngineEntry, platform: PlatformKey): boolean {
	if (combineInstallRunForPlatform(e, platform)) return true;
	const byMod = e.run_commands_by_module;
	if (!byMod) return false;
	for (const mod of JETSON_MATRIX_MODULES) {
		if (mod.platformKey !== platform) continue;
		if (byMod[mod.id]?.trim()) return true;
	}
	return false;
}

export function combineInstallRunForPlatform(
	e: SupportedEngineEntry,
	platform: PlatformKey
): string {
	const install =
		platform === 'thor'
			? (e.install_command_thor ?? e.install_command)
			: (e.install_command_orin ?? e.install_command);
	const run =
		platform === 'thor'
			? (e.serve_command_thor ?? e.run_command_thor ?? e.run_command)
			: (e.serve_command_orin ?? e.run_command_orin ?? e.run_command);
	let combined = '';
	if (install) combined += `# Installation\n${install}`;
	if (run) {
		if (combined) combined += '\n\n';
		combined += `# Serve command\n${run}`;
	}
	return combined;
}

export function combineInstallRunForModule(
	e: SupportedEngineEntry,
	module: JetsonModuleSpec
): string {
	return combineInstallRunForPlatform(e, module.platformKey);
}

/**
 * Command shown in the Serve matrix / Run modal for one engine × module cell.
 * Respects `modules_supported` and optional `run_commands_by_module[moduleId]`.
 */
export function serveCommandForMatrixCell(
	e: SupportedEngineEntry,
	module: JetsonModuleSpec
): string {
	if (!engineSupportsModule(e, module.id)) return '';
	const specific = e.run_commands_by_module?.[module.id];
	if (specific !== undefined && specific.trim() !== '') {
		return combineInstallAndRunBody(e, module.platformKey, specific);
	}
	return combineInstallRunForModule(e, module);
}

/**
 * Matrix tabs: the full standard set ({@link JETSON_MATRIX_MODULES} with {@link JetsonModuleSpec.showInMatrixUi} !== false).
 * Orin tabs stay visible when the model is Thor-only (and vice versa); unsupported combinations are disabled in UI
 * via `modules_supported`, `serveCommandForMatrixCell`, and per-engine rules in Layout / ModelServeSection.
 *
 * @param _engines Kept for call-site stability; tab list no longer depends on which platforms have commands.
 */
export function visibleModulesForEngines(_engines: SupportedEngineEntry[]): JetsonModuleSpec[] {
	return JETSON_MATRIX_MODULES.filter((m) => m.showInMatrixUi !== false);
}

/**
 * Matrix tab module ids the model can run on (any listed inference engine has a non-empty serve command,
 * respects `modules_supported` and `matrix_modules_disabled`). Used for catalog filtering.
 */
export function matrixRunnableModuleIdsForModel(
	category: InferenceCategory,
	engines: SupportedEngineEntry[],
	matrixModulesDisabled?: readonly string[] | null
): string[] {
	if (!engines.length) return [];
	const base = visibleModulesForEngines(engines);
	const flagged = applyMatrixModuleDisabledFlags(base, matrixModulesDisabled);
	const uiEngines = filterEnginesForModel(category, engines);
	const union = new Set<string>();
	for (const mod of flagged) {
		if (mod.disabled) continue;
		for (const ui of uiEngines) {
			const entry = matchSupportedEngine(engines, ui.id);
			if (!entry) continue;
			if (!engineSupportsModule(entry, mod.id)) continue;
			if (!serveCommandForMatrixCell(entry, mod).trim()) continue;
			union.add(mod.id);
			break;
		}
	}
	return Array.from(union);
}

/**
 * Clone matrix-visible modules and set `disabled` when id is listed in model front matter
 * `matrix_modules_disabled`, or when the catalog entry already had `disabled: true`.
 */
export function applyMatrixModuleDisabledFlags(
	modules: JetsonModuleSpec[],
	disabledIds?: readonly string[] | null
): JetsonModuleSpec[] {
	const set = new Set(
		(disabledIds ?? []).map((id) => id.trim()).filter(Boolean)
	);
	if (set.size === 0) return modules.map((m) => ({ ...m }));
	return modules.map((m) => ({
		...m,
		disabled: Boolean(m.disabled || set.has(m.id)),
	}));
}

/** Match UI engine id (e.g. vllm, llamacpp) to a content entry (e.g. vLLM, llama.cpp). */
export function matchSupportedEngine(
	supportedEngines: SupportedEngineEntry[],
	engineId: string
): SupportedEngineEntry | undefined {
	const normId = normalizeEngineKey(engineId);
	return supportedEngines.find((e) => {
		if (!e.engine) return false;
		return normalizeEngineKey(e.engine) === normId;
	});
}

/** Same filtering as RunCommand.astro for inference engine dropdowns. */
export function filterEnginesForModel(
	category: InferenceCategory,
	supportedEngines?: SupportedEngineEntry[]
): InferenceEngine[] {
	let engines = enginesForCategory(category);
	if (supportedEngines?.length) {
		engines = engines.filter((e) => matchSupportedEngine(supportedEngines, e.id));
	}
	return engines;
}

/**
 * Per UI engine id → combined bash for Orin and Thor (for modal data-meta + Layout).
 */
export function buildCommandMatrix(
	category: InferenceCategory,
	supportedEngines?: SupportedEngineEntry[]
): Record<string, { orin: string; thor: string }> {
	const matrix: Record<string, { orin: string; thor: string }> = {};
	if (!supportedEngines?.length) return matrix;
	const uiEngines = filterEnginesForModel(category, supportedEngines);
	for (const ui of uiEngines) {
		const entry = matchSupportedEngine(supportedEngines, ui.id);
		if (entry) {
			matrix[ui.id] = {
				orin: combineInstallRunForPlatform(entry, 'orin'),
				thor: combineInstallRunForPlatform(entry, 'thor'),
			};
		}
	}
	return matrix;
}

/** moduleId → { engineUiId → combined bash } for Run modal (matches model page matrix). */
export function buildModuleCommandMatrix(
	category: InferenceCategory,
	supportedEngines?: SupportedEngineEntry[]
): Record<string, Record<string, string>> {
	const out: Record<string, Record<string, string>> = {};
	if (!supportedEngines?.length) return out;
	const modules = visibleModulesForEngines(supportedEngines);
	const uiEngines = filterEnginesForModel(category, supportedEngines);
	for (const mod of modules) {
		out[mod.id] = {};
		for (const ui of uiEngines) {
			const entry = matchSupportedEngine(supportedEngines, ui.id);
			if (entry) {
				out[mod.id][ui.id] = serveCommandForMatrixCell(entry, mod);
			}
		}
	}
	return out;
}

export function moduleIdToPlatformMap(modules: JetsonModuleSpec[]): Record<string, PlatformKey> {
	const m: Record<string, PlatformKey> = {};
	for (const mod of modules) m[mod.id] = mod.platformKey;
	return m;
}
