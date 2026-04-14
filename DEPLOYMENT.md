# Vercel Deployment Checklist

## ✅ Code Quality
- [x] No TypeScript errors
- [x] No ESLint warnings
- [x] No hydration mismatches
- [x] Production build successful
- [x] All API routes properly configured

## 🔐 Required Environment Variables (Set in Vercel)

Add these to your Vercel project settings:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Keys
OPENAI_API_KEY=your_gemini_api_key  (or GEMINI_API_KEY)

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 🗄️ Database Setup (Supabase)

Run these migrations in your Supabase SQL editor:

```sql
-- Execute these migration files in order:
1. supabase/migrations/20260410_create_profiles.sql
2. supabase/migrations/20260410_create_uploaded_files.sql
3. supabase/migrations/20260411_add_system_prompt_to_profiles.sql
4. supabase/migrations/20260411_create_chat_history.sql
5. supabase/migrations/20260411_create_rag_documents.sql  ← Important for RAG features
```

## 🌐 OAuth Configuration (Google)

1. Go to Google Cloud Console
2. Create OAuth 2.0 Credentials (Web application)
3. Add Redirect URI:
   ```
   https://your-domain.vercel.app/auth/callback
   ```
4. Update Supabase Auth settings with Client ID and Secret

## 📦 Deployment Steps

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Add Environment Variables in Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add all required vars from section above

3. **Set Production Domain**
   - Go to Domains settings
   - Add your custom domain (if using one)
   - Update `NEXT_PUBLIC_APP_URL` to match

4. **Deploy:**
   ```bash
   vercel deploy --prod
   ```

## ✨ Features Ready

- ✅ Real-time date and time queries
- ✅ Weather lookup by location (free API)
- ✅ File upload and chat (Markdown, Text)
- ✅ Conversation history
- ✅ Google OAuth authentication
- ✅ System prompt customization
- ✅ Theme switcher (dark/light/auto)
- ✅ Random suggestion prompts on every chat
- ✅ ChatGPT-style UI design

## 🐛 Known Limitations

- **Vector RAG indexing**: Only works after running migration #5
- **File Q&A fallback**: Uses keyword/embedding ranking if vector table missing
- **Weather API**: Open-Meteo (free, no auth needed)

## 🚀 Post-Deployment

1. Test OAuth flow (sign in with Google)
2. Upload a test `.md` or `.txt` file
3. Ask: "What is the current date and time?"
4. Ask: "What's the weather in [city]?"
5. Ask a question about the uploaded file

## 📝 Notes

- Hydration issues fixed (random prompts only generated client-side)
- All routes protected with Supabase auth (except /login and /)
- Middleware handles session refresh automatically
- API key fallback: tries GEMINI_API_KEY or OPENAI_API_KEY
