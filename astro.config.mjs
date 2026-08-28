import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeMermaid from 'rehype-mermaid';

export default defineConfig({
  integrations: [tailwind(), mdx(), sitemap()],
  site: 'https://www.jetson-ai-lab.com',
  /** Reduce dev restarts from tooling writing under the repo (Windows file watchers are noisy). */
  vite: {
    server: {
      watch: {
        ignored: [
          '**/.cursor/**',
          '**/_merge_backup/**',
          '**/dist/**',
          '**/node_modules/**',
        ],
      },
    },
  },
  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      theme: 'github-dark',
      wrap: true,
      excludeLangs: ['mermaid'], // Disable syntax highlighting for Mermaid
    },
    // img-svg scales reliably inside Tailwind Typography; inline-svg can clip or overflow wide LR flowcharts
    rehypePlugins: [[rehypeMermaid, { strategy: 'img-svg' }]],
  },
  redirects: {
    // Jetson Setup Guide
    '/initial_setup_jon.html': '/tutorials/getting-started-with-jetson/',
    '/initial_setup_jon': '/tutorials/getting-started-with-jetson/',
    '/initial_setup_jon_sdkm.html': '/tutorials/getting-started-with-jetson/',
    '/initial_setup_jon_sdkm': '/tutorials/getting-started-with-jetson/',
    '/tutorials/initial-setup-jetson-orin-nano/': '/tutorials/getting-started-with-jetson/',
    '/tutorials/initial-setup-sdk-manager/': '/tutorials/getting-started-with-jetson/',
    '/tips_ssd-docker.html': '/tutorials/ssd-docker-setup/',
    '/tips_ssd-docker': '/tutorials/ssd-docker-setup/',
    '/tips_ram-optimization.html': '/tutorials/ram-optimization/',
    '/tips_ram-optimization': '/tutorials/ram-optimization/',
    
    // Tutorials
    '/tutorial_ollama.html': '/tutorials/ollama/',
    '/tutorial_ollama': '/tutorials/ollama/',
    '/tutorial_nanoowl.html': '/tutorials/nanoowl/',
    '/tutorial_nanoowl': '/tutorials/nanoowl/',
    '/tutorial_live-vlm-webui.html': '/tutorials/live-vlm-webui/',
    '/tutorial_live-vlm-webui': '/tutorials/live-vlm-webui/',
    '/tutorial_gen-ai-benchmarking.html': '/tutorials/genai-benchmarking/',
    '/tutorial_gen-ai-benchmarking': '/tutorials/genai-benchmarking/',
    '/workshop_gtcdc2025.html': '/tutorials/workshop-gtc-dc-2025/',
    '/workshop_gtcdc2025': '/tutorials/workshop-gtc-dc-2025/',
    
    // Main sections - only redirect .html versions
    '/models.html': '/models/',
    '/benchmarks.html': '/archive/benchmarks.html',
    '/research.html': '/research/',
    '/community_articles.html': '/community/',
    
    // Catch common patterns - redirect to archive
    '/tutorial-intro.html': '/archive/tutorial-intro.html',
    '/tutorial-intro': '/archive/tutorial-intro.html',
    
    // Community & Meetings
    '/join': 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZWUwNTIxYmQtNGJmZC00MDA1LTkzN2MtYmFmMzJjZWUxNDFh%40thread.v2/0?context=%7b%22Tid%22%3a%2243083d15-7273-40c1-b7db-39efd9ccc17a%22%2c%22Oid%22%3a%223e5863c5-26ea-489e-a546-cdc43df532ed%22%7d',
    '/meeting': 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZWUwNTIxYmQtNGJmZC00MDA1LTkzN2MtYmFmMzJjZWUxNDFh%40thread.v2/0?context=%7b%22Tid%22%3a%2243083d15-7273-40c1-b7db-39efd9ccc17a%22%2c%22Oid%22%3a%223e5863c5-26ea-489e-a546-cdc43df532ed%22%7d',
  }
});
