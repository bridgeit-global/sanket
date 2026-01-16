<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template ships with [Anthropic](https://anthropic.com) Claude Sonnet 4 (`claude-sonnet-4-20250514`) as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [xAI](https://x.ai), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Session Management

### Session Expiry

User sessions are configured to expire after 8 hours. After expiry, users will be automatically redirected to the login page.

### Resetting All Active Sessions

To invalidate all active user sessions and force all users to log in again, you have two options:

#### Option 1: Using AUTH_SESSION_EPOCH (Recommended)

Set the `AUTH_SESSION_EPOCH` environment variable to a Unix timestamp (in seconds). All tokens issued before this timestamp will be invalidated.

```bash
# Set epoch to current time (Unix timestamp in seconds)
export AUTH_SESSION_EPOCH=$(date +%s)

# Or set a specific timestamp
export AUTH_SESSION_EPOCH=1704067200
```

After setting this variable and restarting the application, all existing sessions will be invalidated and users will be prompted to log in again.

#### Option 2: Rotating AUTH_SECRET

You can also rotate the `AUTH_SECRET` environment variable. This will invalidate all existing sessions, as tokens are signed with the secret. Users will need to log in again after the secret is changed.

### Resetting Sessions on Vercel (Production)

To reset all active sessions in your production deployment on Vercel:

#### Using AUTH_SESSION_EPOCH (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add or update the `AUTH_SESSION_EPOCH` environment variable:
   - **Key**: `AUTH_SESSION_EPOCH`
   - **Value**: Current Unix timestamp in seconds (you can get this with `date +%s` in your terminal)
   - **Environment**: Select **Production** (and optionally **Preview** and **Development** if needed)
5. Save the environment variable
6. Vercel will automatically redeploy your application with the new environment variable

After the redeployment completes, all existing sessions will be invalidated and users will be prompted to log in again.

**To allow normal session creation again**: Remove or delete the `AUTH_SESSION_EPOCH` environment variable from Vercel settings, and redeploy.

#### Using AUTH_SECRET Rotation

1. Generate a new secret (you can use: `openssl rand -base64 32`)
2. Update `AUTH_SECRET` in Vercel **Settings** → **Environment Variables**
3. Save and redeploy

> **Note**: After resetting sessions, you may want to remove `AUTH_SESSION_EPOCH` (or delete it from your environment variables) to allow normal session creation going forward. The epoch check only affects tokens issued before the epoch time.
