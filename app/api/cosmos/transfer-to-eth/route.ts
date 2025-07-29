import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { ethAddress, amount } = await request.json();
    const keyName = `staker_${ethAddress.slice(-8)}`;

    // Step 1: Export private key from cosmos keyring
    const exportCommand = `ethermintd keys unsafe-export-eth-key ${keyName} --keyring-backend test`;
    const { stdout: privateKeyOutput } = await execAsync(exportCommand);
    const privateKey = privateKeyOutput.trim();

    // Step 2: Create and sign transaction using ethers
    const { ethers } = require('ethers');

    // Create provider to get nonce
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get current nonce
    const nonce = await provider.getTransactionCount(wallet.address);

    // Create transaction
    const tx = {
      to: ethAddress,
      value: amount,
      gasLimit: 21000,
      gasPrice: ethers.parseUnits('7', 'gwei'),
      nonce: nonce,
      chainId: 9000
    };

    // Sign transaction
    const signedTx = await wallet.signTransaction(tx);

    // Step 3: Submit signed transaction via EVM module
    const submitCommand = `ethermintd tx evm raw ${signedTx} --from ${keyName} --keyring-backend test --chain-id ethermint_9000-1 --gas auto --gas-adjustment 1.2 --gas-prices 7aphoton --yes --output json`;

    const { stdout } = await execAsync(submitCommand);
    const result = JSON.parse(stdout);

    if (result.code === 0) {
      return NextResponse.json({
        success: true,
        txHash: result.txhash,
        note: `Successfully transferred ${amount} wei from cosmos to ${ethAddress}`
      });
    } else {
      throw new Error(result.raw_log || 'EVM transfer failed');
    }
  } catch (error: any) {
    console.error('Transfer to EVM error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
