// Public, standalone prompts adapted from the recorded walkthrough.
// Keep credentials, internal bug links, and private recording tooling out of this file.
export const walkthroughVideos = {
  setup: { title: 'Set up your Jetson with Codex', youtubeId: 'un8h0gDTB60' },
  kiosk: { title: 'Build a standalone VLM kiosk with Codex', youtubeId: 'TJ6hXRGTRgA' },
};

export const setupPrompts = [
  {
    id: 'f1', title: 'Connect to your Jetson',
    note: 'Recorded on macOS over USB. Replace “Mac” and the login name for your setup. Confirm the intended device before accepting an SSH host key; investigate changed-key warnings.',
    prompt: `Connect this Mac to my USB-connected Jetson and set up key-based SSH.

1. Guide my first login as jetson in this app's terminal. If using screen, guide login and cleanup.
2. Use jon-xxxx for the SSH alias and HostKeyAlias, using the last four hex digits of the built-in Ethernet NIC's permanent MAC. Use a dedicated SSH key.
3. Confirm access works. Keep DHCP automatic; Wi-Fi is next.`,
  },
  {
    id: 'f2', title: 'Give Jetson its own internet connection',
    note: 'Skip this step if the Jetson already has independent internet access. Do not paste Wi-Fi passwords into chat or project files.',
    prompt: `Connect the Jetson to its own Wi-Fi, keeping USB SSH working.

Guide me to enter the SSID and password locally, not in this chat. Enable automatic reconnection and verify internet access without this Mac.

Keep credentials only in the protected Wi-Fi profile.`,
  },
  {
    id: 'f3', title: 'Prepare Codex on the Jetson',
    note: 'Follow the official installation and sign-in flow. Enter passwords and authorization codes only in the appropriate local terminal or sign-in page.',
    prompt: `Prepare this Jetson for a Codex remote project.

Use our SSH connection to install Codex CLI if needed, guide sign-in, and prepare ~/jetson-ai-demo.

Connection registration is next.`,
  },
  {
    id: 'f4', title: 'Add the remote project',
    note: 'In the ChatGPT desktop app, SSH hosts are managed in Settings > Connections. Register the project, but keep this setup conversation on your Mac through step 7.',
    prompt: `Add this Jetson's SSH connection and ~/jetson-ai-demo as a remote project in this app. Guide any required clicks.

Finish when it appears under Projects. Keep this task on the Mac.`,
  },
  {
    id: 'f5', title: 'Establish a read-only baseline',
    note: 'Understand the actual device before changing it. Missing host AI libraries are not necessarily blockers when the application uses containers.',
    prompt: `Create a baseline for this Jetson's container-based VLM demo.

Summarize hardware, software versions, memory, storage, and GPU container readiness with the desktop running. Focus on actual deployment blockers, not missing host AI libraries.

Read-only; no downloads or changes.`,
  },
  {
    id: 'f6', title: 'Add Jetson Device Skills',
    note: 'Install on the Jetson, not the Mac. The Jetson Agent Skills guide covers installation paths and the full catalog. Start a fresh Jetson-side task for the application walkthrough.',
    noteLink: { text: 'Jetson Agent Skills guide', href: '/tutorials/jetson-agent-skills/' },
    prompt: `Install NVIDIA Jetson Device Skills from the official repository for the jetson user's Codex on the Jetson, not this Mac.

Confirm they are installed in the correct location.`,
  },
  {
    id: 'f7', title: 'Finish GPU container setup',
    note: 'Review downloads and system changes before approving. If Docker group membership changes, verify access from a fresh remote session before starting the application.',
    prompt: `Read the Jetson Device Skills over SSH and finish this Jetson's Docker setup for GPU-accelerated AI demos.

Propose only missing setup, then apply after approval. No full JetPack SDK; swap only if needed. Use a small compatible container to test GPU access.

Keep the desktop and USB SSH working.`,
  },
];

export const demoPrompts = [
  {
    id: 'f8', title: 'Plan a live VLM application',
    note: 'Start a new task inside the Jetson remote project. Attach the USB webcam and display to Jetson first. Check the selected runtime against your Jetson model and software release.',
    prompt: `Plan a live VLM demo for this Jetson using an existing app and prebuilt containers.

- USB webcam and display attached to the Jetson; browser capture is fine
- Inference on the Jetson; localhost access only

Find an app through Jetson AI Lab. Use https://www.jetson-ai-lab.com/models/gemma4-e2b/ for a lightweight, vision-capable setup that fits alongside the desktop.

Show the plan and download sizes before deploying.`,
  },
  {
    id: 'f9', title: 'Deploy and check real camera inference',
    note: 'Approve the plan first. Use an image that includes the required upstream features. Five minutes is a smoke test, not proof of production reliability.',
    prompt: `Deploy the approved VLM demo.

Show working captions from the Jetson's USB webcam in its browser. Check GPU acceleration, latency, and memory stability for five minutes.

Use the existing WebUI; no custom UI or Mac preview.`,
  },
  {
    id: 'f10', title: 'Make it a standalone kiosk',
    note: 'Use a dedicated demo account. Review auto-login and startup services, keep rollback instructions, and shut down safely before cycling power. Verify fresh captions, not just an open browser.',
    prompt: `Make this Jetson boot directly into the fullscreen VLM demo, with camera capture and inference running automatically, without this Mac or internet.

Reuse upstream kiosk support. Ask before enabling desktop auto-login or rebooting.

Guide a reboot and safe power-off/on test, confirm fresh captions without clicks, and leave rollback instructions.`,
  },
];
