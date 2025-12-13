# MomsCare - AI-Powered Pregnancy Care Platform

**24/7 AI-powered pregnancy support platform** with intelligent AI assistance, doctor consultations, prescription management, and health tracking.

## 🚀 Features

- **24/7 AI Chatbot**: Instant, personalized pregnancy guidance
- **Multi-language Support**: English, Bangla, and Banglish
- **Health Tracking**: Profile management, prescription storage, daily journaling
- **Healthcare Professional Integration**: Doctor and nurse dashboards
- **Image Analysis**: AI-powered prescription and health photo analysis

## 📋 Prerequisites

- Node.js 18+ and npm
- Groq API key
- Cloudflare R2 account
- Netlify account (for deployment)

## 🔧 Environment Variables

Set these in Netlify or `.env.local`:

```bash
AUTH_JWT_SECRET=your-generated-secret-key
GROQ_API_KEY=your-groq-api-key
CF_R2_ENDPOINT=your-r2-endpoint
CF_R2_BUCKET=your-bucket-name
CF_ACCESS_KEY_ID=your-access-key
CF_SECRET_ACCESS_KEY=your-secret-key
ADMIN_EMAIL=admin@momscare.com
ADMIN_PASSWORD=your-secure-password
RESEND_API_KEY=your-resend-api-key
```

## 🏃 Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📦 Build

```bash
npm run build
```

## 🚢 Deploy

Deploy to Netlify with the environment variables configured above.

## 📝 License

Private project - All rights reserved
