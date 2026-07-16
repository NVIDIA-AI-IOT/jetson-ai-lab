#!/usr/bin/env python3
import argparse
import logging
import os
import time

import numpy as np
import nvtx
import torch
from lerobot.datasets.lerobot_dataset import LeRobotDataset
from openpi.policies import policy_config
from openpi.policies.aloha_policy import make_aloha_example
from openpi.policies.droid_policy import make_droid_example
from openpi.policies.libero_policy import make_libero_example
from openpi.training import config as _config

# Configure logging to show INFO messages
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


def create_synthetic_example(config_name):
    """Create a synthetic example based on the config type."""
    print("  - Using synthetic example (random data)")

    # Determine which example maker to use based on config name
    if "libero" in config_name.lower():
        example = make_libero_example()
        print("  - Type: LIBERO")
        print(f"  - State shape: {example['observation/state'].shape}")
        print(f"  - Image shape: {example['observation/image'].shape}")
        print(f"  - Wrist image shape: {example['observation/wrist_image'].shape}")
    elif "droid" in config_name.lower():
        example = make_droid_example()
        print("  - Type: DROID")
        print(f"  - Joint position shape: {example['observation/joint_position'].shape}")
        print(f"  - Gripper position shape: {example['observation/gripper_position'].shape}")
        print(f"  - Exterior image shape: {example['observation/exterior_image_1_left'].shape}")
        print(f"  - Wrist image shape: {example['observation/wrist_image_left'].shape}")
    elif "aloha" in config_name.lower():
        example = make_aloha_example()
        print("  - Type: ALOHA")
        print(f"  - State shape: {example['state'].shape}")
        print(f"  - Number of cameras: {len(example['images'])}")
        for cam_name, img in example["images"].items():
            print(f"  - {cam_name} shape: {img.shape}")
    else:
        # Default to LIBERO if unknown
        print(f"  - Warning: Unknown config type '{config_name}', defaulting to LIBERO")
        example = make_libero_example()
        print(f"  - State shape: {example['observation/state'].shape}")
        print(f"  - Image shape: {example['observation/image'].shape}")
        print(f"  - Wrist image shape: {example['observation/wrist_image'].shape}")

    print(f"  - Prompt: {example.get('prompt', 'N/A')}")
    return example


def load_dataset_sample(config, sample_idx):
    """Load a sample from the LIBERO dataset."""
    repo_id = config.data.repo_id
    print(f"  - Dataset: {repo_id}")

    dataset = LeRobotDataset(repo_id)
    raw_example = dataset[sample_idx]

    print(f"  - Total samples: {len(dataset)}")
    print(f"  - Using sample index: {sample_idx}")
    print(f"  - Task: {raw_example.get('task', 'N/A')}")

    # Remap keys to match policy expectations (observation/ prefix)
    example = {
        "observation/image": raw_example["image"],
        "observation/wrist_image": raw_example["wrist_image"],
        "observation/state": raw_example["state"],
        "prompt": raw_example["task"],
    }

    return example


def load_example(config, use_dataset, sample_idx):
    """Load an example either from dataset or create a synthetic one."""
    if use_dataset:
        return load_dataset_sample(config, sample_idx)
    else:
        return create_synthetic_example(config.name)


def run_pytorch_inference(config, checkpoint_dir, example, noise=None, num_warmup=3, num_test_runs=10):
    """Run PyTorch inference with warmup and multiple test runs."""
    print("\n--- PyTorch Inference ---")
    print("Loading policy...")
    policy = policy_config.create_trained_policy(config, checkpoint_dir)
    print("Policy loaded successfully")

    # Deployment-side hook: align the additive attention mask dtype with the
    # attention compute dtype before torch.compile traces sample_actions,
    # otherwise the memory-efficient SDPA kernel raises
    # "invalid dtype for bias - should match query's dtype".
    from deployment_scripts.trt_model_forward import install_attention_mask_dtype_fix

    install_attention_mask_dtype_fix(policy._model if hasattr(policy, "_model") else policy.model)

    # Warmup runs
    print(f"\nWarming up ({num_warmup} runs)...")
    for i in range(num_warmup):
        _ = policy.infer(example, noise=noise)
        print(f"  Warmup {i + 1}/{num_warmup} completed")

    # Test runs
    print(f"\nRunning inference tests ({num_test_runs} runs)...")
    inference_times = []
    model_times = []
    action_chunk = None

    for i in range(num_test_runs):
        if noise is not None and i == 0:
            print(f"  Using golden noise with shape: {noise.shape}")

        start_time = time.time()
        result = policy.infer(example, noise=noise)
        inference_time = (time.time() - start_time) * 1000

        inference_times.append(inference_time)
        policy_timing = result.get("policy_timing", {})
        model_time = policy_timing.get("infer_ms", inference_time)
        model_times.append(model_time)

        if i == 0:
            action_chunk = result["actions"]

        print(f"  Test {i + 1}/{num_test_runs}: {inference_time:.2f} ms")

    del policy

    # Calculate statistics
    inference_stats = {
        "mean": np.mean(inference_times),
        "std": np.std(inference_times),
        "min": np.min(inference_times),
        "max": np.max(inference_times),
        "all": inference_times,
    }

    model_stats = {
        "mean": np.mean(model_times),
        "std": np.std(model_times),
        "min": np.min(model_times),
        "max": np.max(model_times),
        "all": model_times,
    }

    return action_chunk, inference_stats, model_stats


def run_tensorrt_inference(
    config, checkpoint_dir, engine_path, example, noise=None, num_warmup=3, num_test_runs=10
):
    """Run TensorRT inference with warmup and multiple test runs."""
    print("\n--- TensorRT Inference ---")

    if not os.path.exists(engine_path):
        raise FileNotFoundError(
            f"TensorRT engine not found at {engine_path}\n"
            "Please run ONNX to TensorRT conversion first:\n"
            "  bash deployment_scripts/build_engine.sh"
        )

    print("Loading policy...")
    policy = policy_config.create_trained_policy(config, checkpoint_dir)
    print("Policy loaded successfully")

    print("Setting up TensorRT engine...")
    from deployment_scripts.trt_model_forward import setup_pi0_tensorrt_engine

    policy = setup_pi0_tensorrt_engine(
        policy,
        engine_path,
    )
    print("TensorRT engine ready")

    # Warmup runs
    print(f"\nWarming up ({num_warmup} runs)...")
    with nvtx.annotate("warmup", color="blue"):
        for i in range(num_warmup):
            with nvtx.annotate(f"warmup_{i}", color="cyan"):
                _ = policy.infer(example, noise=noise)
            print(f"  Warmup {i + 1}/{num_warmup} completed")

    # Test runs
    print(f"\nRunning inference tests ({num_test_runs} runs)...")
    inference_times = []
    model_times = []
    action_chunk = None

    with nvtx.annotate("inference_test", color="green"):
        for i in range(num_test_runs):
            if noise is not None and i == 0:
                print(f"  Using golden noise with shape: {noise.shape}")

            with nvtx.annotate(f"test_{i}", color="yellow"):
                start_time = time.time()
                result = policy.infer(example, noise=noise)
                inference_time = (time.time() - start_time) * 1000

            inference_times.append(inference_time)
            policy_timing = result.get("policy_timing", {})
            model_time = policy_timing.get("infer_ms", inference_time)
            model_times.append(model_time)

            if i == 0:
                action_chunk = result["actions"]

            print(f"  Test {i + 1}/{num_test_runs}: {inference_time:.2f} ms")

    del policy

    # Calculate statistics
    inference_stats = {
        "mean": np.mean(inference_times),
        "std": np.std(inference_times),
        "min": np.min(inference_times),
        "max": np.max(inference_times),
        "all": inference_times,
    }

    model_stats = {
        "mean": np.mean(model_times),
        "std": np.std(model_times),
        "min": np.min(model_times),
        "max": np.max(model_times),
        "all": model_times,
    }

    return action_chunk, inference_stats, model_stats


def compare_outputs(pytorch_actions, tensorrt_actions):
    """Compare PyTorch and TensorRT outputs."""
    print("\n" + "=" * 60)
    print("Comparison Results:")
    print("=" * 60)

    # Shape comparison
    print(f"PyTorch shape:  {pytorch_actions.shape}")
    print(f"TensorRT shape: {tensorrt_actions.shape}")

    if pytorch_actions.shape != tensorrt_actions.shape:
        print("WARNING: Shapes don't match!")
        return

    # Cosine Similarity
    pytorch_flat = pytorch_actions.flatten()
    tensorrt_flat = tensorrt_actions.flatten()

    dot_product = np.dot(pytorch_flat, tensorrt_flat)
    pytorch_norm = np.linalg.norm(pytorch_flat)
    tensorrt_norm = np.linalg.norm(tensorrt_flat)
    cosine_similarity = dot_product / (pytorch_norm * tensorrt_norm + 1e-8)

    print("\nCosine Similarity:")
    print(f"  - Overall: {cosine_similarity:.8f}")

    # Per-timestep cosine similarity
    if len(pytorch_actions.shape) >= 2:
        timestep_similarities = []
        for t in range(pytorch_actions.shape[0]):
            pt_vec = pytorch_actions[t].flatten()
            trt_vec = tensorrt_actions[t].flatten()
            dot = np.dot(pt_vec, trt_vec)
            norm_pt = np.linalg.norm(pt_vec)
            norm_trt = np.linalg.norm(trt_vec)
            sim = dot / (norm_pt * norm_trt + 1e-8)
            timestep_similarities.append(sim)

        timestep_similarities = np.array(timestep_similarities)
        print(f"  - Per-timestep Mean: {timestep_similarities.mean():.8f}")
        print(f"  - Per-timestep Min:  {timestep_similarities.min():.8f}")
        print(f"  - Per-timestep Max:  {timestep_similarities.max():.8f}")

    # Statistical comparison
    diff = np.abs(pytorch_actions - tensorrt_actions)

    print("\nAbsolute Difference Statistics:")
    print(f"  - Mean:   {diff.mean():.6f}")
    print(f"  - Max:    {diff.max():.6f}")
    print(f"  - Min:    {diff.min():.6f}")
    print(f"  - Std:    {diff.std():.6f}")
    print(f"  - Median: {np.median(diff):.6f}")

    # Relative error
    rel_error = diff / (np.abs(pytorch_actions) + 1e-6)
    print("\nRelative Error:")
    print(f"  - Mean: {rel_error.mean():.6f}")
    print(f"  - Max:  {rel_error.max():.6f}")


def main():
    """Main entry point for pi05 inference."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Test π₀.5 inference")
    parser.add_argument(
        "--inference-mode",
        type=str,
        default="pytorch",
        choices=["pytorch", "tensorrt", "compare"],
        help="Inference mode: pytorch, tensorrt, or compare (default: pytorch)",
    )
    parser.add_argument(
        "--config-name",
        type=str,
        default="pi05_libero",
        help="Model config name (e.g., pi05_libero, pi05_droid, pi05_aloha, default: pi05_libero)",
    )
    parser.add_argument(
        "--checkpoint-dir",
        type=str,
        default="/root/converted_pytorch_checkpoint",
        help="Path to checkpoint directory (default: /root/converted_pytorch_checkpoint)",
    )
    parser.add_argument(
        "--engine-path",
        type=str,
        default=None,
        help="Path to TensorRT engine file (default: {checkpoint_dir}/model_fp16.engine)",
    )
    parser.add_argument(
        "--sample-idx",
        type=int,
        default=0,
        help="Dataset sample index to test (only used with --use-dataset, default: 0)",
    )
    parser.add_argument(
        "--use-dataset",
        action="store_true",
        help="Load example from LIBERO dataset instead of using synthetic example (default: False)",
    )
    parser.add_argument(
        "--golden-noise-path",
        type=str,
        default=None,
        help="Path to golden noise .npy file (optional, will auto-generate if not provided)",
    )
    parser.add_argument(
        "--num-warmup",
        type=int,
        default=3,
        help="Number of warmup runs (default: 3)",
    )
    parser.add_argument(
        "--num-test-runs",
        type=int,
        default=10,
        help="Number of test runs for timing (default: 10)",
    )
    args = parser.parse_args()

    # Set engine path default if not provided
    if args.engine_path is None:
        args.engine_path = os.path.join(args.checkpoint_dir, "model_fp16.engine")

    print("=" * 60)
    print(f"π₀.5 Inference Test - Mode: {args.inference_mode.upper()}")
    print(f"Config: {args.config_name}")
    print("=" * 60)

    # Load config
    config = _config.get_config(args.config_name)
    checkpoint_dir = args.checkpoint_dir

    if args.inference_mode == "compare":
        # Compare mode: run both and compare
        print("\n[1/4] Loading example...")
        example = load_example(config, args.use_dataset, args.sample_idx)

        # Generate or load golden noise for deterministic comparison
        if args.golden_noise_path:
            print(f"\n[2/4] Loading golden noise from {args.golden_noise_path}...")
            if not os.path.exists(args.golden_noise_path):
                raise FileNotFoundError(f"Golden noise file not found at {args.golden_noise_path}")
            golden_noise = np.load(args.golden_noise_path)
            print(f"Golden noise loaded with shape: {golden_noise.shape}")
        else:
            print("\n[2/4] Generating golden noise for deterministic comparison...")
            # Generate noise matching the model's action output shape
            # action_horizon=10, action_dim=32 for pi05_libero
            action_horizon = config.model.action_horizon
            action_dim = config.model.action_dim
            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_dtype = torch.float32

            noise_tensor = torch.normal(
                mean=0.0,
                std=1.0,
                size=(1, action_horizon, action_dim),
                dtype=compute_dtype,
                device=device,
            )
            # Convert to numpy for compatibility with save/load and remove batch dimension
            golden_noise = noise_tensor.squeeze(0).cpu().numpy()
            print(f"Generated golden noise with shape: {golden_noise.shape}")
            print(f"  (action_horizon={action_horizon}, action_dim={action_dim})")

        print("\n[3/4] Running both PyTorch and TensorRT inference...")
        tensorrt_actions, tensorrt_inference_stats, tensorrt_model_stats = run_tensorrt_inference(
            config,
            checkpoint_dir,
            args.engine_path,
            example,
            noise=golden_noise,
            num_warmup=args.num_warmup,
            num_test_runs=args.num_test_runs,
        )
        pytorch_actions, pytorch_inference_stats, pytorch_model_stats = run_pytorch_inference(
            config,
            checkpoint_dir,
            example,
            noise=golden_noise,
            num_warmup=args.num_warmup,
            num_test_runs=args.num_test_runs,
        )

        print("\n[4/4] Comparing results...")

        # Print individual results
        print("\n" + "=" * 60)
        print("Individual Results:")
        print("=" * 60)
        print("\nPyTorch:")
        print(f"  - Actions range: [{pytorch_actions.min():.4f}, {pytorch_actions.max():.4f}]")
        print(f"  - Total time: {pytorch_inference_stats['mean']:.2f} ± {pytorch_inference_stats['std']:.2f} ms")
        print(f"    (min: {pytorch_inference_stats['min']:.2f}, max: {pytorch_inference_stats['max']:.2f})")
        print(f"  - Model time: {pytorch_model_stats['mean']:.2f} ± {pytorch_model_stats['std']:.2f} ms")
        print(f"    (min: {pytorch_model_stats['min']:.2f}, max: {pytorch_model_stats['max']:.2f})")

        print("\nTensorRT:")
        print(f"  - Actions range: [{tensorrt_actions.min():.4f}, {tensorrt_actions.max():.4f}]")
        print(f"  - Total time: {tensorrt_inference_stats['mean']:.2f} ± {tensorrt_inference_stats['std']:.2f} ms")
        print(f"    (min: {tensorrt_inference_stats['min']:.2f}, max: {tensorrt_inference_stats['max']:.2f})")
        print(f"  - Model time: {tensorrt_model_stats['mean']:.2f} ± {tensorrt_model_stats['std']:.2f} ms")
        print(f"    (min: {tensorrt_model_stats['min']:.2f}, max: {tensorrt_model_stats['max']:.2f})")

        print("\nSpeedup:")
        speedup_total = pytorch_inference_stats["mean"] / tensorrt_inference_stats["mean"]
        speedup_model = pytorch_model_stats["mean"] / tensorrt_model_stats["mean"]
        print(f"  - Total: {speedup_total:.2f}x")
        print(f"  - Model: {speedup_model:.2f}x")

        # Compare outputs
        compare_outputs(pytorch_actions, tensorrt_actions)

        # Add note about noise usage
        print("\n" + "=" * 60)
        print("NOTE: Golden Noise for Deterministic Comparison")
        print("=" * 60)
        if args.golden_noise_path:
            print(f"Used loaded golden noise from: {args.golden_noise_path}")
            print("  Both models used identical noise for exact comparison")
        else:
            print("Generated random golden noise automatically")
            print("  Both models used the same generated noise for fair comparison")
            print("\nTo save and reuse this noise:")
            print(f"  np.save('golden_noise.npy', noise)  # shape: {golden_noise.shape}")
            print("  Then run with: --golden-noise-path=golden_noise.npy")

    elif args.inference_mode == "pytorch":
        # PyTorch only
        print("\n[1/2] Loading example...")
        example = load_example(config, args.use_dataset, args.sample_idx)

        print("\n[2/2] Running PyTorch inference...")
        action_chunk, inference_stats, model_stats = run_pytorch_inference(
            config, checkpoint_dir, example, num_warmup=args.num_warmup, num_test_runs=args.num_test_runs
        )

        print("\n" + "=" * 60)
        print("Results:")
        print("=" * 60)
        print(f"Actions shape: {action_chunk.shape}")
        print(f"Actions range: [{action_chunk.min():.4f}, {action_chunk.max():.4f}]")
        print(f"Total inference time: {inference_stats['mean']:.2f} ± {inference_stats['std']:.2f} ms")
        print(f"    (min: {inference_stats['min']:.2f}, max: {inference_stats['max']:.2f})")
        print(f"Model inference time: {model_stats['mean']:.2f} ± {model_stats['std']:.2f} ms")
        print(f"    (min: {model_stats['min']:.2f}, max: {model_stats['max']:.2f})")

    else:  # tensorrt
        # TensorRT only
        print("\n[1/2] Loading example...")
        example = load_example(config, args.use_dataset, args.sample_idx)

        print("\n[2/2] Running TensorRT inference...")
        action_chunk, inference_stats, model_stats = run_tensorrt_inference(
            config,
            checkpoint_dir,
            args.engine_path,
            example,
            num_warmup=args.num_warmup,
            num_test_runs=args.num_test_runs,
        )

        print("\n" + "=" * 60)
        print("Results:")
        print("=" * 60)
        print(f"Actions shape: {action_chunk.shape}")
        print(f"Actions range: [{action_chunk.min():.4f}, {action_chunk.max():.4f}]")
        print(f"Total inference time: {inference_stats['mean']:.2f} ± {inference_stats['std']:.2f} ms")
        print(f"    (min: {inference_stats['min']:.2f}, max: {inference_stats['max']:.2f})")
        print(f"Model inference time: {model_stats['mean']:.2f} ± {model_stats['std']:.2f} ms")
        print(f"    (min: {model_stats['min']:.2f}, max: {model_stats['max']:.2f})")

    print("\nTest completed successfully!")


if __name__ == "__main__":
    main()
