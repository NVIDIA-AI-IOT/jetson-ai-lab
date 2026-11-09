import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { MODEL_SHADER_DEFAULTS } from '../src/data/modelShaderDefaults.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'artwork/model-family-visuals/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const requiredRationale = ['officialBasis', 'modelConcept', 'visualTranslation', 'nonClaims', 'generator'];
const errors = [];
const runtimeDefaultsPath = 'src/data/modelShaderDefaults.json';
const redundantGenerationAliases = new Set([
  'public/images/model-families/qwen/hero.webp',
  'public/images/model-families/qwen/catalog.webp',
  'public/images/model-families/gemma/hero.webp',
  'public/images/model-families/gemma/catalog.webp',
]);
// Keep the shipping identity layer explicit. New third-party marks require a
// redistribution review and an intentional allowlist change rather than merely
// adding a file and calling it "official" in the manifest.
const approvedIdentityAssets = new Set([
  'public/images/model-families/nvidia-nemotron/icon-official.svg',
  'public/images/model-families/nvidia-cosmos/icon-official.png',
]);

for (const family of manifest.families ?? []) {
  const prefix = family.id || '<missing id>';
  for (const key of requiredRationale) {
    if (typeof family.designRationale?.[key] !== 'string' || !family.designRationale[key].trim()) errors.push(`${prefix}: missing designRationale.${key}`);
  }
  if (!family.provenance?.officialReferences?.length) errors.push(`${prefix}: officialReferences must contain a first-party source`);
  if (!family.provenance?.reviewStatus) errors.push(`${prefix}: missing reviewStatus`);
  if (!family.procedural?.renderers?.heroAndCatalog?.staticFallback) errors.push(`${prefix}: heroAndCatalog must declare staticFallback`);
  if (family.icon?.strategy === 'generated' || family.icon?.strategy === 'generated-companion') errors.push(`${prefix}: generated logo-like companion assets are not allowed`);
  const generator = family.designRationale?.generator;
  if (generator) {
    try { await access(path.join(root, generator)); } catch { errors.push(`${prefix}: generator does not exist: ${generator}`); }
  }
  for (const [name, asset] of Object.entries(family.assets ?? {})) {
    if (typeof asset === 'string' && /^https?:\/\//.test(asset)) errors.push(`${prefix}: hotlinked runtime asset is not allowed: ${name}`);
    if (typeof asset !== 'string' || !asset.startsWith('public/')) continue;
    if (name === 'icon' && family.icon?.strategy === 'official' && !approvedIdentityAssets.has(asset)) {
      errors.push(`${prefix}: identity asset is not in the redistribution-reviewed allowlist: ${asset}`);
    }
    try { await access(path.join(root, asset)); } catch { errors.push(`${prefix}: missing ${name} asset: ${asset}`); }
  }
}

if (manifest.runtimeDefaults !== runtimeDefaultsPath) {
  errors.push(`manifest runtimeDefaults must point to ${runtimeDefaultsPath}`);
}

for (const [shaderId, entry] of Object.entries(MODEL_SHADER_DEFAULTS)) {
  const hasDefaults = entry && typeof entry === 'object' && 'defaults' in entry;
  const hasVariants = entry && typeof entry === 'object' && 'variants' in entry;
  if (hasDefaults === hasVariants) {
    errors.push(`${shaderId}: must declare exactly one of defaults or variants`);
    continue;
  }
  const sets = hasVariants ? entry.variants : { defaults: entry.defaults };
  if (hasVariants && (!entry.defaultVariant || !(entry.defaultVariant in entry.variants))) {
    errors.push(`${shaderId}: defaultVariant must name a declared variant`);
  }
  for (const [variant, values] of Object.entries(sets)) {
    if (!values || typeof values !== 'object' || !Object.keys(values).length) {
      errors.push(`${shaderId}/${variant}: defaults must be a non-empty object`);
      continue;
    }
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`${shaderId}/${variant}: ${key} must be a finite number`);
      }
    }
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

const assetRoot = path.join(root, 'public/images/model-families');
for (const absolute of await listFiles(assetRoot)) {
  const asset = path.relative(root, absolute).split(path.sep).join('/');
  if (redundantGenerationAliases.has(asset)) {
    errors.push(`redundant generic fallback duplicates a generation-specific asset: ${asset}`);
  }
  if (/catalog-candidate-|\/strip(?:-[^/]+)?\.webp$|\/(hero|catalog|motif)\.svg$/.test(asset)) {
    errors.push(`non-shipping exploration/intermediate asset is committed: ${asset}`);
  }
  if (/\/icon(?:-[^/]+)?\.(?:png|svg|webp)$/i.test(asset) && !approvedIdentityAssets.has(asset)) {
    errors.push(`identity asset is not in the redistribution-reviewed allowlist: ${asset}`);
  }
  if (asset.endsWith('.svg') && !approvedIdentityAssets.has(asset)) {
    errors.push(`SVG is not a manifest-approved official identity asset: ${asset}`);
  }
}

if (errors.length) {
  console.error(`Model-family visual contract failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Model-family visual contract passed for ${manifest.families.length} families.`);
