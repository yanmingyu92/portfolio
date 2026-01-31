# Jaime Yan - Professional Portfolio

Personal portfolio website showcasing experience, publications, and projects in statistical programming, AI/LLM research, and clinical trials automation.

## 🚀 Live Preview

View the portfolio locally at: http://localhost:4321/

## 📦 Tech Stack

- **Astro** - Modern static site generator
- **Tailwind CSS** - Utility-first CSS framework
- **Vercel** - Deployment platform (free hosting)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📤 Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to deploy your portfolio

### Option 2: Deploy via GitHub + Vercel

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial portfolio"
git branch -M main
git remote add origin https://github.com/yanmingyu92/portfolio.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Click "Deploy"

### Option 3: Drag & Drop

1. Build the project:
```bash
npm run build
```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Drag the `dist` folder to deploy

## ✨ Features

- **Hero Section**: Professional introduction with quick links
- **About**: Background and research focus
- **Experience**: Professional history and current roles
- **Publications**: 12+ papers across medRxiv, TechRxiv, and conferences
- **Projects**: Showcase of innovative work including:
  - Compliance Email Analysis System
  - ClinAgent autonomous architecture
  - LLM code generation pipelines
  - Knowledge graph data queries
- **Skills**: Comprehensive technical skills overview
- **Contact**: Easy ways to connect

## 🎨 Customization

Edit the content in `src/components/` to update:
- Personal information in `Hero.astro`
- About text in `About.astro`
- Experience in `Experience.astro`
- Publications in `Publications.astro`
- Projects in `Projects.astro`
- Skills in `Skills.astro`
- Contact links in `Contact.astro`

## 📱 Responsive Design

The portfolio is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🔗 Share on LinkedIn

After deployment, share your portfolio URL on LinkedIn:
1. Go to your LinkedIn profile
2. Click "Edit" intro section
3. Add your portfolio website URL to the "Website" field
4. Share in posts or messages

## 📄 License

© 2025 Jaime Yan. All rights reserved.
