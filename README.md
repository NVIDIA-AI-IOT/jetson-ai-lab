# Jetson AI Lab

[![Deploy to GitHub Pages](https://github.com/NVIDIA-AI-IOT/jetson-ai-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/NVIDIA-AI-IOT/jetson-ai-lab/actions/workflows/ci.yml)

**[www.jetson-ai-lab.com](https://www.jetson-ai-lab.com)**

The NVIDIA Jetson AI Lab is your guide to running generative AI models entirely on-device with NVIDIA Jetson. Explore optimized tutorials, benchmarks, and hands-on examples for LLMs, VLMs, image generation, speech recognition, and more.

## About

Jetson AI Lab pairs a modern Astro frontend with a content-driven workflow, enabling new tutorials, models, and community projects to be published without touching layout code.

### Key Features

- Optimized showcase for flagship models: Llama 4, Gemma 3, Qwen, SDXL, Whisper, and more
- Curated tutorials, benchmarks, and community resources with consistent styling
- Local-first architecture: everything runs on Jetson hardware with no cloud dependency
- Content authored in Markdown/JSON for fast iteration and git-friendly reviews
- Archive of legacy documentation at `/archive/`

### Technology Stack

- **Astro 5** - Static-first frontend framework
- **Tailwind CSS** - Design system and styling
- **MDX & Markdown** - Rich content with interactive elements
- **TypeScript** - Type safety across data collections
- **Chart.js** - Interactive benchmark visualizations

## Project Structure

```
/
├── src/
│   ├── components/           Shared UI elements
│   ├── content/              Markdown and JSON content repositories
│   │   ├── home.json         Homepage metrics and featured models
│   │   ├── models/           Model deep dives authored in Markdown
│   │   ├── tutorials/        Long-form tutorials with frontmatter
│   │   ├── projects/         Community project entries
│   │   └── gtc26/            GTC workshop lab content
│   ├── data/                 Benchmark and category data (JSON)
│   ├── layouts/              Base layouts for pages and tutorials
│   └── pages/                Astro routes for the site
├── public/
│   ├── archive/              Legacy MkDocs documentation (static)
│   ├── code-samples/         Downloadable tutorial scripts
│   └── images/               Static assets
├── astro.config.mjs          Astro configuration with redirects
├── tailwind.config.mjs       Tailwind theme definitions
└── TUTORIAL_TEMPLATE.md      Authoring guide for new tutorials
```

## Getting Started

### Prerequisites

- Node.js 20 and npm 
- Git

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/NVIDIA-AI-IOT/jetson-ai-lab.git
cd jetson-ai-lab
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm run dev
```

The development server will be available at http://localhost:4321

4. **Build for production**

```bash
npm run build
npm run preview
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build static site for production |
| `npm run preview` | Preview production build locally |
| `npm run astro` | Run Astro CLI commands |

## Content Authoring

See [CONTRIBUTING.md](CONTRIBUTING.md) for collection schemas, validation requirements, and contribution workflow.

### Adding Tutorials

1. Create a Markdown file in `src/content/tutorials/` with appropriate frontmatter
2. Create a matching `.astro` wrapper in `src/pages/tutorials/`
3. Follow the `TUTORIAL_TEMPLATE.md` guide for formatting

### Adding Models

Add a Markdown file under `src/content/models/` with frontmatter for overview, benchmarks, and usage examples.

### Updating Homepage

Edit `src/content/home.json` to update hero metrics, featured models, and stats.

### Content Tips

- Use Markdown headings and tables for consistent styling
- Match tutorial frontmatter to `src/content/config.ts` (`title`, `description`, `category`, `tags`, and optional `authors`)
- Store media assets under `public/` and reference with absolute paths

## URL Redirects

Old MkDocs URLs are automatically redirected:

| Old URL | New URL |
|---------|---------|
| `/tutorial_ollama.html` | `/tutorials/ollama/` |
| `/tutorial_live-vlm-webui.html` | `/tutorials/live-vlm-webui/` |
| `/models.html` | `/models/` |
| Other `.html` URLs | `/archive/[original-path]` |

Redirects are configured in `astro.config.mjs` and the custom `404.astro` page.

## Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions on every push to `main`.

- **Production URL**: https://www.jetson-ai-lab.com
- **Build Output**: Static HTML/CSS/JS in `dist/`

### CI/CD Pipeline

The `.github/workflows/ci.yml` workflow handles:

- ✅ Automated builds on push to `main`
- ✅ Deployment to GitHub Pages
- ✅ Node.js 20 with npm caching

## Archive

Legacy MkDocs documentation is preserved at `/archive/` with a deprecation banner linking to the new site. This ensures old bookmarks and external links continue to work.

## Contributing

Developers inside and outside NVIDIA are invited to contribute tutorials, Jetson projects, model updates, code samples, benchmarks, and site improvements. Open your pull request against `main`, and one of our core contributors will review it.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, publishing guidelines, validation requirements, and the pull request process.

## License

Licensed under the [MIT License](LICENSE).

## Contact

For questions or contributions, please open an issue or contact the maintainers.

- Khalil Ben Khaled 
- Aditya Sahu 
- Chitoku Yato
