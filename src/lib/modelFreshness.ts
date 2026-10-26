export const MODEL_NEW_WINDOW_DAYS = 60;

export interface ModelFreshnessData {
	catalog_added_at?: string;
	new_until?: string;
	is_new?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: string): number {
	return Date.parse(`${date}T00:00:00Z`);
}

/**
 * Date metadata takes precedence over the legacy manual flag. `new_until` is
 * inclusive; otherwise a catalog entry is New for 60 days from its add date.
 */
export function isModelNew(data: ModelFreshnessData, now = new Date()): boolean {
	if (!data.catalog_added_at) return data.is_new === true;

	const addedAt = utcDay(data.catalog_added_at);
	const nowMs = now.getTime();
	if (!Number.isFinite(addedAt) || nowMs < addedAt) return false;

	if (data.new_until) {
		const newUntil = utcDay(data.new_until);
		return Number.isFinite(newUntil) && nowMs < newUntil + DAY_MS;
	}

	return nowMs < addedAt + MODEL_NEW_WINDOW_DAYS * DAY_MS;
}
