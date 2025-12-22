import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Extract params to satisfy route signature

    // Try to get pricing from platform_settings first
    const basePriceSetting = await prisma.platform_settings.findUnique({
      where: { setting_key: 'base_price_per_day' },
    });

    // Extract values from settings (defaults if not found)
    let basePrice = 300; // Default fallback

    if (basePriceSetting?.value && typeof basePriceSetting.value === 'number') {
      basePrice = basePriceSetting.value;
    } else if (basePriceSetting?.value && typeof basePriceSetting.value === 'string') {
      const parsed = parseFloat(basePriceSetting.value);
      if (!isNaN(parsed)) basePrice = parsed;
    }

    // Calculate prices for each model (using base price, actual prices come from boxes)
    const pricing = {
      basePrice,
      classic: {
        pricePerDay: basePrice,
      },
      pro: {
        pricePerDay: basePrice,
      },
    };

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    // Return default pricing if there's an error
    return NextResponse.json({
      pricing: {
        basePrice: 300,
        classic: {
          pricePerDay: 300,
        },
        pro: {
          pricePerDay: 300,
        },
      },
    });
  }
}

