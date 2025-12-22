# Bucket Images Debug Guide

## Problem
Images uploaded to Supabase Storage bucket `box_returns` are not visible on the customer page.

## How Images Are Stored

1. **Upload Process** (`src/app/api/bookings/[bookingId]/return/route.ts`):
   - Images are uploaded to paths like: `box_front_view/{bookingId}-{timestamp}.jpg`
   - The `uploadToSupabaseStorage` function returns: `{ url: publicUrl, path: data.path }`
   - The **full public URL** is stored in the database in `box_returns` table

2. **Database Storage** (`box_returns` table):
   - `box_front_view`: String (VarChar 500) - stores the full URL
   - `box_back_view`: String (VarChar 500) - stores the full URL  
   - `closed_stand_lock`: String (VarChar 500) - stores the full URL

3. **Retrieval Process** (`src/app/api/customer/bookings/route.ts`):
   - Fetches `box_returns` data with bookings
   - Converts paths to public URLs if needed using `getSupabaseStoragePublicUrl`
   - Returns URLs to frontend

## Possible Issues

### 1. Bucket Not Public (MOST LIKELY)
The `box_returns` bucket must be **public** for public URLs to work.

**Check in Supabase Dashboard:**
- Go to Storage → `box_returns` bucket
- Check if "Public bucket" is enabled
- If not, enable it

### 2. RLS Policies Blocking Access
Even if bucket is public, RLS policies might block access.

**Check in Supabase Dashboard:**
- Go to Storage → `box_returns` → Policies
- Ensure there's a policy allowing SELECT for public access

### 3. URL Format Issue
The stored URL might be incorrect.

**Check database:**
```sql
SELECT 
  booking_id,
  box_front_view,
  box_back_view,
  closed_stand_lock
FROM box_returns
LIMIT 5;
```

Expected format: `https://{project}.supabase.co/storage/v1/object/public/box_returns/box_front_view/{bookingId}-{timestamp}.jpg`

### 4. CORS Issues
Browser might be blocking cross-origin image requests.

**Check browser console for CORS errors**

## Debug Steps

1. **Check what's stored in database:**
   - Run the SQL query above
   - Verify URLs are full URLs starting with `https://`

2. **Check browser console:**
   - Open customer page
   - Open browser DevTools → Console
   - Look for image loading errors
   - Check Network tab for failed image requests

3. **Check Supabase Storage:**
   - Go to Supabase Dashboard → Storage → `box_returns`
   - Verify files exist in folders: `box_front_view/`, `box_back_view/`, `closed_stand_view/`
   - Try accessing a file URL directly in browser

4. **Check API response:**
   - Open Network tab in browser
   - Call `/api/customer/bookings`
   - Check the response - look for `boxFrontView`, `boxBackView`, `closedStandLock` fields
   - Verify URLs are correct

## Solution

### If Bucket is Not Public:
1. Go to Supabase Dashboard → Storage
2. Find `box_returns` bucket
3. Click on bucket settings
4. Enable "Public bucket" toggle
5. Save

### If RLS Policies are Blocking:
Create a policy in Supabase Dashboard:
- Storage → `box_returns` → Policies
- Add policy: Allow SELECT for public (or authenticated users)

### Alternative: Use Signed URLs
If bucket must remain private, we need to generate signed URLs instead of public URLs.

## Current Code Flow

1. Upload: `uploadToSupabaseStorage()` → returns `{ url: publicUrl, path: path }`
2. Store: `box_returns.box_front_view = photoUrls.boxFrontView` (full URL)
3. Retrieve: Check if starts with 'http', if not convert using `getSupabaseStoragePublicUrl()`
4. Display: Use `<img src={url}>` in BookingsSection

## Logging Added

- Upload logging in `src/app/api/bookings/[bookingId]/return/route.ts`
- Retrieval logging in `src/app/api/customer/bookings/route.ts`
- Error handling in `src/components/customers/BookingsSection.tsx`

Check server logs and browser console for these messages.


