import { defineCollection, z } from 'astro:content';

const tutorials = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['Text', 'Image', 'Audio', 'Multimodal', 'Fundamentals', 'Setup', 'Workshops']),
    section: z.string().optional(), // For sub-grouping within categories (e.g., "Inference Engines", "Getting Started")
    order: z.number().optional(), // For custom ordering within sections
    tags: z.array(z.string()),
    model: z.string().optional(),
    featured: z.boolean().optional(),
    isNew: z.boolean().optional(), // Mark as new tutorial
    hero_image: z.string().optional(), // Optional background image for hero section
  }),
});

const models = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    model_id: z.string().optional(), // For linking to benchmarks.json if needed, or internal ID
    short_description: z.string(), // For hero text
    family: z.string().optional(), // Grouping for index
    icon: z.string().optional(), // Emoji or icon
    is_new: z.boolean().optional(),
    order: z.number().optional(), // For ordering within family (smaller = first)
    type: z.string().optional(), // e.g. "Multimodal", "Text"
    hf_checkpoint: z.string().optional(),
    huggingface_url: z.string().url().optional(), // Link to HuggingFace model page
    build_nvidia_url: z.string().url().optional(), // Link to build.nvidia.com model page
    memory_requirements: z.string(),
    precision: z.string(),
    model_size: z.string(),
    supported_inference_engines: z.array(z.object({
      engine: z.string(),
      type: z.string(), // "Container" or "Native"
      install_command: z.string().optional(),
      run_command: z.string().optional(),
      install_command_orin: z.string().optional(),
      run_command_orin: z.string().optional(),
      install_command_thor: z.string().optional(),
      run_command_thor: z.string().optional(),
    })),
    benchmark: z.object({
      orin: z.object({
        concurrency1: z.number(),
        concurrency8: z.number(),
        ttftMs: z.number(),
      }),
      thor: z.object({
        concurrency1: z.number(),
        concurrency8: z.number(),
        ttftMs: z.number(),
      }),
    }).optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    date: z.string(), // e.g. "2024-04-26"
    source: z.enum(['GitHub', 'Hackster', 'YouTube', 'NVIDIA', 'JetsonHacks', 'Medium', 'Seeed', 'Other']),
    link: z.string().url(),
    image: z.string().optional(), // URL to thumbnail/preview image
    video: z.string().optional(), // YouTube embed URL or video URL
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { tutorials, models, projects };
