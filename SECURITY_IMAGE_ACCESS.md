# Security Analysis: Image Access Control

## Current Implementation

### ✅ Security Measures in Place

1. **Authentication Verification**
   - All API routes verify user authentication before processing requests
   - `getCurrentUser()` is called first to ensure user is authenticated
   - Unauthenticated requests are rejected with 401 Unauthorized

2. **Permission Verification**
   - **Customer Bookings API**: Only returns bookings where `payment.user_id === currentUser.id`
   - **Distributor Dashboard**: Only returns bookings for locations where `location.distributor_id === distributor.id`
   - **Guest Bookings**: Requires both email AND charge_id to match (double verification)

3. **Access Token Security**
   - Access tokens are extracted server-side only (from cookies or Authorization header)
   - **Tokens are NEVER sent to the client** - only used server-side to generate signed URLs
   - Signed URLs are temporary (expire after 1 hour)
   - The access token itself is never exposed in API responses

4. **Path Validation**
   - Image paths are validated against expected format: `box_(front_view|back_view|closed_stand_view)/uuid-timestamp.jpg`
   - Prevents path traversal attacks
   - Invalid paths are rejected and return `null`

5. **Private Bucket**
   - `box_returns` bucket is private (not public)
   - All access requires signed URLs
   - Public URLs are explicitly rejected and filtered out

## How It Works

### For Authenticated Users (Customers & Distributors)

1. **Request Flow:**
   ```
   Client → API Route → getCurrentUser() → Verify Authentication
   → Extract access token from cookies/headers (server-side only)
   → Query database for authorized bookings only
   → Generate signed URLs using user's access token (server-side)
   → Return signed URLs to client (tokens never exposed)
   ```

2. **Access Token Extraction:**
   - Extracted from Supabase cookies (`sb-{project-ref}-auth-token`)
   - Or from Authorization header (`Bearer {token}`)
   - **Never sent to client** - only used server-side

3. **Signed URL Generation:**
   ```typescript
   // Server-side only - accessToken never leaves server
   const signedUrl = await getSupabaseStorageSignedUrl(
     'box_returns', 
     cleanPath, 
     3600, // expires in 1 hour
     accessToken // user's token (server-side only)
   );
   ```

4. **Security Guarantees:**
   - ✅ User must be authenticated to get signed URLs
   - ✅ User can only see images for bookings they own/have access to
   - ✅ Access token is never exposed to client
   - ✅ Signed URLs expire after 1 hour
   - ✅ Path validation prevents traversal attacks

### For Guest Users

- Guest bookings use service role key (no access token available)
- Still requires email + charge_id verification
- Same path validation and security measures apply

## Security Questions Answered

### Q: Can any authenticated user view any images?

**Answer: NO** ✅
- Users can only see images for bookings they're authorized to view
- Customer API only returns bookings where `payment.user_id === currentUser.id`
- Distributor API only returns bookings for their locations
- Guest API requires email + charge_id match
- Even if a user tries to manipulate requests, they can only get URLs for authorized bookings

### Q: Can clients manipulate the token to look for more pictures?

**Answer: NO** ✅
- Access tokens are extracted server-side from cookies/headers
- Tokens are **never sent to the client** in API responses
- Clients only receive signed URLs (temporary, expire in 1 hour)
- Even if a client intercepts/modifies requests, they can only access bookings they're authorized to view
- The API checks ownership/permissions before generating any signed URLs

### Q: What if someone gets a signed URL?

**Answer: Limited Risk** ⚠️
- Signed URLs expire after 1 hour
- URLs are only generated for authorized bookings
- If someone intercepts a URL, they can only access that specific image
- They cannot use it to discover other images (would need to know exact paths)
- Path validation prevents traversal attacks

## Security Layers

1. **Authentication Layer**: Verify user is authenticated
2. **Authorization Layer**: Verify user has permission to view the booking
3. **Path Validation Layer**: Ensure image paths are legitimate
4. **Token Security Layer**: Access tokens never exposed to client
5. **Temporary Access Layer**: Signed URLs expire after 1 hour

## Best Practices Followed

✅ **Principle of Least Privilege**: Users only get URLs for bookings they own/have access to  
✅ **Server-Side Token Handling**: Access tokens never sent to client  
✅ **Defense in Depth**: Multiple security layers (auth, authorization, validation)  
✅ **Temporary Access**: Signed URLs expire quickly (1 hour)  
✅ **Input Validation**: Path validation prevents traversal attacks  
✅ **Private Storage**: Bucket is private, requires signed URLs  

## Why Use User Access Tokens Instead of Service Role Key?

1. **Respects Supabase RLS Policies**: User tokens respect Row Level Security policies
2. **No Service Role Key Required**: Works without needing `SUPABASE_SERVICE_ROLE_KEY`
3. **Still Secure**: Tokens are server-side only, never exposed to client
4. **Permission-Based**: Each user's token only grants access to their authorized resources

## Summary

The implementation is secure:
- ✅ Users can only see images for bookings they're authorized to view
- ✅ No token manipulation possible (access tokens are server-side only)
- ✅ Path validation prevents path traversal attacks
- ✅ Permission checks ensure users only get URLs for their own data
- ✅ Signed URLs are temporary and expire after 1 hour
- ✅ Access tokens are never sent to the client
