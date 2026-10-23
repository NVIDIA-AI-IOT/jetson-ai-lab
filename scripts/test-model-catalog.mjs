import { chromium } from 'playwright';

const baseUrl = process.env.MODELS_TEST_URL || 'http://127.0.0.1:4321/models/';

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });

try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	await page.goto(baseUrl, { waitUntil: 'networkidle' });

	const totalModels = await page.locator('.model-card').count();
	const initialCount = await page.locator('#models-result-count').textContent();
	assert(initialCount?.trim() === `${totalModels} models`, `Expected ${totalModels} models, received "${initialCount?.trim()}"`);

	assert((await page.locator('.model-card [data-model-link]').count()) === totalModels, 'Every model card name should link to its model page');
	assert((await page.locator('.model-table-row [data-model-link]').count()) === totalModels, 'Every table model name should link to its model page');
	assert((await page.getByRole('link', { name: 'Details', exact: true }).count()) === 0, 'Legacy Details links are still present');
	const quickRunButtons = page.locator('[data-run-open]');
	assert((await quickRunButtons.count()) > 0, 'Quick run controls are missing');
	assert(
		(await quickRunButtons.first().getAttribute('title')) === 'Quick run',
		'Run modal trigger should expose a Quick run tooltip'
	);
	assert(
		(await quickRunButtons.first().getAttribute('aria-label'))?.startsWith('Quick run ') === true,
		'Icon-only Quick run control should have an accessible label'
	);

	assert((await page.getByText('Supported Models', { exact: true }).count()) === 0, 'Legacy Supported Models hero is still present');
	const allModelsHeading = await page.getByRole('heading', { name: 'All Models', exact: true }).boundingBox();
	assert(allModelsHeading && allModelsHeading.y < 700, 'All Models heading should remain visible below the featured section');
	const sidebarSections = await page.locator('#models-filter-panel h4').allTextContents();
	assert(sidebarSections[0]?.trim() === 'Jetson device', 'Jetson device should be the first filter section');
	assert(sidebarSections[1]?.trim() === 'Model type', 'Simple model type should follow Jetson device');
	assert(!sidebarSections.some((label) => label.trim() === 'Release'), 'Release should not remain in the filter sidebar');
	const filterPanelWidth = (await page.locator('#models-filter-panel').boundingBox())?.width || 0;
	assert(filterPanelWidth >= 300, `Desktop filter panel should leave room for icon cards, received ${filterPanelWidth}px`);
	const deviceIconToggle = page.locator('[data-device-icon-toggle]');
	assert((await deviceIconToggle.getAttribute('aria-pressed')) === 'false', 'Compact Jetson device filters should be the default');
	assert(await page.locator('[data-device-compact-filters]').isVisible(), 'Compact Jetson device filters should be visible by default');
	assert(!(await page.locator('[data-device-icon-filters]').isVisible()), 'Jetson device icon cards should be hidden by default');
	assert(
		(await page.locator('[data-device-compact-filters] [data-catalog-module-filter]').count()) === 5
			&& (await page.locator('[data-device-icon-filters] [data-catalog-module-filter] + span img').count()) === 5,
		'Jetson devices should provide five compact filters and five image-backed alternatives'
	);
	await deviceIconToggle.click();
	assert((await deviceIconToggle.getAttribute('aria-pressed')) === 'true', 'Icon toggle should expose its active state');
	assert(await page.locator('[data-device-icon-filters]').isVisible(), 'Icon toggle should reveal the image-backed device cards');
	await deviceIconToggle.click();
	assert(await page.locator('[data-device-compact-filters]').isVisible(), 'Turning Icon off should restore compact device filters');
	const firstFamilyTopBeforeFilter = (await page.locator('.model-family-group').first().boundingBox())?.y;
	const t4000Filter = page.locator('[data-device-compact-filters] [data-catalog-module-filter][value="thor_t4000"]');
	await t4000Filter.evaluate((input) => input.click());
	const t4000Chip = page.locator('[data-remove-catalog-filter="module"][data-filter-value="thor_t4000"]');
	assert((await t4000Chip.textContent())?.trim() === 'T4000 ×', 'Active device chip should omit the result count');
	const resultCountBox = await page.locator('#models-result-count').boundingBox();
	const t4000ChipBox = await t4000Chip.boundingBox();
	assert(
		await page.locator('#models-result-count').evaluate((element) => !document.querySelector('#models-directory-toolbar')?.contains(element)),
		'Result count and active filters should use the dedicated line below the view toolbar'
	);
	assert(
		resultCountBox && t4000ChipBox
			&& t4000ChipBox.x > resultCountBox.x + resultCountBox.width
			&& Math.abs((t4000ChipBox.y + t4000ChipBox.height / 2) - (resultCountBox.y + resultCountBox.height / 2)) <= 2,
		'Active filter chips should sit inline to the right of the result count'
	);
	assert(await page.locator('#featured-models-section').isVisible(), 'Directory filters should not hide the independent Featured Models section');
	const firstFamilyTopAfterFilter = (await page.locator('.model-family-group:visible').first().boundingBox())?.y;
	assert(
		firstFamilyTopBeforeFilter !== undefined
			&& firstFamilyTopAfterFilter !== undefined
			&& Math.abs(firstFamilyTopAfterFilter - firstFamilyTopBeforeFilter) <= 1,
		'Active filter chips should not move the result grid vertically'
	);
	await t4000Chip.click();

	const newModels = await page.locator('.model-card[data-status="new"]').count();
	const newOnlyToggle = page.locator('[data-catalog-new-toggle]');
	assert((await newOnlyToggle.count()) === 1, 'New only toggle is missing');
	assert(
		await newOnlyToggle.evaluate((button) => button.parentElement?.querySelector('#models-search-cards-bar') !== null),
		'New only toggle should sit beside the catalog search'
	);
	const newOnlySwitchTrack = newOnlyToggle.locator('[aria-hidden="true"]');
	assert((await newOnlySwitchTrack.count()) === 1, 'New only control should include a switch track');
	const switchTrackBefore = await newOnlySwitchTrack.evaluate((element) => getComputedStyle(element).backgroundColor);
	await newOnlyToggle.click();
	await page.waitForTimeout(250);
	const switchTrackAfter = await newOnlySwitchTrack.evaluate((element) => getComputedStyle(element).backgroundColor);
	assert(switchTrackAfter === 'rgb(118, 185, 0)', `Expected NVIDIA green switch track, received ${switchTrackAfter}`);
	assert(switchTrackBefore !== switchTrackAfter, 'New only switch track should visibly change when enabled');
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} models`,
		newModels
	);
	assert(new URL(page.url()).searchParams.get('new') === '1', 'New only selection was not persisted in the URL');
	assert((await newOnlyToggle.getAttribute('aria-pressed')) === 'true', 'New only toggle should expose its pressed state');
	await page.locator('[data-remove-catalog-filter="new"]').click();
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} models`,
		totalModels
	);
	const featuredTrack = page.locator('#featured-models-track');
	assert((await featuredTrack.count()) === 1, 'Featured models carousel track is missing');
	const featuredSectionBox = await page.locator('#featured-models-section').boundingBox();
	const featuredHeadingBox = await page.getByRole('heading', { name: 'Featured Models', exact: true }).boundingBox();
	assert(
		featuredSectionBox && featuredHeadingBox
			&& Math.abs(
				(featuredHeadingBox.x + featuredHeadingBox.width / 2)
				- (featuredSectionBox.x + featuredSectionBox.width / 2)
			) <= 1,
		'Featured Models heading should be centered in the section'
	);
	const featuredCards = page.locator('#featured-models-track .model-catalog-card');
	assert(
		(await featuredCards.locator('article > div > p').count()) === (await featuredCards.count()),
		'Every featured model card should retain its description'
	);
	const canScrollFeatured = await featuredTrack.evaluate((element) => element.scrollWidth > element.clientWidth);
	const featuredNext = page.locator('#featured-models-next');
	if (canScrollFeatured) {
		await featuredNext.click();
		await page.waitForFunction(() => (document.querySelector('#featured-models-track')?.scrollLeft || 0) > 0);
	} else {
		assert(await featuredNext.isDisabled(), 'Next control should be disabled when all featured models fit');
		assert(await page.locator('#featured-models-previous').isDisabled(), 'Previous control should be disabled when all featured models fit');
	}

	const cosmosFamily = page.locator('.model-family-group[data-family="NVIDIA Cosmos"]');
	assert((await cosmosFamily.count()) === 1, 'Expected a single NVIDIA Cosmos family group');
	assert((await cosmosFamily.locator('.model-card').count()) === 5, 'NVIDIA Cosmos family should contain all five Cosmos models');
	assert((await page.locator('#models-view-cards').getAttribute('aria-pressed')) === 'true', 'Traditional Cards should be the default view');
	assert(
		(await cosmosFamily.evaluate((element) => getComputedStyle(element).display)) === 'flex',
		'Traditional Cards should preserve the legacy family-panel layout'
	);
	const legacyFamilyColumns = await page.locator('#models-directory-cards').evaluate((element) =>
		getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
	);
	assert(legacyFamilyColumns === 4, `Expected four legacy family columns on desktop, received ${legacyFamilyColumns}`);
	const cardColumnsMenuButton = page.locator('#models-card-columns-menu-button');
	const cardColumnsMenu = page.locator('#models-card-columns-menu');
	assert(await cardColumnsMenuButton.isVisible(), 'Cards split button should expose its column options');
	assert(!(await cardColumnsMenu.isVisible()), 'Card column menu should be closed initially');
	await cardColumnsMenuButton.click();
	assert(await cardColumnsMenu.isVisible(), 'Card column menu did not open');
	await page.locator('.models-card-columns-toggle[data-card-columns="3"]').click();
	assert(!(await cardColumnsMenu.isVisible()), 'Card column menu should close after choosing a density');
	const threeFamilyColumns = await page.locator('#models-directory-cards').evaluate((element) =>
		getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
	);
	assert(threeFamilyColumns === 3, `Expected three family columns after density change, received ${threeFamilyColumns}`);
	assert(
		await page.evaluate(() => localStorage.getItem('jetson-ai-lab-models-card-columns')) === '3',
		'Card column preference was not stored'
	);
	await page.reload({ waitUntil: 'networkidle' });
	assert(
		(await page.locator('#models-directory-cards').getAttribute('data-card-columns')) === '3',
		'Stored card column preference was not restored'
	);
	await cardColumnsMenuButton.click();
	assert(
		(await page.locator('.models-card-columns-toggle[data-card-columns="3"]').getAttribute('aria-checked')) === 'true',
		'Stored card column preference was not reflected in the menu'
	);
	await page.locator('.models-card-columns-toggle[data-card-columns="4"]').click();
	await cardColumnsMenuButton.click();
	await page.locator('.models-card-fit-toggle[data-card-fit="content"]').click();
	assert(
		(await page.locator('#models-directory-cards').getAttribute('data-card-fit')) === 'content',
		'Content-fit card layout was not applied'
	);
	assert(
		await page.evaluate(() => localStorage.getItem('jetson-ai-lab-models-card-fit')) === 'content',
		'Content-fit preference was not stored'
	);
	assert(
		(await page.locator('.model-family-group[style*="grid-row-end: span"]').count()) > 0,
		'Content-fit layout did not measure family cards'
	);
	await cardColumnsMenuButton.click();
	await page.locator('.models-card-fit-toggle[data-card-fit="aligned"]').click();

	const originalFirstFamily = await page.locator('.model-family-group').first().getAttribute('data-family');
	const originalSecondFamily = await page.locator('.model-family-group').nth(1).getAttribute('data-family');
	const firstFamilyHandle = page.locator('.model-family-group').first().locator('[data-family-drag-handle]');
	assert(await firstFamilyHandle.isVisible(), 'A subtle family rearrange handle should always be available in Cards view');
	assert(!(await page.locator('#models-card-rearrange-control').isVisible()), 'Done control should stay hidden until rearrangement begins');
	await firstFamilyHandle.focus();
	await firstFamilyHandle.press('ArrowRight');
	assert((await page.locator('#models-card-rearrange').getAttribute('aria-pressed')) === 'true', 'Using a card handle should activate rearrange mode');
	assert(await page.locator('#models-card-rearrange-control').isVisible(), 'Done control should appear while rearranging');
	assert(
		(await page.locator('.model-family-group').first().getAttribute('data-family')) === originalSecondFamily,
		'Keyboard rearrangement did not move the first family'
	);
	assert(
		await page.evaluate(() => localStorage.getItem('jetson-ai-lab-model-family-order-v1')) !== null,
		'Custom family order was not stored'
	);
	await page.reload({ waitUntil: 'networkidle' });
	assert(
		(await page.locator('.model-family-group').first().getAttribute('data-family')) === originalSecondFamily,
		'Stored family order was not restored'
	);
	await page.locator('.model-family-group').first().locator('[data-family-drag-handle]').click();
	await page.locator('#models-card-order-reset').click();
	assert(
		(await page.locator('.model-family-group').first().getAttribute('data-family')) === originalFirstFamily,
		'Reset did not restore the default family order'
	);
	const pointerHandle = page.locator('.model-family-group').first().locator('[data-family-drag-handle]');
	const pointerTarget = page.locator('.model-family-group').nth(1);
	await pointerHandle.scrollIntoViewIfNeeded();
	const handleBox = await pointerHandle.boundingBox();
	const targetBox = await pointerTarget.boundingBox();
	assert(handleBox && targetBox, 'Pointer rearrangement fixtures are not visible');
	await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
	await page.mouse.down();
	assert((await page.locator('.model-family-drag-ghost').count()) === 1, 'Pointer drag should create a following card ghost');
	assert(await page.locator('html').evaluate((node) => node.classList.contains('model-family-drag-active')), 'Pointer drag should retain the page-wide grabbing cursor');
	await page.mouse.move(targetBox.x + targetBox.width * 0.75, Math.min(970, targetBox.y + 100));
	assert((await page.locator('.model-family-drop-target').count()) === 1, 'Pointer drag should highlight the insertion target');
	await page.mouse.up();
	await page.waitForFunction(() => document.querySelector('.model-family-drag-ghost') === null);
	assert(!(await page.locator('html').evaluate((node) => node.classList.contains('model-family-drag-active'))), 'Grabbing cursor should clear when pointer drag ends');
	assert(
		(await page.locator('.model-family-group').first().getAttribute('data-family')) === originalSecondFamily,
		'Pointer rearrangement did not update the family order'
	);
	await page.locator('#models-card-order-reset').click();

	await page.locator('#models-view-compact').click();
	assert((await page.locator('#models-view-compact').getAttribute('aria-pressed')) === 'true', 'Compact view did not become active');
	assert(await cardColumnsMenuButton.isVisible(), 'Cards column options should remain discoverable in the split button');
	assert(!(await cardColumnsMenu.isVisible()), 'Card column menu should stay closed outside Cards view');
	await cardColumnsMenuButton.click();
	assert((await page.locator('#models-view-cards').getAttribute('aria-pressed')) === 'true', 'Opening card options should switch to Cards view');
	assert(await cardColumnsMenu.isVisible(), 'Card column menu should open after switching to Cards view');
	await page.keyboard.press('Escape');
	assert(!(await cardColumnsMenu.isVisible()), 'Escape should close the card column menu');
	await page.locator('#models-view-compact').click();
	assert(!(await page.locator('#models-card-rearrange-control').isVisible()), 'Rearrange control should hide outside Cards view');
	assert(
		(await cosmosFamily.evaluate((element) => getComputedStyle(element).display)) === 'block',
		'Compact view should use the block-based family layout'
	);
	const cosmosModelGrid = cosmosFamily.locator('[data-family-model-grid]');
	const cosmosGridColumns = await cosmosModelGrid.evaluate((element) =>
		getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
	);
	assert(cosmosGridColumns === 2, `Expected a two-column desktop model grid, received ${cosmosGridColumns} columns`);
	assert(
		(await page.locator('.model-family-group[data-family="NVIDIA Cosmos Reason"]').count()) === 0,
		'Legacy NVIDIA Cosmos Reason family group is still present'
	);

	assert((await page.getByRole('heading', { name: 'Task', exact: true }).count()) === 0, 'Legacy Task filter is still present');
	assert((await page.locator('[data-catalog-simple-filters]:visible').count()) === 1, 'Simple type filters should be shown by default');
	assert((await page.locator('[data-catalog-advanced-filters]:visible').count()) === 0, 'Advanced filters should be hidden by default');
	assert((await page.locator('[data-catalog-type-filter="all"]').getAttribute('aria-pressed')) === 'true', 'All models should be the default type');

	const vlaTypeButton = page.locator('[data-catalog-type-filter="vla"]');
	const vlaModels = await page.locator('.model-card[data-catalog-type="vla"]').count();
	assert(vlaModels === 2, `Expected two VLA models, received ${vlaModels}`);
	await vlaTypeButton.click();
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} models`,
		vlaModels
	);
	assert(new URL(page.url()).searchParams.get('type') === 'vla', 'Simple model type was not persisted in the URL');
	assert((await page.locator('.model-card[data-search*="cosmos3 edge"]:visible').count()) === 1, 'VLA type should retain Cosmos3 Edge');

	await page.locator('[data-catalog-filter-mode="advanced"]').click();
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} models`,
		totalModels
	);
	assert((await page.locator('[data-catalog-simple-filters]:visible').count()) === 0, 'Simple filters should hide in Advanced mode');
	assert((await page.locator('[data-catalog-advanced-filters]:visible').count()) === 1, 'Advanced capability filters should be visible');
	assert(new URL(page.url()).searchParams.get('mode') === 'advanced', 'Advanced mode was not persisted in the URL');
	assert(new URL(page.url()).searchParams.has('type') === false, 'Switching to Advanced should clear the Simple type');
	assert((await page.getByRole('heading', { name: 'Capabilities', exact: true }).count()) === 1, 'Capabilities filter is missing');
	assert((await page.getByRole('heading', { name: 'Input modalities', exact: true }).count()) === 1, 'Input modality group is missing');
	assert((await page.getByRole('heading', { name: 'Output capabilities', exact: true }).count()) === 1, 'Output capability group is missing');
	assert(
		(await page.locator('[data-catalog-input-filter][value="image"]').count()) === 1,
		'Image / vision input capability is missing'
	);
	assert(
		(await page.locator('[data-catalog-output-filter][value="image-generation"]').count()) === 1
			&& (await page.locator('[data-catalog-output-filter][value="video-generation"]').count()) === 1,
		'Image and video output capabilities are missing'
	);
	assert(
		(await page.locator('[data-catalog-input-filter][value="action"]').count()) === 1,
		'Unified robot-state/action input capability is missing'
	);
	assert(
		(await page.locator('[data-catalog-output-filter][value="classification"]').count()) === 1,
		'Classification output capability is missing'
	);

	const d1 = page.locator('.model-card[data-search*="d1-3b"]');
	assert((await d1.getAttribute('data-catalog-inputs')) === 'text,image', 'd1-3B input modalities are incorrect');
	assert((await d1.getAttribute('data-catalog-outputs')) === 'classification', 'd1-3B should expose decision output');
	const qwen36 = page.locator('.model-card[data-search*="qwen3.6 27b"]');
	assert((await qwen36.getAttribute('data-catalog-inputs')) === 'text,image,video', 'Qwen3.6 should expose image and video input');
	const cosmosNano = page.locator('.model-card[data-search*="cosmos3 nano"]');
	assert((await cosmosNano.getAttribute('data-catalog-inputs')) === 'text,image,video', 'Cosmos3 Nano reasoner inputs are incorrect');
	assert((await cosmosNano.getAttribute('data-catalog-outputs')) === 'text-generation', 'Cosmos3 Nano page should describe the reasoner deployment');
	for (const modelName of ['gemma 4 e2b', 'gemma 4 e4b', 'gemma 4 12b']) {
		const gemmaAudioModel = page.locator(`.model-card[data-search*="${modelName}"]`);
		assert((await gemmaAudioModel.getAttribute('data-catalog-inputs'))?.includes('audio'), `${modelName} should accept audio`);
		assert(
			(await gemmaAudioModel.getAttribute('data-catalog-outputs'))?.includes('speech-recognition'),
			`${modelName} should expose speech recognition`
		);
	}

	const fluxAction = page.locator('.model-card[data-search*="flux 3 action"]');
	assert((await fluxAction.getAttribute('data-catalog-inputs'))?.includes('action'), 'FLUX 3 Action should accept robot state/action input');
	assert((await fluxAction.getAttribute('data-catalog-outputs'))?.includes('action-generation'), 'FLUX 3 Action should generate actions');
	assert((await fluxAction.getAttribute('data-catalog-outputs'))?.includes('video-generation'), 'FLUX 3 Action should generate video');
	assert(
		(await fluxAction.getAttribute('data-catalog-type')) === 'vla',
		'FLUX 3 Action should retain the concise VLA classification even when it is not featured'
	);

	const actionFilter = page.locator('[data-catalog-output-filter][value="action-generation"]');
	const actionModels = await page.locator('.model-card[data-catalog-outputs*="action-generation"]').count();
	assert(actionModels > 0, 'The catalog does not contain a VLA fixture for the action output check');
	await actionFilter.check();
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} ${expected === 1 ? 'model' : 'models'}`,
		actionModels
	);
	assert(
		new URL(page.url()).searchParams.getAll('output').includes('action-generation'),
		'Output capability selection was not persisted in the URL'
	);

	const visibleCardNames = await page
		.locator('.model-card:visible [data-model-link]')
		.allTextContents();
	assert(visibleCardNames.some((name) => name.includes('Cosmos3 Edge')), 'VLA filter did not retain Cosmos3 Edge');

	await page.locator('#models-view-table').click();
	assert(await page.locator('#models-directory-table').isVisible(), 'Table view should be visible after selecting Table');
	assert(!(await page.locator('#models-directory-cards').isVisible()), 'Cards directory should be hidden in Table view');
	assert((await page.locator('.model-table-row:visible').count()) === actionModels, 'Table view did not share the active output filter');
	assert((await page.getByRole('button', { name: 'Sort by input and output', exact: true }).count()) === 1, 'Table should expose the compact input/output column');
	const visibleArrowCenters = await page.locator('.model-table-row:visible [data-modality-flow-arrow]').evaluateAll((arrows) =>
		arrows.map((arrow) => {
			const box = arrow.getBoundingClientRect();
			return Math.round((box.left + box.width / 2) * 10) / 10;
		})
	);
	assert(new Set(visibleArrowCenters).size === 1, 'Input/output arrows should share one centered table axis');
	const fluxTableRow = page.locator('.model-table-row[data-search*="flux 3 action"]');
	assert((await fluxTableRow.locator('[title="Input: Robot state / action"]').count()) === 1, 'FLUX table row should show its embodied input icon');
	assert((await fluxTableRow.locator('[title="Output: Action trajectory"]').count()) === 1, 'FLUX table row should show its action output icon');
	assert((await fluxTableRow.locator('[title="Output: Video"]').count()) === 1, 'FLUX table row should show its video output icon');

	await page.locator('[data-remove-catalog-filter="output"]').click();
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} models`,
		totalModels
	);

	const visionFilter = page.locator('[data-catalog-input-filter][value="image"]');
	const visionModels = await page.locator('.model-card[data-catalog-inputs*="image"]').count();
	assert(visionModels > 0 && visionModels < totalModels, 'Image input should identify a subset of models');
	await visionFilter.check();
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} models`,
		visionModels
	);
	assert(
		new URL(page.url()).searchParams.getAll('input').includes('image'),
		'Input capability selection was not persisted in the URL'
	);
	await page.locator('[data-remove-catalog-filter="input"]').click();

	const qwen36Models = await page.locator('.model-table-row[data-search*="qwen3.6"]').count();
	const search = page.locator('#model-search-table');
	await search.fill('qwen3.6');
	await page.waitForFunction(
		(expected) => document.querySelector('#models-result-count')?.textContent?.trim() === `${expected} ${expected === 1 ? 'model' : 'models'}`,
		qwen36Models
	);
	assert(new URL(page.url()).searchParams.get('q') === 'qwen3.6', 'Search value was not persisted in the URL');

	await page.setViewportSize({ width: 390, height: 844 });
	await page.evaluate(() => localStorage.setItem('jetson-ai-lab-models-directory-view', 'compact'));
	await page.reload({ waitUntil: 'networkidle' });
	const mobileGridColumns = await page.locator('.model-family-group:visible [data-family-model-grid]').first().evaluate((element) =>
		getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
	);
	assert(mobileGridColumns === 1, `Expected a one-column mobile model grid, received ${mobileGridColumns} columns`);
	const mobileToggle = page.locator('#models-mobile-filter-toggle');
	assert(await mobileToggle.isVisible(), 'Mobile filter toggle is not visible');
	await mobileToggle.click();
	assert(await page.locator('#models-filter-panel').isVisible(), 'Mobile filter drawer did not open');

	const detailPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	await detailPage.goto(new URL('/models/cosmos3-edge/', baseUrl).toString(), { waitUntil: 'networkidle' });
	assert((await detailPage.getByText('Modalities', { exact: true }).count()) === 0, 'Legacy Modalities row is still present');
	const inputsRowText = await detailPage.getByText('Inputs', { exact: true }).locator('..').textContent();
	const outputsRowText = await detailPage.getByText('Outputs', { exact: true }).locator('..').textContent();
	assert(inputsRowText?.includes('Robot state / action'), 'Cosmos3 Edge input row should describe embodied state/action conditioning');
	assert(outputsRowText?.includes('Action trajectory'), 'Cosmos3 Edge output row should describe generated action trajectories');
	await detailPage.close();

	console.log('Models catalog UI checks passed');
} finally {
	await browser.close();
}
