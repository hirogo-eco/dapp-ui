import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { ethAddress, validatorAddress, amount } = await request.json();
    const keyName = `staker_${ethAddress.slice(-8)}`;

    // Add gas price to the delegate command
    const delegateCommand = `ethermintd tx staking delegate ${validatorAddress} ${amount}aphoton --from ${keyName} --keyring-backend test --chain-id ethermint_9000-1 --gas auto --gas-adjustment 1.2 --gas-prices 7aphoton --yes --output json`;

    const { stdout } = await execAsync(delegateCommand);
    const result = JSON.parse(stdout);

    if (result.code === 0) {
      return NextResponse.json({ success: true, txHash: result.txhash });
    } else {
      throw new Error(result.raw_log || 'Delegate failed');
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
