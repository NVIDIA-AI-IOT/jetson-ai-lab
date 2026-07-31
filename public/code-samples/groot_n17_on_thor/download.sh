#!/usr/bin/env bash
#
# Adds the GR00T N1.7 TensorRT optimization patch to a public Isaac-GR00T checkout.
#
# Usage — run from the root of an Isaac-GR00T clone pinned to the validated commit:
#   wget -qO- https://www.jetson-ai-lab.com/code-samples/groot_n17_on_thor/download.sh | bash
#
set -euo pipefail

BASE_URL="${BASE_URL:-https://www.jetson-ai-lab.com/code-samples/groot_n17_on_thor}"
BASE_COMMIT="9c7e746b2cd37a810070a98ef41d290a07e806c2"
PATCH_NAME="groot-n17-trt-optimization.patch"

die() { echo "ERROR: $*" >&2; exit 1; }

# --- sanity checks -----------------------------------------------------------
[ -d .git ] || die "run this from the root of an Isaac-GR00T clone"
[ -d scripts/deployment ] || die "scripts/deployment not found — is this Isaac-GR00T?"

HEAD_SHA="$(git rev-parse HEAD)"
if [ "$HEAD_SHA" != "$BASE_COMMIT" ]; then
    echo "WARNING: HEAD is $(git rev-parse --short HEAD), not the validated commit ${BASE_COMMIT:0:7}."
    echo "         The patch may not apply. To pin:"
    echo "           git checkout $BASE_COMMIT && git lfs pull"
    echo
fi

# The Thor torchcodec wheel is a Git LFS object. If it is still a pointer, the
# container build will fail later with an unreadable-zip error, so catch it now.
WHEEL="$(find scripts/deployment/thor/wheels -name 'torchcodec-*.whl' -print -quit 2>/dev/null || true)"
if [ -n "$WHEEL" ] && ! file "$WHEEL" | grep -q "Zip archive"; then
    die "$WHEEL is a Git LFS pointer, not a wheel.
       Install git-lfs and run: git lfs install && git lfs pull"
fi

# --- fetch and apply ---------------------------------------------------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Fetching $PATCH_NAME ..."
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$BASE_URL/$PATCH_NAME" -o "$TMP/$PATCH_NAME"
else
    wget -qO "$TMP/$PATCH_NAME" "$BASE_URL/$PATCH_NAME"
fi

echo "Fetching Dockerfile.libero (optional, for closed-loop evaluation) ..."
mkdir -p code-samples
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$BASE_URL/Dockerfile.libero" -o code-samples/Dockerfile.libero || true
else
    wget -qO code-samples/Dockerfile.libero "$BASE_URL/Dockerfile.libero" || true
fi

if git apply --check "$TMP/$PATCH_NAME" 2>/dev/null; then
    git apply "$TMP/$PATCH_NAME"
    echo "Optimization patch applied."
elif git apply --reverse --check "$TMP/$PATCH_NAME" 2>/dev/null; then
    echo "Optimization patch is already applied — nothing to do."
else
    die "patch does not apply to this working tree.
       Ensure you are on $BASE_COMMIT with a clean tree, then retry."
fi

cat <<'EOF'

Added:
  scripts/deployment/n1d7_optimization_config.py   precision policy
  scripts/deployment/calibration.py                quantization recipes
  scripts/deployment/n1d7_optimized_export.py      restructured action-head export
  scripts/deployment/n1d7_optimized_runtime.py     restructured inference loop
  code-samples/Dockerfile.libero                   optional, adds OSMesa for LIBERO

Modified:
  scripts/deployment/{export_onnx_n1d7,build_tensorrt_engine,build_trt_pipeline}.py
  scripts/deployment/{trt_model_forward,benchmark_inference,verify_n1d7_trt}.py
  scripts/deployment/standalone_inference_script.py

Next: build the container (Step 6 of the tutorial)
  cd docker && bash build.sh --profile=thor && cd ..
EOF
