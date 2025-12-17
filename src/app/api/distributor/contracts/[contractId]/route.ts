import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { ContractService } from '@/services/distributors/contracts/ContractService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { contractId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const service = new ContractService();

    if (type === 'renewal') {
      const renewalInfo = await service.getContractRenewalInfo(contractId);
      return NextResponse.json({ success: true, data: renewalInfo });
    }

    const contract = await service.getContractDetails(contractId);
    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  // Check authentication FIRST - exit immediately if not authenticated
  const supabaseUser = await getCurrentUser(request);

  if (!supabaseUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { contractId } = await params;
    const body = await request.json();
    const { action, changes } = body;

    const service = new ContractService();

    if (action === 'request-amendment') {
      const result = await service.requestContractAmendment(
        contractId,
        changes || {}
      );
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing contract action:', error);
    return NextResponse.json(
      { error: 'Failed to process contract action' },
      { status: 500 }
    );
  }
}

