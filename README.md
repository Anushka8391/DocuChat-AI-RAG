# AgenticRAG

AgenticRAG is a Next.js app for AI chat with:
- File-grounded answers for .md and .txt uploads
- Live tools (current date/time and weather)
- Supabase auth and chat persistence
- A clean ChatGPT-style interface

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Supabase (auth, storage, database)
- LangChain + Gemini

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Add environment variables in .env.local:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

4. Start the app:

```bash
npm run dev
```

5. Open http://localhost:3000

## Build and Quality Checks

Run before deployment:

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare production deployment"
git push
```

### 2. Import project in Vercel

- Go to Vercel dashboard
- Import this repository
- Framework preset: Next.js (auto-detected)

### 3. Configure Vercel environment variables

Add these in Project Settings > Environment Variables:

- NEXT_PUBLIC_APP_URL = https://agentic-rag-gules.vercel.app
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- GEMINI_API_KEY (or OPENAI_API_KEY)
- GEMINI_MODEL (optional, default can be used)

### 4. Configure Supabase + OAuth

- In Supabase Auth, configure Google OAuth provider
- Add callback URL:
  - https://agentic-rag-gules.vercel.app/auth/callback

### 5. Run database migrations

Execute SQL migrations from:
- supabase/migrations/20260410_create_profiles.sql
- supabase/migrations/20260410_create_uploaded_files.sql
- supabase/migrations/20260411_add_system_prompt_to_profiles.sql
- supabase/migrations/20260411_create_chat_history.sql
- supabase/migrations/20260411_create_rag_documents.sql

### 6. Deploy

You can deploy from the Vercel UI, or CLI:

```bash
npx vercel deploy --prod
```

## Deployment Notes

- If chat history is not saving, ensure chat history migration is applied.
- If vector search is empty, ensure rag documents migration is applied.
- Weather tool requires location text in the question.

## License

MIT License

Copyright (c) 2026 Srivans Katriyar
