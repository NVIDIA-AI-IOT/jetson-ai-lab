#!/bin/bash

# Convert OpenPI ONNX model to TensorRT engine
#
# Usage:
#   ./build_engine.sh [onnx_path] [engine_path] [max_batch] [opt_batch] [min_batch] [action_horizon]
#   ONNX_PATH=/path/to/model.onnx ./build_engine.sh
#
# Run without arguments to auto-detect ONNX file and see full configuration.

set -e

if [ ! -e /usr/src/tensorrt/bin/trtexec ]; then
    echo "Error: trtexec not found. Please install TensorRT"
    exit 1
fi

DEFAULT_ONNX_DIR="/root/converted_pytorch_checkpoint/onnx"
ONNX_PATH="${ONNX_PATH:-${1}}"
ENGINE_PATH="${ENGINE_PATH:-${2}}"
MAX_BATCH="${MAX_BATCH:-${3:-4}}"
OPT_BATCH="${OPT_BATCH:-${4:-1}}"
MIN_BATCH="${MIN_BATCH:-${5:-1}}"
ACTION_HORIZON="${ACTION_HORIZON:-${6:-10}}"

if [ -z "$ONNX_PATH" ]; then
    ONNX_DIR="${ONNX_DIR:-$DEFAULT_ONNX_DIR}"
    ONNX_PATH=$(find "$ONNX_DIR" -maxdepth 1 -name "*.onnx" -type f | head -n 1)
    if [ -z "$ONNX_PATH" ]; then
        echo "Error: No ONNX file found in $ONNX_DIR"
        echo "Please specify ONNX_PATH or place an ONNX file in the default directory"
        exit 1
    fi
    echo "Auto-detected ONNX file: $ONNX_PATH"
fi

if [ -z "$ENGINE_PATH" ]; then
    ENGINE_DIR="${ENGINE_DIR:-$(dirname "$ONNX_PATH")}"
    ONNX_BASENAME=$(basename "$ONNX_PATH" .onnx)
    ENGINE_PATH="${ENGINE_DIR}/${ONNX_BASENAME}.engine"
fi

NUM_IMAGES=3
IMAGE_CHANNELS=$((NUM_IMAGES * 3))
IMAGE_SIZE=224

MAX_SEQ_LEN=208 # Use a multiple of 16 for better TensorRT performance.

STATE_DIM=32
ACTION_DIM=32

mkdir -p "$(dirname "$ENGINE_PATH")"

echo "Converting ONNX model to TensorRT engine..."
echo "Configuration:"
echo "  ONNX Path: $ONNX_PATH"
echo "  Engine Path: $ENGINE_PATH"
echo "  Batch Sizes: min=$MIN_BATCH, opt=$OPT_BATCH, max=$MAX_BATCH"
echo "  Action Horizon: $ACTION_HORIZON"
echo ""

/usr/src/tensorrt/bin/trtexec \
    --onnx="$ONNX_PATH" \
    --saveEngine="$ENGINE_PATH" \
    --useCudaGraph \
    --verbose \
    --stronglyTyped \
    --separateProfileRun \
    --profilingVerbosity=detailed \
    --dumpProfile \
    --dumpLayerInfo \
    --noDataTransfers \
    --exportProfile=${ENGINE_PATH}_profile.json \
    --exportLayerInfo=${ENGINE_PATH}_layers.json \
    --minShapes=images:${MIN_BATCH}x${IMAGE_CHANNELS}x${IMAGE_SIZE}x${IMAGE_SIZE},img_masks:${MIN_BATCH}x${NUM_IMAGES},lang_tokens:${MIN_BATCH}x${MAX_SEQ_LEN},lang_masks:${MIN_BATCH}x${MAX_SEQ_LEN},state:${MIN_BATCH}x${STATE_DIM},noise:${MIN_BATCH}x${ACTION_HORIZON}x${ACTION_DIM} \
    --optShapes=images:${OPT_BATCH}x${IMAGE_CHANNELS}x${IMAGE_SIZE}x${IMAGE_SIZE},img_masks:${OPT_BATCH}x${NUM_IMAGES},lang_tokens:${OPT_BATCH}x${MAX_SEQ_LEN},lang_masks:${OPT_BATCH}x${MAX_SEQ_LEN},state:${OPT_BATCH}x${STATE_DIM},noise:${OPT_BATCH}x${ACTION_HORIZON}x${ACTION_DIM} \
    --maxShapes=images:${MAX_BATCH}x${IMAGE_CHANNELS}x${IMAGE_SIZE}x${IMAGE_SIZE},img_masks:${MAX_BATCH}x${NUM_IMAGES},lang_tokens:${MAX_BATCH}x${MAX_SEQ_LEN},lang_masks:${MAX_BATCH}x${MAX_SEQ_LEN},state:${MAX_BATCH}x${STATE_DIM},noise:${MAX_BATCH}x${ACTION_HORIZON}x${ACTION_DIM} \
    > "${ENGINE_PATH}.log" 2>&1

echo ""
echo "TensorRT engine built successfully!"
echo "  ONNX: $ONNX_PATH"
echo "  Engine: $ENGINE_PATH"
echo "  Log: ${ENGINE_PATH}.log"
echo ""
echo "Engine shape ranges:"
echo "  images: [${MIN_BATCH}x${IMAGE_CHANNELS}x${IMAGE_SIZE}x${IMAGE_SIZE}] to [${MAX_BATCH}x${IMAGE_CHANNELS}x${IMAGE_SIZE}x${IMAGE_SIZE}]"
echo "  img_masks: [${MIN_BATCH}x${NUM_IMAGES}] to [${MAX_BATCH}x${NUM_IMAGES}]"
echo "  lang_tokens: [${MIN_BATCH}x${MAX_SEQ_LEN}] to [${MAX_BATCH}x${MAX_SEQ_LEN}]"
echo "  lang_masks: [${MIN_BATCH}x${MAX_SEQ_LEN}] to [${MAX_BATCH}x${MAX_SEQ_LEN}]"
echo "  state: [${MIN_BATCH}x${STATE_DIM}] to [${MAX_BATCH}x${STATE_DIM}]"
echo "  noise: [${MIN_BATCH}x${ACTION_HORIZON}x${ACTION_DIM}] to [${MAX_BATCH}x${ACTION_HORIZON}x${ACTION_DIM}]"

