# Netlify Deployment Guide

This guide covers deploying TarotForge to Netlify using npm scripts and Netlify CLI.

## Prerequisites

1. **Node.js 22.16.0+ (LTS)** - The project requires Node.js version 22.16.0 or higher
2. **npm 10+** - Latest npm version
3. Install dependencies: `npm install`
4. Have a Netlify account
5. Netlify CLI will be installed locally as a dev dependency

## Node.js Version Management

This project uses Node.js 22.16.0 (LTS). If you have multiple Node.js versions:

### Using nvm (recommended)
```bash
# Install and use Node.js 22.16.0 LTS
nvm install 22.16.0
nvm use 22.16.0

# Or if you have .nvmrc support
nvm use
```

### Using nodenv
```bash
# The .node-version file will automatically set the version
nodenv install 22.16.0
```

## Quick Start

### First Time Setup
```bash
# Login to Netlify
npm run netlify:login

# Initialize/link your project to Netlify
npm run setup
```

### Deploy to Production
```bash
# This will lint, build, and deploy to production
npm run deploy
```

### Deploy Preview (for testing)
```bash
# Deploy a preview version
npm run deploy:preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | Initialize Netlify project (first time only) |
| `npm run deploy` | Deploy to production (includes linting & building) |
| `npm run deploy:preview` | Deploy preview version |
| `npm run netlify:dev` | Start local development with Netlify functions |
| `npm run netlify:status` | Check current site status |
| `npm run netlify:login` | Login to Netlify |

## How it Works

- `predeploy` script automatically runs before `deploy` to lint and build
- `netlify.toml` configures build settings and redirects
- Environment variables can be set in Netlify dashboard

## Environment Variables

Set environment variables in your Netlify site dashboard:

1. Go to Site settings > Environment variables
2. Add variables like:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Any other `VITE_` prefixed variables your app needs

## Automatic Deployments

For automatic deployments on git push:

1. Connect your repository in Netlify dashboard
2. Build settings are already configured in `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

## Troubleshooting

### First deployment
```bash
npm run netlify:login
npm run setup
npm run deploy
```

### Build fails locally
```bash
npm run build
```

### Check deployment status
```bash
npm run netlify:status
```

### Re-link to different site
```bash
npm run setup
``` 