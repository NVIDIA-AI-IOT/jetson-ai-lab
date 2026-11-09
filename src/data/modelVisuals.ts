export type ModelFamilyVisual = {
	id: string;
	shaderId: string;
	label: string;
	palette: {
		background: string;
		accent: string;
	};
	assets: {
		hero: string;
		catalog: string;
		icon?: string;
	};
	alt: {
		hero: string;
		catalog: string;
		icon?: string;
	};
	iconStrategy: 'none' | 'official';
	variants?: Record<string, {
		assets: Pick<ModelFamilyVisual['assets'], 'hero' | 'catalog'>;
	}>;
};

export const modelFamilyVisuals: Record<string, ModelFamilyVisual> = {
	qwen: {
		id: 'qwen',
		shaderId: 'qwen',
		label: 'Qwen',
		palette: {
			background: '#070719',
			accent: '#155EEF',
		},
		assets: {
			hero: '/images/model-families/qwen/hero-3-8.webp',
			catalog: '/images/model-families/qwen/catalog-3-8.webp',
		},
		alt: {
			hero: 'Long translucent blue rectangular planes overlapping in an isometric field',
			catalog: 'Overlapping blue rectangular planes in an isometric projection',
		},
		iconStrategy: 'none',
		variants: {
			'3': { assets: { hero: '/images/model-families/qwen/hero-3.webp', catalog: '/images/model-families/qwen/catalog-3.webp' } },
			'3.5': { assets: { hero: '/images/model-families/qwen/hero-3-5.webp', catalog: '/images/model-families/qwen/catalog-3-5.webp' } },
			'3.6': { assets: { hero: '/images/model-families/qwen/hero-3-5.webp', catalog: '/images/model-families/qwen/catalog-3-5.webp' } },
			'3.8': { assets: { hero: '/images/model-families/qwen/hero-3-8.webp', catalog: '/images/model-families/qwen/catalog-3-8.webp' } },
		},
	},
	gemma: {
		id: 'gemma',
		shaderId: 'gemma',
		label: 'Google Gemma',
		palette: {
			background: '#071D41',
			accent: '#4285F4',
		},
		assets: {
			hero: '/images/model-families/gemma/hero-4.webp',
			catalog: '/images/model-families/gemma/catalog-4.webp',
		},
		alt: {
			hero: 'Pale blue curved streams moving through a deep blue field',
			catalog: 'Layered pale blue streams with sparse blue particulate highlights',
		},
		iconStrategy: 'none',
		variants: {
			'3': { assets: { hero: '/images/model-families/gemma/hero-3.webp', catalog: '/images/model-families/gemma/catalog-3.webp' } },
			'4': { assets: { hero: '/images/model-families/gemma/hero-4.webp', catalog: '/images/model-families/gemma/catalog-4.webp' } },
		},
	},
	'liquid-d1': {
		id: 'liquid-d1',
		shaderId: 'liquid',
		label: 'Liquid AI d1',
		palette: {
			background: '#0D0913',
			accent: '#7C3CFF',
		},
		assets: {
			hero: '/images/model-families/liquid-d1/hero.webp',
			catalog: '/images/model-families/liquid-d1/catalog.webp',
		},
		alt: {
			hero: 'Smooth violet input ribbons converging into one weighted output stream with tightly packed probability traces',
			catalog: 'Asymmetric violet ribbons passing through a sparse probability field',
		},
		iconStrategy: 'none',
	},
	'meta-llama': {
		id: 'meta-llama', shaderId: 'llama', label: 'Meta Llama',
		palette: { background: '#06183F', accent: '#5AA7FF' },
		assets: { hero: '/images/model-families/meta-llama/hero.webp', catalog: '/images/model-families/meta-llama/catalog.webp' },
		alt: { hero: 'Layered open blue orbital paths with a moving point of light', catalog: 'Open blue orbit field' },
		iconStrategy: 'none',
	},
	'meta-muse-glimmer': {
		id: 'meta-muse-glimmer',
		shaderId: 'muse-glimmer',
		label: 'Meta Muse Glimmer',
		palette: { background: '#02050D', accent: '#1687FF' },
		assets: {
			hero: '/images/model-families/meta-muse-glimmer/hero.webp',
			catalog: '/images/model-families/meta-muse-glimmer/catalog.webp',
		},
		alt: {
			hero: 'Fine directed blue edges connecting luminous drifting nodes on a dark field',
			catalog: 'Directed blue agent graph with moving signals and glimmering nodes',
		},
		iconStrategy: 'none',
	},
	'openai-gpt-oss': {
		id: 'openai-gpt-oss',
		shaderId: 'gpt-oss',
		label: 'OpenAI gpt-oss',
		palette: { background: '#080909', accent: '#E7ECEA' },
		assets: {
			hero: '/images/model-families/openai-gpt-oss/hero.webp',
			catalog: '/images/model-families/openai-gpt-oss/catalog.webp',
		},
		alt: {
			hero: 'A strongly oblique monochrome plane of orderly gray square tiles viewed from a low side angle',
			catalog: 'A perspective field of gray square tiles with a restrained travelling reflection',
		},
		iconStrategy: 'none',
	},
	'mistral-ministral3': {
		id: 'mistral-ministral3',
		shaderId: 'ministral3',
		label: 'Mistral AI Ministral 3',
		palette: { background: '#12121F', accent: '#FF7A00' },
		assets: {
			hero: '/images/model-families/mistral-ministral3/hero.webp',
			catalog: '/images/model-families/mistral-ministral3/catalog.webp',
		},
		alt: {
			hero: 'Layered yellow, orange, and red stepped ribbons moving across a dark field',
			catalog: 'Pixel-stepped warm-color ribbons derived from the Mistral 3 launch visual grammar',
		},
		iconStrategy: 'none',
	},
	'minimax-m2': {
		id: 'minimax-m2', shaderId: 'minimax', label: 'MiniMax M2',
		palette: { background: '#210318', accent: '#F51B7B' },
		assets: { hero: '/images/model-families/minimax-m2/hero.webp', catalog: '/images/model-families/minimax-m2/catalog.webp' },
		alt: { hero: 'Nested magenta and coral feedback waves converging through repeated iterations', catalog: 'MiniMax recursive wave field' },
		iconStrategy: 'none',
	},
	'flux3-action': {
		id: 'flux3-action', shaderId: 'flux-action', label: 'Black Forest Labs FLUX.3 Action',
		palette: { background: '#050707', accent: '#7CF0A7' },
		assets: { hero: '/images/model-families/flux3-action/hero.webp', catalog: '/images/model-families/flux3-action/catalog.webp' },
		alt: { hero: 'A temporal corridor of observation frames crossed by a green action trajectory', catalog: 'Observation frames and action chunk timeline' },
		iconStrategy: 'none',
	},
	'nvidia-nemotron': {
		id: 'nvidia-nemotron',
		shaderId: 'nemotron',
		label: 'NVIDIA Nemotron',
		palette: {
			background: '#050706',
			accent: '#76B900',
		},
		assets: {
			hero: '/images/model-families/nvidia-nemotron/hero.webp',
			catalog: '/images/model-families/nvidia-nemotron/catalog.webp',
			icon: '/images/model-families/nvidia-nemotron/icon-official.svg',
		},
		alt: {
			hero: 'A three-dimensional cube tiled with thousands of continuously tilting micro-mirrors',
			catalog: 'A dark compute cube shimmering with green, cyan, and magenta micro-mirror reflections',
			icon: 'Official NVIDIA neural-network cube mark used with Nemotron',
		},
		iconStrategy: 'official',
		variants: {
			'3': { assets: { hero: '/images/model-families/nvidia-nemotron/hero.webp', catalog: '/images/model-families/nvidia-nemotron/catalog.webp' } },
			'3.5': { assets: { hero: '/images/model-families/nvidia-nemotron/hero.webp', catalog: '/images/model-families/nvidia-nemotron/catalog.webp' } },
		},
	},
	'nvidia-cosmos': {
		id: 'nvidia-cosmos',
		shaderId: 'cosmos',
		label: 'NVIDIA Cosmos',
		palette: {
			background: '#030706',
			accent: '#76B900',
		},
		assets: {
			hero: '/images/model-families/nvidia-cosmos/hero-3.webp',
			catalog: '/images/model-families/nvidia-cosmos/catalog-3.webp',
			icon: '/images/model-families/nvidia-cosmos/icon-official.png',
		},
		alt: {
			hero: 'An offset two-arm green galaxy with luminous filaments rotating around a gold core',
			catalog: 'An offset procedural two-arm galaxy with green and gold dust',
			icon: 'Official NVIDIA Cosmos logo with a spiral galaxy inside a cube',
		},
		iconStrategy: 'official',
		variants: {
			'2': { assets: { hero: '/images/model-families/nvidia-cosmos/hero-2.webp', catalog: '/images/model-families/nvidia-cosmos/catalog-2.webp' } },
			'3': { assets: { hero: '/images/model-families/nvidia-cosmos/hero-3.webp', catalog: '/images/model-families/nvidia-cosmos/catalog-3.webp' } },
		},
	},
};

export function modelFamilyVisual(id?: string, variant?: string): ModelFamilyVisual | undefined {
	const visual = id ? modelFamilyVisuals[id] : undefined;
	if (!visual || !variant) return visual;
	const variantVisual = visual.variants?.[variant];
	return variantVisual ? { ...visual, assets: { ...visual.assets, ...variantVisual.assets } } : visual;
}
