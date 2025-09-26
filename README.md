# Blood donation platform

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/seiyonixai-5163s-projects/v0-blood-donation-platform)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/Vg7vN707Sje)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Getting Started

To run this project locally, you need to set up your environment variables.

### 1. Create Environment File

Copy the example file `.env.example` to a new file named `.env`. This file will hold your secret credentials and is ignored by Git.

```bash
cp .env.example .env
```

### 2. Set Database URL

You need to add your Supabase database connection string to the `.env` file.

- Log in to your [Supabase account](https://supabase.com/).
- Navigate to your project's settings: **Project Settings > Database**.
- Under the **Connection string** section, find the URI for the **Connection Pooler**. This is the recommended URL for serverless environments like Vercel as it prevents connection exhaustion.
- Paste this full connection string as the value for `DATABASE_URL` in your `.env` file.

Your `.env` file should look like this:
```
DATABASE_URL="postgres://postgres.pbqshvketxyflbvqpmvp:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
```

### 3. Install Dependencies

This project uses `pnpm` for package management.

```bash
pnpm install
```

### 4. Run the Development Server

```bash
pnpm run dev
```

## Deployment

Your project is live at:

**[https://vercel.com/seiyonixai-5163s-projects/v0-blood-donation-platform](https://vercel.com/seiyonixai-5163s-projects/v0-blood-donation-platform)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/Vg7vN707Sje](https://v0.app/chat/projects/Vg7vN707Sje)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
