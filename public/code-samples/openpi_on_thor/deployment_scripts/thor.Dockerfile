ARG BASE_IMAGE=nvcr.io/nvidia/pytorch:26.05-py3
FROM ${BASE_IMAGE}

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      python3-dev \
      libsm6 \
      libxext6 \
      ffmpeg \
      libhdf5-serial-dev \
      libtesseract-dev \
      libgtk-3-0 \
      libtbb12 \
      libgl1 \
      libatlas-base-dev \
      libopenblas-dev \
      build-essential \
      python3-setuptools \
      make \
      cmake \
      nasm \
      yasm \
      pkg-config \
      git \
      libgnutls28-dev \
      libvpx-dev \
      libopus-dev \
      libvorbis-dev \
      libmp3lame-dev \
      libfreetype-dev \
      libass-dev \
      libaom-dev \
      libdav1d-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /workspace

COPY deployment_scripts/pyproject.toml .

# Set to get precompiled jetson wheels
RUN export PIP_INDEX_URL=https://pypi.jetson-ai-lab.io/sbsa/cu130 && \
    export PIP_TRUSTED_HOST=pypi.jetson-ai-lab.io && \
    python3 -m pip install --ignore-installed --no-deps PyYAML==6.0.2 && \
    python3 -m pip install -e '.[thor]'  && \
    pip install onnxslim lief

