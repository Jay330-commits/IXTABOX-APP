import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// This route serves the favicon.ico file for Google search results
// Google expects favicon.ico at the root level and will use this for search results
export async function GET() {
  try {
    const iconPath = path.join(process.cwd(), 'public', 'images', 'logo', 'titleicon.webp');
    
    if (fs.existsSync(iconPath)) {
      const fileBuffer = fs.readFileSync(iconPath);
      // Serve as webp with proper headers for Google recognition
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Disposition': 'inline; filename="favicon.ico"',
          // Important: Tell Google this is the site icon
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error('Error serving favicon.ico:', error);
    return new NextResponse(null, { status: 500 });
  }
}
