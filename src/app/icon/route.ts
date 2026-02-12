import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Serve the webp icon - Next.js will handle caching
    const iconPath = path.join(process.cwd(), 'public', 'images', 'logo', 'titleicon.webp');
    
    if (fs.existsSync(iconPath)) {
      const fileBuffer = fs.readFileSync(iconPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error('Error serving icon:', error);
    return new NextResponse(null, { status: 500 });
  }
}
