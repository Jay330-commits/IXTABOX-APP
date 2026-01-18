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

# Google Maps API Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
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

## How to Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs:
   - Go to **APIs & Services > Library**
   - Enable **Maps JavaScript API**
   - Enable **Places API** (if using place autocomplete/search)
4. Create an API key:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > API Key**
   - Copy the API key
5. Configure API key restrictions (recommended for production):
   - Click on the API key to edit it
   - Under **API restrictions**, select "Restrict key" and enable:
     - Maps JavaScript API
     - Places API (if using)
   - Under **Application restrictions**, select "HTTP referrers" and add:
     - `http://localhost:3000/*` (for development)
     - Your production domain (e.g., `https://yourdomain.com/*`)
6. **Enable billing**: Google Maps requires billing to be enabled (even for free tier usage)
   - Go to **Billing** in Google Cloud Console
   - Link a billing account to your project
7. Add the API key to your `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

### Important Notes About Google Maps API Key

- **Security**: The API key is exposed to the client (starts with `NEXT_PUBLIC_`), so use HTTP referrer restrictions
- **Billing**: Billing must be enabled even for free tier usage ($200 credit per month)
- **Quota**: Monitor usage in Google Cloud Console to avoid unexpected charges
- **Required APIs**: Make sure Maps JavaScript API and Places API are enabled

## After Setting Up Environment Variables

1. **Restart your development server**: `npm run dev` (environment variables are loaded at startup)
2. The registration and maps should now work properly

## Troubleshooting Google Maps API

If Google Maps is not working, check the following:

1. **Check browser console** for specific error messages:
   - `MissingKeyMapError` - API key is missing or empty
   - `ApiNotActivatedMapError` - Maps JavaScript API not enabled
   - `RefererNotAllowedMapError` - Domain not allowed in API key restrictions
   - `BillingNotEnabledMapError` - Billing not enabled

2. **Verify API key in environment**:
   - Check `.env.local` file exists in project root
   - Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly
   - Restart the dev server after adding/updating the key

3. **Check Google Cloud Console**:
   - API key exists and is not disabled
   - Maps JavaScript API is enabled
   - Places API is enabled (if using place features)
   - Billing account is linked to the project
   - API key restrictions allow your domain (for production)

4. **Common issues**:
   - **Key not working after adding**: Restart dev server (`npm run dev`)
   - **Works locally but not in production**: Check HTTP referrer restrictions include your domain
   - **Map shows "for development purposes only"**: Billing not enabled or quota exceeded

## Troubleshooting General Issues

If you're still getting errors:
1. Check the browser console for detailed error messages
2. Check the terminal where you're running `npm run dev` for server-side errors
3. Make sure all environment variables are correctly set
4. Ensure your Supabase project is active and accessible
5. For Google Maps: Check the error message in the map component UI for specific issues