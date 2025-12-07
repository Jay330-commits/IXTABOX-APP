import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;

    // Try to get pricing from platform_settings first
    const basePriceSetting = await prisma.platform_settings.findUnique({
      where: { setting_key: 'base_price_per_day' },
    });

    const classicMultiplierSetting = await prisma.platform_settings.findUnique({
      where: { setting_key: 'classic_model_multiplier' },
    });

    const proMultiplierSetting = await prisma.platform_settings.findUnique({
      where: { setting_key: 'pro_model_multiplier' },
    });

    // Extract values from settings (defaults if not found)
    let basePrice = 299.99; // Default fallback
    let classicMultiplier = 1.0;
    let proMultiplier = 1.5;

    if (basePriceSetting?.value && typeof basePriceSetting.value === 'number') {
      basePrice = basePriceSetting.value;
    } else if (basePriceSetting?.value && typeof basePriceSetting.value === 'string') {
      const parsed = parseFloat(basePriceSetting.value);
      if (!isNaN(parsed)) basePrice = parsed;
    }

    if (classicMultiplierSetting?.value && typeof classicMultiplierSetting.value === 'number') {
      classicMultiplier = classicMultiplierSetting.value;
    } else if (classicMultiplierSetting?.value && typeof classicMultiplierSetting.value === 'string') {
      const parsed = parseFloat(classicMultiplierSetting.value);
      if (!isNaN(parsed)) classicMultiplier = parsed;
    }

    if (proMultiplierSetting?.value && typeof proMultiplierSetting.value === 'number') {
      proMultiplier = proMultiplierSetting.value;
    } else if (proMultiplierSetting?.value && typeof proMultiplierSetting.value === 'string') {
      const parsed = parseFloat(proMultiplierSetting.value);
      if (!isNaN(parsed)) proMultiplier = parsed;
    }

    // Calculate prices for each model
    const pricing = {
      basePrice,
      classic: {
        pricePerDay: basePrice * classicMultiplier,
        multiplier: classicMultiplier,
      },
      pro: {
        pricePerDay: basePrice * proMultiplier,
        multiplier: proMultiplier,
      },
    };

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    // Return default pricing if there's an error
    return NextResponse.json({
      pricing: {
        basePrice: 299.99,
        classic: {
          pricePerDay: 299.99,
          multiplier: 1.0,
        },
        pro: {
          pricePerDay: 449.99,
          multiplier: 1.5,
        },
      },
    });
  }
}

