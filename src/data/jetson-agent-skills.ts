export type SkillFamily = 'device' | 'bsp';

export type SkillCategory = 'system' | 'memory' | 'inference' | 'video' | 'bsp';

export interface JetsonSkill {
  name: string;
  family: SkillFamily;
  category: SkillCategory;
  description: string;
}

export const skillCategories = [
  { id: 'all', label: 'All skills' },
  { id: 'system', label: 'System' },
  { id: 'memory', label: 'Memory' },
  { id: 'inference', label: 'Inference' },
  { id: 'video', label: 'Video' },
  { id: 'bsp', label: 'BSP' },
] as const;

export const jetsonSkills: JetsonSkill[] = [
  {
    name: 'jetson-diagnostic',
    family: 'device',
    category: 'system',
    description: 'Read-only health snapshot for identity, memory, GPU, thermals, power, storage, and services.',
  },
  {
    name: 'jetson-print-device-info',
    family: 'device',
    category: 'system',
    description: 'Report module model, L4T, kernel, operating system, and current power mode.',
  },
  {
    name: 'jetson-memory-audit',
    family: 'device',
    category: 'memory',
    description: 'Measure DRAM and NvMap use, then verify whether a change reclaimed memory.',
  },
  {
    name: 'jetson-headless-mode',
    family: 'device',
    category: 'memory',
    description: 'Plan and apply bounded headless changes that recover GUI and daemon memory.',
  },
  {
    name: 'jetson-inference-mem-tune',
    family: 'device',
    category: 'inference',
    description: 'Select a serving stack and tune memory flags for the live Jetson configuration.',
  },
  {
    name: 'jetson-llm-serve',
    family: 'device',
    category: 'inference',
    description: 'Launch vLLM or SGLang with compatible images and device-aware settings.',
  },
  {
    name: 'jetson-llm-benchmark',
    family: 'device',
    category: 'inference',
    description: 'Benchmark LLM serving with repeatable metrics and structured JSON output.',
  },
  {
    name: 'jetson-speculative-decoding',
    family: 'device',
    category: 'inference',
    description: 'Add EAGLE-3 or a draft model when output-token latency is the bottleneck.',
  },
  {
    name: 'jetson-package',
    family: 'device',
    category: 'inference',
    description: 'Choose Jetson-compatible containers, runtime images, and Python package sources.',
  },
  {
    name: 'jetson-video-setup',
    family: 'device',
    category: 'video',
    description: 'Install, repair, probe, and verify Video Codec SDK or PyNvVideoCodec.',
  },
  {
    name: 'jetson-video-capability',
    family: 'device',
    category: 'video',
    description: 'Resolve codec, profile, chroma, bit-depth, dimensions, and engine support.',
  },
  {
    name: 'jetson-video-recipe',
    family: 'device',
    category: 'video',
    description: 'Turn an encoder use case into one validated configuration and command.',
  },
  {
    name: 'jetson-video-benchmark',
    family: 'device',
    category: 'video',
    description: 'Measure encode/decode throughput and compare presets or worker capacity.',
  },
  {
    name: 'jetson-video-pipeline',
    family: 'device',
    category: 'video',
    description: 'Execute and verify encode, decode, transcode, segmentation, and AV1 workflows.',
  },
  {
    name: 'jetson-quick-start',
    family: 'bsp',
    category: 'bsp',
    description: 'Collect core target inputs and dispatch the right BSP setup workflow.',
  },
  {
    name: 'jetson-init-target',
    family: 'bsp',
    category: 'bsp',
    description: 'Create a target-platform profile and make it the active BSP target.',
  },
  {
    name: 'jetson-download-bsp',
    family: 'bsp',
    category: 'bsp',
    description: 'Download release-matched BSP, rootfs, sources, toolchain, and guides.',
  },
  {
    name: 'jetson-derive-carrier',
    family: 'bsp',
    category: 'bsp',
    description: 'Fork reference carrier files and scaffold a custom carrier overlay.',
  },
  {
    name: 'jetson-customize-pinmux',
    family: 'bsp',
    category: 'bsp',
    description: 'Apply per-pin SFIO, direction, and initial state from pinmux data.',
  },
  {
    name: 'jetson-customize-usb',
    family: 'bsp',
    category: 'bsp',
    description: 'Enable or disable USB2 and USB3 ports through a device-tree overlay.',
  },
  {
    name: 'jetson-customize-pcie',
    family: 'bsp',
    category: 'bsp',
    description: 'Configure PCIe controllers, lanes, and link speed for the target.',
  },
  {
    name: 'jetson-customize-uphy',
    family: 'bsp',
    category: 'bsp',
    description: 'Allocate UPHY lanes across PCIe, USB3, and MGBE.',
  },
  {
    name: 'jetson-customize-camera',
    family: 'bsp',
    category: 'bsp',
    description: 'Enable MIPI or GMSL camera sensors from in-tree sensor definitions.',
  },
  {
    name: 'jetson-customize-nvpmodel',
    family: 'bsp',
    category: 'bsp',
    description: 'Add, edit, and select the boot-default nvpmodel power mode.',
  },
  {
    name: 'jetson-build-source',
    family: 'bsp',
    category: 'bsp',
    description: 'Rebuild device tree, modules, kernel, or the full source workspace.',
  },
  {
    name: 'jetson-flash-image',
    family: 'bsp',
    category: 'bsp',
    description: 'Flash a promoted BSP image with the appropriate NVIDIA workflow.',
  },
  {
    name: 'jetson-validate-image',
    family: 'bsp',
    category: 'bsp',
    description: 'Run static BSP checks and on-target validation after flashing.',
  },
];

export const installTargets = [
  {
    id: 'cursor',
    label: 'Cursor',
    command: `git clone https://github.com/NVIDIA-AI-IOT/jetson-device-skills.git
cd jetson-device-skills
./install.sh --targets cursor`,
  },
  {
    id: 'codex',
    label: 'Codex',
    command: `git clone https://github.com/NVIDIA-AI-IOT/jetson-device-skills.git
cd jetson-device-skills
./install.sh --targets codex`,
  },
  {
    id: 'claude',
    label: 'Claude Code',
    command: `git clone https://github.com/NVIDIA-AI-IOT/jetson-device-skills.git
cd jetson-device-skills
./install.sh --targets claude`,
  },
] as const;
