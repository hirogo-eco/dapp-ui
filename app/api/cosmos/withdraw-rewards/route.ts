import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { ethAddress, validatorAddress } = await request.json();
    const keyName = `staker_${ethAddress.slice(-8)}`;

    let withdrawCommand;
    if (validatorAddress) {
      // Withdraw from specific validator
      withdrawCommand = `ethermintd tx distribution withdraw-rewards ${validatorAddress} --from ${keyName} --keyring-backend test --chain-id ethermint_9000-1 --gas auto --gas-adjustment 1.2 --gas-prices 7aphoton --yes --output json`;
    } else {
      // Withdraw all rewards
      withdrawCommand = `ethermintd tx distribution withdraw-all-rewards --from ${keyName} --keyring-backend test --chain-id ethermint_9000-1 --gas auto --gas-adjustment 1.2 --gas-prices 7aphoton --yes --output json`;
    }

    const { stdout } = await execAsync(withdrawCommand);
    const result = JSON.parse(stdout);

    if (result.code === 0) {
      return NextResponse.json({ success: true, txHash: result.txhash });
    } else {
      throw new Error(result.raw_log || 'Withdraw rewards failed');
    }
  } catch (error: any) {
    console.error('Withdraw rewards error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to withdraw rewards'
    });
  }
}