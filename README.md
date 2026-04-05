# 🔥 TrustMeBro - GenZ News Portal

An automated news portal that fetches trending news and rewrites it in Gen Z style using AI. Built with Astro, Tailwind CSS, and Gemini/native rewrite workflows.

![TrustMeBro](https://img.shields.io/badge/vibes-immaculate-ff69b4)
![Status](https://img.shields.io/badge/tea-piping%20hot-00ff9f)

## ✨ Features

- 🤖 **AI-Powered Rewriting** - News rewritten in Gen Z slang using Claude
- 🔄 **Auto Updates** - GitHub Actions fetches news every 6 hours
- 🌙 **Dark/Light Mode** - Toggle between themes
- 🔍 **Client-Side Search** - Fast, instant search
- 📱 **Fully Responsive** - Looks fire on all devices
- ⚡ **Lightning Fast** - Static site = blazing speed
- 🆓 **Free Hosting** - Deploy on Cloudflare Pages for $0

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- A [NewsAPI](https://newsapi.org) account (free tier works)
- A Google Gemini API key (optional but recommended)

### Local Development

\`\`\`bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/trustmebro.git
cd trustmebro

# Install dependencies
npm install

# Start dev server
npm run dev
\`\`\`

Visit \`http://localhost:4321\` 🎉

### Manual News Fetch

\`\`\`bash
# Set environment variables
export NEWS_API_KEY="your-newsapi-key"
export GEMINI_API_KEY="your-gemini-api-key"

# Fetch and rewrite news
npm run fetch-news
\`\`\`

## 📦 Deployment Guide

Cloudflare Pages is the recommended host for this repo now. The migration checklist and binding setup live in `CLOUDFLARE_MIGRATION.md`.

### Step 1: Push to GitHub

\`\`\`bash
# Initialize git
git init
git add .
git commit -m "Initial commit: trust me bro 🔥"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/trustmebro.git
git branch -M main
git push -u origin main
\`\`\`

### Step 2: Set Up Cloudflare Pages

1. Create a [Cloudflare Pages](https://pages.cloudflare.com/) project
2. Connect your GitHub account
3. Select the \`trustmebro\` repository
4. Use these build settings:
   - **Build command:** \`npm run build\`
   - **Build output directory:** \`dist\`
   - **Environment variable:** \`NODE_OPTIONS=--max-old-space-size=4096\`
5. Add the bindings and runtime variables from \`CLOUDFLARE_MIGRATION.md\`
6. Attach the custom domain \`trustmebro.pro\`

### Step 3: Configure GitHub Secrets

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| \`NEWS_API_KEY\` | Your NewsAPI key from [newsapi.org](https://newsapi.org/account) |
| \`GEMINI_API_KEY\` | Your primary Gemini API key |
| \`GEMINI_API_KEY_2\` | Optional backup Gemini API key |
| \`GROQ_API_KEY\` | API key for the article Q&A feature |

### Step 4: Enable GitHub Actions

1. Go to **Actions** tab in your GitHub repo
2. Click **"I understand my workflows, go ahead and enable them"**
3. The workflow will run automatically every 6 hours and push content updates to `main`
4. Cloudflare Pages will deploy automatically from those pushed commits
5. You can also trigger it manually: **Actions** → **Fetch News** → **Run workflow**

## 📁 Project Structure

\`\`\`
trustmebro/
├── src/
│   ├── components/      # Reusable components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── PostCard.astro
│   ├── content/
│   │   ├── config.ts    # Content schema
│   │   └── posts/       # MDX blog posts
│   ├── layouts/
│   │   └── Layout.astro # Base layout
│   ├── pages/
│   │   ├── index.astro  # Homepage
│   │   ├── search.astro # Search page
│   │   ├── categories.astro
│   │   ├── category/[category].astro
│   │   └── posts/[...slug].astro
│   └── styles/
│       └── global.css   # Tailwind + custom styles
├── scripts/
│   └── fetch-news.ts    # News fetcher + AI rewriter
├── .github/
│   └── workflows/
│       └── fetch-news.yml
├── functions/          # Cloudflare Pages Functions
├── cloudflare/
│   └── d1/schema.sql   # D1 schema for reactions/forms
├── astro.config.mjs
├── public/_headers
├── public/_redirects
├── public/_routes.json
└── package.json
\`\`\`

## 🎨 Customization

### Change Categories

Edit \`src/components/Header.astro\`:

\`\`\`javascript
const categories = [
  { name: 'Tech', emoji: '💻', slug: 'tech' },
  { name: 'Business', emoji: '💰', slug: 'business' },
  // Add more...
];
\`\`\`

### Modify AI Prompt

Edit \`scripts/fetch-news.ts\` and update the rewriting logic to change the writing style.

### Change Theme Colors

Edit \`src/styles/global.css\`:

\`\`\`css
@theme {
  --color-neon-pink: #ff6b9d;
  --color-neon-purple: #c678dd;
  --color-neon-cyan: #56b6c2;
  /* Change these values */
}
\`\`\`

## 🛠️ Tech Stack

- **[Astro](https://astro.build)** - Static site generator
- **[Tailwind CSS v4](https://tailwindcss.com)** - Styling
- **[MDX](https://mdxjs.com)** - Content format
- **Google Gemini / native rewrite logic** - Content rewriting
- **[NewsAPI](https://newsapi.org)** - News source
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Hosting
- **[GitHub Actions](https://github.com/features/actions)** - Automation

## 📝 Commands

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start dev server at \`localhost:4321\` |
| \`npm run build\` | Build production site to \`./dist/\` |
| \`npm run preview\` | Preview production build locally |
| \`npm run fetch-news\` | Fetch news and generate posts |

## 🤝 Contributing

PRs welcome! Feel free to:
- Add new features
- Fix bugs
- Improve the AI prompt
- Add new categories

## 📄 License

MIT - Do whatever you want with it, no cap.

---

Built with 💜 and way too much coffee ☕

**trust me bro** 🔥
