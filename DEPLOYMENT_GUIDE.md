# 🚀 Deployment Guide - Jaime Yan Portfolio

Your portfolio is **built and ready** to deploy! The production files are in the `dist/` folder.

## ✅ What's Been Done

- ✅ Portfolio website created with Astro + Tailwind CSS
- ✅ All sections built (Hero, About, Experience, Publications, Projects, Skills, Contact)
- ✅ Production build completed successfully
- ✅ Git repository initialized
- ✅ Ready for deployment

## 📤 3 Ways to Deploy (Choose One)

---

### Option 1: Vercel (Recommended - Easiest)

**Step 1:** Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

**Step 2:** Login to Vercel:
```bash
vercel login
```
Follow the prompts to authenticate in your browser.

**Step 3:** Deploy:
```bash
cd /Users/yanmingyu/Desktop/portfolio/portfolio
vercel --prod
```

That's it! Your portfolio will be live at a URL like: `https://your-project-name.vercel.app`

---

### Option 2: GitHub + Vercel (Best for long-term)

**Step 1:** Create a new repository on GitHub
- Go to https://github.com/new
- Name it: `portfolio` or `jaime-yan-portfolio`
- Don't initialize with README (we already have one)

**Step 2:** Push to GitHub:
```bash
cd /Users/yanmingyu/Desktop/portfolio/portfolio
git remote add origin https://github.com/yanmingyu92/portfolio.git
git push -u origin main
```

**Step 3:** Deploy on Vercel:
- Go to https://vercel.com/new
- Click "Import Project"
- Select your GitHub repository
- Click "Deploy"

**Benefits:** Automatic updates whenever you push to GitHub!

---

### Option 3: Drag & Drop (Fastest - One-time)

**Step 1:** Build is already done! The `dist/` folder is ready.

**Step 2:** Deploy:
- Go to https://vercel.com/new
- Select "Drag and Drop"
- Drag the entire `dist` folder to the upload area
- Wait for deployment to complete

**Note:** You'll need to rebuild and re-upload manually for updates.

---

## 🎯 After Deployment

### 1. Get Your URL
After deployment, Vercel will give you a URL like:
- `https://jaime-yan-portfolio.vercel.app`
- Or your custom domain if you set one up

### 2. Add to LinkedIn
1. Go to your LinkedIn profile
2. Click "Edit" in your introduction section
3. Add your portfolio URL to the "Website" field
4. Share in a post: "🎉 Just launched my professional portfolio showcasing my work in AI/LLM and clinical trial automation!"

### 3. Test Your Portfolio
- ✅ Check on mobile phone
- ✅ Check all publication links
- ✅ Verify contact links work
- ✅ Test smooth scrolling navigation

---

## 🔄 How to Update

### If using Vercel CLI:
```bash
# Make changes to files
git add .
git commit -m "Updated content"
vercel --prod
```

### If using GitHub + Vercel:
```bash
# Make changes to files
git add .
git commit -m "Updated content"
git push
# Vercel auto-deploys!
```

---

## 📝 Quick Reference

**Development server:**
```bash
cd /Users/yanmingyu/Desktop/portfolio/portfolio
npm run dev
# Open http://localhost:4321
```

**Build for production:**
```bash
npm run build
```

**Deploy to Vercel:**
```bash
vercel --prod
```

---

## 🎨 Customization Tips

Want to update content? Edit these files:

- **Hero section**: `src/components/Hero.astro`
- **About**: `src/components/About.astro`
- **Experience**: `src/components/Experience.astro`
- **Publications**: `src/components/Publications.astro`
- **Projects**: `src/components/Projects.astro`
- **Skills**: `src/components/Skills.astro`
- **Contact**: `src/components/Contact.astro`

After editing, rebuild and redeploy!

---

## 💡 Pro Tips

1. **Custom Domain**: Vercel provides free custom domains. Add your own domain in Vercel dashboard.
2. **Analytics**: Vercel has built-in analytics to track visitors.
3. **SEO**: The portfolio is already SEO-optimized with proper meta tags.
4. **Performance**: The site is highly optimized for fast loading (perfect for impressing recruiters!).

---

## 🆘 Need Help?

If you encounter issues:

1. **Vercel Docs**: https://vercel.com/docs
2. **Astro Docs**: https://docs.astro.build
3. **Check Vercel Dashboard**: https://vercel.com/dashboard

---

## 📊 Current Status

✅ **Local development**: Running at http://localhost:4321
✅ **Production build**: Complete (in `dist/` folder)
✅ **Git**: Initialized with initial commit
⏳ **Deployment**: Ready for your command!

**Next step**: Choose Option 1, 2, or 3 above to deploy! 🚀
