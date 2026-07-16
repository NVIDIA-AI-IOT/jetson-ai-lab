#!/usr/bin/env python3
import torch
import tensorrt as trt
import atexit
import ctypes
import os


def torch_type(trt_type):
    mapping = {
        trt.float32: torch.float32,
        trt.float16: torch.float16,
        trt.int8: torch.int8,
        trt.int32: torch.int32,
        trt.bool: torch.bool,
        trt.uint8: torch.uint8,
        trt.int64: torch.int64,
    }
    if trt_type in mapping:
        return mapping[trt_type]

    raise TypeError(f"Could not resolve TensorRT datatype to an equivalent numpy datatype. {trt_type}")


class Engine(object):
    def __init__(self, file, plugins=[]):
        super().__init__()

        self.logger = trt.Logger(trt.Logger.ERROR)
        trt.init_libnvinfer_plugins(self.logger, "")

        self.plugins = [ctypes.CDLL(plugin, ctypes.RTLD_GLOBAL) for plugin in plugins]
        self.file = file
        self.load(file)

        # CUDA graph capture/replay for the whole engine enqueue (opt out with
        # TRT_TORCH_CUDA_GRAPH=0). Removes per-layer launch overhead on the
        # deployment path, same as trtexec --useCudaGraph.
        self.use_cuda_graph = os.getenv("TRT_TORCH_CUDA_GRAPH", "1") != "0"
        self._cuda_graphs = {}
        self._cuda_graph_disabled = False

        def destroy(self):
            # Release CUDA resources deterministically here, while the CUDA
            # context is still alive. If the captured CUDA graphs (and their
            # I/O buffers) are left on the Engine object, they get collected
            # during interpreter-shutdown GC in an undefined order relative to
            # the TRT execution context / CUDA context teardown, which
            # segfaults (Fatal Python error: Segmentation fault while
            # Garbage-collecting). Draining them in this atexit handler makes
            # the final GC find nothing CUDA-related to free.
            try:
                torch.cuda.synchronize()
            except Exception:
                pass
            if hasattr(self, "_cuda_graphs"):
                self._cuda_graphs.clear()
            if hasattr(self, "execution_context"):
                del self.execution_context
            if hasattr(self, "handle"):
                del self.handle
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass

        atexit.register(destroy, self)
        self.print()

    def print(self):
        if int(os.getenv("LOCAL_RANK", -1)) not in [0, -1]:
            return

        print("============= TRT Engine Detail =============")
        print(f"Engine file: {self.file}")
        print(f"Inputs: {len(self.in_meta)}")
        for ib, item in enumerate(self.in_meta):
            tensor_name, shape, dtype = item[:3]
            print(f"   {ib}. {tensor_name}: {'x'.join(map(str, shape))} [{dtype}]")

        print(f"Outputs: {len(self.out_meta)}")
        for ib, item in enumerate(self.out_meta):
            tensor_name, shape, dtype = item[:3]
            print(f"   {ib}. {tensor_name}: {'x'.join(map(str, shape))} [{dtype}]")
        print("=============================================")

    def load(self, file):
        runtime = trt.Runtime(self.logger)

        with open(file, "rb") as f:
            self.handle = runtime.deserialize_cuda_engine(f.read())
            assert self.handle is not None, f"Failed to deserialize the cuda engine from file: {file}"

        self.execution_context = self.handle.create_execution_context()
        self.meta, self.in_meta, self.out_meta = [], [], []
        for tensor_name in self.handle:
            shape = self.handle.get_tensor_shape(tensor_name)
            dtype = torch_type(self.handle.get_tensor_dtype(tensor_name))
            if self.handle.get_tensor_mode(tensor_name) == trt.TensorIOMode.INPUT:
                self.in_meta.append([tensor_name, shape, dtype])
            else:
                self.out_meta.append([tensor_name, shape, dtype])

    def __call__(self, *args, **inputs):
        return self.forward(*args, **inputs)

    def set_runtime_tensor_shape(self, name, shape):
        self.execution_context.set_input_shape(name, shape)

    def _gather_inputs(self, args, kwargs):
        named_inputs = []
        for iarg, x in enumerate(args):
            name, shape, dtype = self.in_meta[iarg]
            runtime_shape = self.execution_context.get_tensor_shape(name)
            assert isinstance(x, torch.Tensor), f"Unsupported tensor type: {type(x)}"
            assert runtime_shape == x.shape, f"Invalid input shape: {runtime_shape} != {x.shape}"
            assert dtype == x.dtype, f"Invalid tensor dtype, excepted dtype is {dtype}, but got {x.dtype}"
            assert x.is_cuda, f"Invalid tensor device, excepted device is cuda, but got {x.device}"
            named_inputs.append((name, x.contiguous()))

        for name, shape, dtype in self.in_meta:
            if name not in kwargs:
                continue

            runtime_shape = self.execution_context.get_tensor_shape(name)
            x = kwargs[name]
            assert isinstance(x, torch.Tensor), f"Unsupported tensor[{name}] type: {type(x)}"
            assert runtime_shape == x.shape, (
                f"Invalid input[{name}] shape: {x.shape}, but the expected shape is: {runtime_shape}"
            )
            assert dtype == x.dtype, f"Invalid tensor[{name}] dtype, expected dtype is {dtype}, but got {x.dtype}"
            assert x.is_cuda, f"Invalid tensor[{name}] device, expected device is cuda, but got {x.device}"
            named_inputs.append((name, x.contiguous()))

        assert len(named_inputs) == len(self.in_meta), (
            f"Invalid input tensors. Expected {len(self.in_meta)} inputs, but got {len(named_inputs)}"
        )
        return named_inputs

    def _capture_cuda_graph(self, named_inputs, stream):
        # Persistent I/O buffers: CUDA graph replay uses the addresses captured at
        # record time, so inputs are copied into these buffers before each replay.
        in_bufs = {}
        for name, x in named_inputs:
            buf = x.clone()
            self.execution_context.set_tensor_address(name, buf.data_ptr())
            in_bufs[name] = buf
        out_bufs = []
        for item in self.out_meta:
            name = item[0]
            runtime_shape = self.execution_context.get_tensor_shape(name)
            buf = torch.empty(tuple(runtime_shape), dtype=item[2], device=named_inputs[0][1].device)
            self.execution_context.set_tensor_address(name, buf.data_ptr())
            out_bufs.append(buf)

        # Warm-up enqueue outside capture: lazy allocations/autotuning must not
        # happen inside graph capture.
        self.execution_context.execute_async_v3(stream.cuda_stream)
        stream.synchronize()

        graph = torch.cuda.CUDAGraph()
        with torch.cuda.graph(graph):
            self.execution_context.execute_async_v3(torch.cuda.current_stream().cuda_stream)
        return {"graph": graph, "in_bufs": in_bufs, "out_bufs": out_bufs}

    def forward(self, *args, **kwargs):
        return_list = kwargs.pop("return_list", False)
        stream = torch.cuda.current_stream()
        named_inputs = self._gather_inputs(args, kwargs)

        if self.use_cuda_graph and not self._cuda_graph_disabled:
            sig = tuple((name, tuple(x.shape)) for name, x in named_inputs)
            entry = self._cuda_graphs.get(sig)
            if entry is None:
                try:
                    entry = self._capture_cuda_graph(named_inputs, stream)
                    self._cuda_graphs[sig] = entry
                    print(f"[trt_torch] CUDA graph captured ({len(self._cuda_graphs)} shape signature(s))")
                except Exception as e:  # noqa: BLE001 - any capture failure falls back to eager
                    print(f"[trt_torch] CUDA graph capture failed ({e}); falling back to per-call enqueue")
                    self._cuda_graph_disabled = True
                    entry = None
            if entry is not None:
                for name, x in named_inputs:
                    entry["in_bufs"][name].copy_(x, non_blocking=True)
                entry["graph"].replay()
                stream.synchronize()
                output_tensors = [buf.clone() for buf in entry["out_bufs"]]
                if return_list:
                    return output_tensors
                return {item[0]: output_tensors[i] for i, item in enumerate(self.out_meta)}

        for name, x in named_inputs:
            self.execution_context.set_tensor_address(name, x.data_ptr())

        output_tensors = []
        for item in self.out_meta:
            name = item[0]
            runtime_shape = self.execution_context.get_tensor_shape(name)
            output_tensor = torch.empty(tuple(runtime_shape), dtype=item[2], device=named_inputs[0][1].device)
            self.execution_context.set_tensor_address(name, output_tensor.data_ptr())
            output_tensors.append(output_tensor)

        self.execution_context.execute_async_v3(stream.cuda_stream)
        stream.synchronize()

        if return_list:
            return output_tensors
        else:
            return {item[0]: output_tensors[i] for i, item in enumerate(self.out_meta)}
