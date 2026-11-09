function unquote(value) {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

function parseInlineList(value) {
	const trimmed = value.trim();
	if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];
	return trimmed
		.slice(1, -1)
		.split(',')
		.map(unquote)
		.filter(Boolean);
}

export function parseBenchmarkReferences(source) {
	const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)?.[1] ?? '';
	const lines = frontmatter.split(/\r?\n/);
	let benchmarkKey;
	const benchmarkSeries = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const keyMatch = line.match(/^benchmark_key:\s*(.+?)\s*$/);
		if (keyMatch) {
			benchmarkKey = unquote(keyMatch[1]);
			continue;
		}

		const seriesMatch = line.match(/^benchmark_series:\s*(.*?)\s*$/);
		if (!seriesMatch) continue;
		if (seriesMatch[1]) {
			benchmarkSeries.push(...parseInlineList(seriesMatch[1]));
			continue;
		}

		for (let itemIndex = index + 1; itemIndex < lines.length; itemIndex += 1) {
			const itemLine = lines[itemIndex];
			if (/^\S/.test(itemLine)) break;
			const itemMatch = itemLine.match(/^\s+-\s+(.+?)\s*$/);
			if (itemMatch) benchmarkSeries.push(unquote(itemMatch[1]));
		}
	}

	return { benchmarkKey, benchmarkSeries };
}

export function validateBenchmarkReferences(modelFiles, benchmarkData) {
	const errors = [];
	const productIds = new Set((benchmarkData.products ?? []).map((product) => product.id));
	const benchmarkNames = new Set();

	for (const benchmark of benchmarkData.models ?? []) {
		if (benchmarkNames.has(benchmark.name)) {
			errors.push(`benchmarks.json: duplicate benchmark model name "${benchmark.name}"`);
		}
		benchmarkNames.add(benchmark.name);

		for (const [engineName, engine] of Object.entries(benchmark.engines ?? {})) {
			for (const [quantName, quant] of Object.entries(engine ?? {})) {
				const location = `${benchmark.name} / ${engineName} / ${quantName}`;
				for (const field of ['concurrency1', 'concurrency8']) {
					for (const productId of Object.keys(quant?.[field] ?? {})) {
						if (!productIds.has(productId)) {
							errors.push(
								`benchmarks.json: ${location} ${field} uses unknown product id "${productId}"`,
							);
						}
					}
				}
				for (const field of ['oom', 'dnr']) {
					for (const productId of quant?.[field] ?? []) {
						if (!productIds.has(productId)) {
							errors.push(
								`benchmarks.json: ${location} ${field} uses unknown product id "${productId}"`,
							);
						}
					}
				}
			}
		}
	}

	for (const { file, source } of modelFiles) {
		const { benchmarkKey, benchmarkSeries } = parseBenchmarkReferences(source);
		if (benchmarkKey && !benchmarkNames.has(benchmarkKey)) {
			errors.push(`${file}: benchmark_key "${benchmarkKey}" does not resolve in benchmarks.json`);
		}
		for (const seriesKey of benchmarkSeries) {
			if (!benchmarkNames.has(seriesKey)) {
				errors.push(
					`${file}: benchmark_series key "${seriesKey}" does not resolve in benchmarks.json`,
				);
			}
		}
	}

	return errors;
}
