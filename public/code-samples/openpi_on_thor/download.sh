#!/usr/bin/env bash
#
# Fetch the Jetson Thor deployment overlay for OpenPi pi0.5.
#
# Run this from the ROOT of your cloned OpenPi repository, after checking out
# the pinned commit (15a9616). It adds the deployment_scripts/ folder and
# applies the TensorRT export patches to examples/, scripts/, and src/.
#
# Usage:
#   git clone --recurse-submodules https://github.com/Physical-Intelligence/openpi.git
#   cd openpi
#   git checkout 15a9616a00943ada6c20a0f158e3adb39df2ccac
#   wget -qO- https://www.jetson-ai-lab.com/code-samples/openpi_on_thor/download.sh | bash
#
set -euo pipefail

BASE_URL="${OPENPI_THOR_OVERLAY_URL:-https://www.jetson-ai-lab.com/code-samples/openpi_on_thor}"

# Files that make up the overlay (paths are relative to the repo root).
FILES=(
  deployment_scripts/build_engine.sh
  deployment_scripts/calibration_data.py
  deployment_scripts/pi05_inference.py
  deployment_scripts/pyproject.toml
  deployment_scripts/pytorch_to_onnx.py
  deployment_scripts/thor.Dockerfile
  deployment_scripts/trt_model_forward.py
  deployment_scripts/trt_torch.py
  examples/convert_jax_model_to_pytorch.py
  scripts/serve_policy.py
  src/openpi/models/model.py
  src/openpi/models_pytorch/transformers_replace/models/gemma/modeling_gemma.py
)

# Sanity check: make sure we are at the root of an OpenPi checkout, because the
# overlay overwrites existing upstream files under examples/, scripts/, and src/.
if [ ! -d "src/openpi" ]; then
  echo "ERROR: 'src/openpi' not found in the current directory." >&2
  echo "Run this script from the root of your cloned OpenPi repository." >&2
  exit 1
fi

echo "Fetching Jetson Thor deployment overlay from:"
echo "  $BASE_URL"
echo

for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  echo "  -> $f"
  wget -q "$BASE_URL/$f" -O "$f"
done

# lerobot 0.3.2 renamed lerobot.common.datasets -> lerobot.datasets. Upstream
# data_loader.py (pulled in transitively by every inference step via
# checkpoints.py -> policy_config.py) still uses the old path, so patch it in
# place to match the lerobot version installed in the Thor image. 
if [ -f src/openpi/training/data_loader.py ]; then
  echo "  -> patching src/openpi/training/data_loader.py for lerobot 0.3.2"
  sed -i 's/lerobot\.common\.datasets/lerobot.datasets/g' src/openpi/training/data_loader.py
fi

echo
echo "Overlay applied successfully."
echo "  - deployment_scripts/ added"
echo "  - examples/, scripts/, and src/ patches applied"
echo "  - data_loader.py patched for lerobot 0.3.2"
