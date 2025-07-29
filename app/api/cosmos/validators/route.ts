import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const command = `ethermintd query staking validators --output json`;
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);

    const validators = data.validators?.map((v: any) => ({
      address: v.operator_address,
      moniker: v.description.moniker,
      commission: (parseFloat(v.commission.commission_rates.rate) * 100).toFixed(2),
      status: v.status,
      tokens: v.tokens
    })) || [];

    return NextResponse.json({ success: true, validators });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}