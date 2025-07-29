import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { ethAddress, validatorAddress, amount, operation } = await request.json();
    const keyName = `staker_${ethAddress.slice(-8)}`;

    let command;
    switch (operation) {
      case 'delegate':
        command = `ethermintd tx staking delegate ${validatorAddress} ${amount}aphoton --from ${keyName} --keyring-backend test --chain-id ethermint_9000-1 --gas auto --gas-adjustment 1.2 --gas-prices 7aphoton --dry-run --output json`;
        break;
      case 'undelegate':
        // Use 'unbond' instead of 'undelegate'
        command = `ethermintd tx staking unbond ${validatorAddress} ${amount}aphoton --from ${keyName} --keyring-backend test --chain-id ethermint_9000-1 --gas auto --gas-adjustment 1.2 --gas-prices 7aphoton --dry-run --output json`;
        break;
      default:
        throw new Error('Invalid operation');
    }

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);

    // Extract gas info from dry-run
    const gasUsed = result.gas_info?.gas_used || 200000; // fallback
    const gasPrice = 7; // aphoton per gas unit
    const totalGasCost = gasUsed * gasPrice; // in aphoton
    const gasCostDTC = totalGasCost / 1e18; // convert to DTC

    return NextResponse.json({
      success: true,
      gasUsed,
      gasPrice,
      totalGasCost,
      gasCostDTC: gasCostDTC.toFixed(6)
    });
  } catch (error: any) {
    // Fallback estimation if dry-run fails
    const fallbackGas = 200000;
    const gasPrice = 7;
    const totalGasCost = fallbackGas * gasPrice;
    const gasCostDTC = totalGasCost / 1e18;

    return NextResponse.json({
      success: true,
      gasUsed: fallbackGas,
      gasPrice,
      totalGasCost,
      gasCostDTC: gasCostDTC.toFixed(6),
      estimated: true
    });
  }
}
