# Supabase Backend Setup Guide

This guide explains how to connect your Supabase backend from the GitHub repository to this project.

## 1. Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project settings: https://app.supabase.com/project/_/settings/api

## 2. Database Schema

Your Supabase database needs a `users` table with the following structure:

```sql
-- Create users table
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'starter', 'pro')),
  credits integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Create function to handle new user signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, subscription_tier, credits)
  values (new.id, new.email, 'free', 100);
  return new;
end;
$$;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 3. Authentication Settings

In your Supabase dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your application URL (e.g., `http://localhost:5173` for development)
3. Add your application URL to **Redirect URLs**

## 4. Email Templates (Optional)

Disable email confirmation for faster development:

1. Go to **Authentication** → **Email Templates**
2. Disable "Confirm email" requirement

Or customize the email templates to match your branding.

## 5. Integration from GitHub Repository

If you have additional tables, edge functions, or configurations from your GitHub repository:

### Tables
Copy any additional table schemas from your Supabase SQL editor or migration files.

### Edge Functions
Edge functions from your GitHub repository need to be adapted to work with Lovable's structure. Contact support if you need help migrating complex edge functions.

### N8N Webhooks
If you use n8n for automation:
1. Copy your n8n workflow configurations
2. Update webhook URLs to point to your new Supabase edge functions
3. Store any required API keys in Supabase secrets

## 6. Testing Authentication

1. Start your development server: `npm run dev`
2. Try sending a message in the chat
3. The authentication dialog should appear
4. Sign up with an email and password
5. Check your Supabase dashboard to confirm the user was created

## Architecture Overview

### Authentication Flow
- **Unauthenticated users**: Can view the chat interface
- **Sending messages**: Triggers authentication dialog
- **After login**: Full access to AI chat features
- **Session persistence**: Uses Supabase Auth with localStorage

### User Tiers
- **Free**: Limited credits
- **Starter** ($29/month): Regular features
- **Pro** ($99/month): Premium AI tools (Image Ad Generator, AI Hooks, Documentation)

## Need Help?

If you encounter issues integrating your GitHub repository's backend:
1. Check the Supabase logs for errors
2. Verify environment variables are set correctly
3. Ensure database tables match the required schema
4. Review the browser console for authentication errors
