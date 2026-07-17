# DocuChat AI

An AI-powered document assistant that enables users to upload PDF, Markdown, and TXT documents and interact with them through natural language conversations.

The application combines Retrieval-Augmented Generation (RAG), LangChain, Google Gemini, and Supabase to generate context-aware responses grounded in uploaded documents.

## Features

- AI-powered document question answering
- Upload and chat with PDF, Markdown, and TXT files
- Retrieval-Augmented Generation (RAG)
- Semantic document search using vector embeddings
- Google Gemini integration
- LangChain tool-calling agent
- Secure authentication with Supabase
- Persistent chat history
- Responsive modern UI built with Next.js
- Real-time streaming AI responses

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Supabase
- LangChain
- Google Gemini API
- PostgreSQL
- Tailwind CSS

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd docuchat-ai
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file and add the required environment variables.

Start the development server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
OPENAI_MODEL=gemini-2.5-flash
```

## Deployment

The project can be deployed on Vercel.

Configure the required environment variables in the Vercel Project Settings.

## License

MIT License

Copyright © 2026 Anushka Singh