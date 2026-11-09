import type { APIRoute } from 'astro';
import { readFile, rename, writeFile } from 'node:fs/promises';

export const prerender = false;

const defaultsUrl = new URL('../data/modelShaderDefaults.json', import.meta.url);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store',
	},
});

export const POST: APIRoute = async ({ request }) => {
	const requestUrl = new URL(request.url);
	const origin = request.headers.get('origin');
	if (origin && origin !== requestUrl.origin) return json({ error: 'Cross-origin writes are not allowed.' }, 403);
	if (!request.headers.get('content-type')?.includes('application/json')) {
		return json({ error: 'Expected application/json.' }, 415);
	}

	let payload: { shaderId?: unknown; variant?: unknown; values?: unknown };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON request.' }, 400);
	}

	if (typeof payload.shaderId !== 'string' || !/^[a-z0-9-]+$/.test(payload.shaderId)) {
		return json({ error: 'Invalid shaderId.' }, 400);
	}
	if (payload.variant !== null && payload.variant !== undefined && typeof payload.variant !== 'string') {
		return json({ error: 'Invalid variant.' }, 400);
	}
	if (!payload.values || typeof payload.values !== 'object' || Array.isArray(payload.values)) {
		return json({ error: 'Invalid values object.' }, 400);
	}
	const values = payload.values as Record<string, unknown>;

	const document = JSON.parse(await readFile(defaultsUrl, 'utf8'));
	const entry = document[payload.shaderId];
	if (!entry) return json({ error: `Unknown shader: ${payload.shaderId}` }, 404);
	const variant = payload.variant || null;
	const target = variant ? entry.variants?.[variant] : entry.defaults;
	if (!target) return json({ error: `Unknown shader variant: ${payload.shaderId}/${variant ?? 'default'}` }, 404);

	const expectedKeys = Object.keys(target).sort();
	const receivedKeys = Object.keys(values).sort();
	if (JSON.stringify(expectedKeys) !== JSON.stringify(receivedKeys)) {
		return json({ error: `Expected exactly these parameters: ${expectedKeys.join(', ')}` }, 400);
	}
	for (const [key, value] of Object.entries(values)) {
		if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1000) {
			return json({ error: `Invalid numeric value for ${key}.` }, 400);
		}
	}

	const normalized = Object.fromEntries(expectedKeys.map((key) => [key, Number(values[key])]));
	if (variant) entry.variants[variant] = normalized;
	else entry.defaults = normalized;

	const serialized = `${JSON.stringify(document, null, 2)}\n`;
	const temporaryUrl = new URL(`./modelShaderDefaults.json.tmp-${process.pid}-${Date.now()}`, defaultsUrl);
	await writeFile(temporaryUrl, serialized, 'utf8');
	await rename(temporaryUrl, defaultsUrl);

	return json({ shaderId: payload.shaderId, variant, values: normalized });
};
