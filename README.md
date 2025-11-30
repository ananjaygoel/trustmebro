# 🔥 TrustMeBro - GenZ News Portal

An automated news portal that fetches trending news and rewrites it in Gen Z style using AI. Built with Astro, Tailwind CSS, and Claude AI.

![TrustMeBro](https://img.shields.io/badge/vibes-immaculate-ff69b4)
![Status](https://img.shields.io/badge/tea-piping%20hot-00ff9f)

## ✨ Features

- 🤖 **AI-Powered Rewriting** - News rewritten in Gen Z slang using Claude
- 🔄 **Auto Updates** - GitHub Actions fetches news every 6 hours
- 🌙 **Dark/Light Mode** - Toggle between themes
- 🔍 **Client-Side Search** - Fast, instant search
- 📱 **Fully Responsive** - Looks fire on all devices
- ⚡ **Lightning Fast** - Static site = blazing speed
- 🆓 **Free Hosting** - Deploy on Netlify for $0

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- A [NewsAPI](https://newsapi.org) account (free tier works)
- An [Anthropic](https://console.anthropic.com) API key

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
export ANTHROPIC_API_KEY="your-claude-api-key"

# Fetch and rewrite news
npm run fetch-news
\`\`\`

## 📦 Deployment Guide

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

### Step 2: Set Up Netlify

1. Go to [Netlify](https://netlify.com) and sign up/login
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub account
4. Select the \`trustmebro\` repository
5. Build settings (should auto-detect):
   - **Build command:** \`npm run build\`
   - **Publish directory:** \`dist\`
6. Click **"Deploy site"**

### Step 3: Get Netlify Credentials

1. Go to **Site settings** → **General** → Copy your **Site ID**
2. Go to **User settings** → **Applications** → **Personal access tokens**
3. Click **"New access token"**, name it \`github-actions\`, and copy the token

### Step 4: Configure GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| \`NEWS_API_KEY\` | Your NewsAPI key from [newsapi.org](https://newsapi.org/account) |
| \`ANTHROPIC_API_KEY\` | Your Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| \`NETLIFY_AUTH_TOKEN\` | Personal access token from Netlify |
| \`NETLIFY_SITE_ID\` | Your site ID from Netlify |

### Step 5: Enable GitHub Actions

1. Go to **Actions** tab in your GitHub repo
2. Click **"I understand my workflows, go ahead and enable them"**
3. The workflow will run automatically every 6 hours
4. You can also trigger it manually: **Actions** → **Fetch News** → **Run workflow**

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
├── astro.config.mjs
├── netlify.toml
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

Edit \`scripts/fetch-news.ts\` and update the prompt in the \`rewriteWithClaude\` function to change the writing style.

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
- **[Claude AI](https://anthropic.com)** - Content rewriting
- **[NewsAPI](https://newsapi.org)** - News source
- **[Netlify](https://netlify.com)** - Hosting
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
