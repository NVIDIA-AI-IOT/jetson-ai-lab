import { isModelNew, MODEL_NEW_WINDOW_DAYS } from '../src/lib/modelFreshness.ts';

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

assert(isModelNew({ is_new: true }, new Date('2030-01-01T12:00:00Z')), 'Legacy true should remain New');
assert(!isModelNew({ is_new: false }, new Date('2030-01-01T12:00:00Z')), 'Legacy false should remain stable');
assert(
	isModelNew({ catalog_added_at: '2026-10-01' }, new Date('2026-10-21T12:00:00Z')),
	'Recent catalog entries should be New'
);
assert(
	!isModelNew({ catalog_added_at: '2026-01-01', is_new: true }, new Date('2026-10-21T12:00:00Z')),
	'Date metadata should override the legacy flag'
);
assert(
	!isModelNew({ catalog_added_at: '2026-10-22' }, new Date('2026-10-21T12:00:00Z')),
	'Future catalog entries should not be New early'
);
assert(
	isModelNew({ catalog_added_at: '2026-01-01', new_until: '2026-10-21' }, new Date('2026-10-21T23:59:59Z')),
	'new_until should include the whole specified day'
);
assert(
	!isModelNew({ catalog_added_at: '2026-01-01', new_until: '2026-10-21' }, new Date('2026-10-22T00:00:00Z')),
	'new_until should expire at the next UTC day'
);

const addedAt = new Date('2026-01-01T00:00:00Z');
const expiresAt = new Date(addedAt.getTime() + MODEL_NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
assert(!isModelNew({ catalog_added_at: '2026-01-01' }, expiresAt), 'The standard New window should expire after 60 days');

console.log('Model freshness checks passed.');
