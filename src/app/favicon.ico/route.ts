import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// This route serves the favicon.ico file for Google search results
// Google expects favicon.ico at the root level
export async function GET() {
  try {
    const iconPath = path.join(process.cwd(), 'public', 'images', 'logo', 'titleicon.webp');
    
    if (fs.existsSync(iconPath)) {
      const fileBuffer = fs.readFileSync(iconPath);
      // Serve as webp (modern browsers support it, and Google can handle it)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Disposition': 'inline; filename="favicon.ico"',
        },
      });
    }
    
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error('Error serving favicon.ico:', error);
    return new NextResponse(null, { status: 500 });
  }
}
