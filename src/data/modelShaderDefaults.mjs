import rawDefaults from './modelShaderDefaults.json' with { type: 'json' };

/** Shared runtime and capture defaults for every model-family shader. */
export const MODEL_SHADER_DEFAULTS = Object.freeze(rawDefaults);

export function defaultShaderVariant(shaderId) {
	return MODEL_SHADER_DEFAULTS[shaderId]?.defaultVariant ?? null;
}

export function modelShaderDefaults(shaderId, variant) {
	const entry = MODEL_SHADER_DEFAULTS[shaderId];
	if (!entry) throw new Error(`Unknown model shader: ${shaderId}`);
	const selectedVariant = variant ?? entry.defaultVariant;
	const values = selectedVariant === undefined || selectedVariant === null
		? entry.defaults
		: entry.variants?.[String(selectedVariant)];
	if (!values) throw new Error(`Unknown model shader variant: ${shaderId}/${selectedVariant}`);
	return Object.freeze({ ...values });
}

export function modelShaderVariants(shaderId) {
	const entry = MODEL_SHADER_DEFAULTS[shaderId];
	return entry?.variants ? Object.keys(entry.variants) : [];
}

export const LIQUID_D1_SHADER_DEFAULTS = modelShaderDefaults('liquid');
