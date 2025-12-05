# 🌸 MomsCare - AI-Powered Pregnancy Care Platform

A complete web application for pregnant mothers featuring AI chatbot assistance, doctor consultations, prescription management, and health tracking.

## 🚀 Features

- **AI Chatbot**: Personalized AI assistant using Groq API for pregnancy-related questions
- **Mother System**: Register, track progress, upload prescriptions, ask questions to doctors
- **Doctor System**: Answer questions from mothers, view profiles and prescriptions
- **Admin System**: Approve/reject doctors, view analytics
- **Cloudflare R2 Storage**: Secure file storage for prescriptions (PDF/JPG/PNG)

## 📋 Prerequisites

- Node.js 18+ and npm
- Groq API key ([Get one here](https://console.groq.com/))
- Cloudflare R2 account ([Setup guide](https://developers.cloudflare.com/r2/))
- Netlify account (for deployment)

## 🔧 Environment Variables

**You need to set these environment variables in Netlify:**

1. Go to your Netlify site dashboard
2. Navigate to: **Site settings > Environment variables**
3. Add the following variables:

### Required Variables:

```bash
# JWT Secret - Generate a secure random string (at least 32 characters)
# Generate using: openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_JWT_SECRET=your-generated-secret-key-here

# Groq API Key - Get from https://console.groq.com/
GROQ_API_KEY=your-groq-api-key

# Cloudflare R2 Credentials - Get from Cloudflare Dashboard > R2
CF_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CF_R2_BUCKET=your-bucket-name
CF_ACCESS_KEY_ID=your-r2-access-key-id
CF_SECRET_ACCESS_KEY=your-r2-secret-access-key

# Admin Credentials (for admin login)
ADMIN_EMAIL=admin@momscare.com
ADMIN_PASSWORD=your-secure-admin-password
```

### How to Generate AUTH_JWT_SECRET:

**Option 1: Using OpenSSL (Mac/Linux)**
```bash
openssl rand -base64 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Using PowerShell (Windows)**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Option 4: Online Generator**
Visit: https://randomkeygen.com/ and use a "CodeIgniter Encryption Keys" (256-bit)

## 🏃 Local Development

1. **Clone the repository**
```bash
git clone https://github.com/dev-fuadhasan/buildathon.git
cd buildathon
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env.local` file** (for local development)
```bash
# Copy the environment variables above into .env.local
```

4. **Run development server**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)**

## 📦 Build

```bash
npm run build
```

## 🚢 Deploy to Netlify

1. **Connect GitHub repository** to Netlify
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "Add new site" > "Import an existing project"
   - Connect to GitHub and select `dev-fuadhasan/buildathon`

2. **Set environment variables** (see above)

3. **Build settings** (auto-configured via `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Plugin: `@netlify/plugin-nextjs` (auto-installed)

4. **Deploy!** Netlify will automatically deploy on every push to main branch.

## 📁 Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── mother/       # Mother endpoints
│   │   ├── doctor/       # Doctor endpoints
│   │   ├── admin/        # Admin endpoints
│   │   └── chat/         # AI chat endpoint
│   ├── mother/           # Mother pages
│   ├── doctor/           # Doctor pages
│   ├── admin/            # Admin pages
│   └── chat/             # Chat page
├── components/           # React components
├── lib/                  # Utility libraries
│   ├── auth.ts          # JWT authentication
│   ├── groqClient.ts    # Groq API client
│   ├── r2Client.ts      # Cloudflare R2 client
│   └── momsCareChat.ts  # AI chat logic
└── netlify.toml          # Netlify configuration
```

## 🔐 Security Notes

- All secrets are read from environment variables only (never hardcoded)
- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Admin credentials are set via environment variables
- All API routes validate authentication

## 📝 License

Private project - All rights reserved
