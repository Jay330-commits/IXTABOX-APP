# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
DATABASE_URL=your_database_connection_string

# Igloo Lock Configuration (for PIN generation)
# Note: IGLOO_DEVICE_ID is optional (has default), device IDs are dynamic and can be stored per stand
IGLOO_CLIENT_ID=your_igloo_client_id
IGLOO_CLIENT_SECRET=your_igloo_client_secret
IGLOO_DEVICE_ID=your_igloo_device_id  # Optional, defaults to SP2X24ec23e1
```

## How to Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or select an existing one
3. Go to Settings > API
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret! Never expose it in client-side code)
5. Paste them into your `.env.local` file

### Important Notes About Service Role Key

- **Security**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS) policies
- **Usage**: Only use it in server-side code (API routes, server components, services)
- **Purpose**: Required for:
  - Generating signed URLs for storage buckets (allows distributors to view customer-uploaded images)
  - Server-side operations that need to bypass RLS
  - Administrative operations
- **Never expose**: Never use this key in client-side code or expose it in the browser

## Database Setup

1. In your Supabase project, go to Settings > Database
2. Copy the connection string
3. Replace `[YOUR-PASSWORD]` with your actual database password
4. **Important**: If SSL is required (which Supabase enforces), ensure your connection string includes SSL parameters:
   - The connection string should end with `?sslmode=require` or similar
   - Example: `postgresql://user:password@host:port/database?sslmode=require`
   - The code will automatically configure SSL for Supabase connections, but the connection string should also include SSL parameters
5. Paste it as the `DATABASE_URL` in your `.env.local` file

## After Setting Up Environment Variables

1. Restart your development server: `npm run dev`
2. The registration should now work properly

## Troubleshooting

If you're still getting errors:
1. Check the browser console for detailed error messages
2. Check the terminal where you're running `npm run dev` for server-side errors
3. Make sure all environment variables are correctly set
4. Ensure your Supabase project is active and accessible
