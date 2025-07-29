'use server';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function createCosmosKey(
  keyName: string,
  signature: string,
  validatorAddress: string,
  ethPrivateKey: string
) {
  try {
    // Check if privateKey exists and is string
    if (!ethPrivateKey || typeof ethPrivateKey !== 'string') {
      throw new Error('Invalid private key provided');
    }

    // Convert ETH private key to Cosmos format (remove 0x prefix)
    const cosmosPrivateKey = ethPrivateKey.startsWith('0x') ? ethPrivateKey.slice(2) : ethPrivateKey;

    // Import ETH private key directly using unsafe-import-eth-key
    const password = `pass${keyName}123`; // Tạo password từ keyName
    const importKeyCommand = `echo "${password}" | ethermintd keys unsafe-import-eth-key ${keyName} ${cosmosPrivateKey} --keyring-backend test`;
    await execAsync(importKeyCommand);

    // Get cosmos address
    const showKeyCommand = `ethermintd keys show ${keyName} --keyring-backend test --output json`;
    const { stdout } = await execAsync(showKeyCommand);
    const keyInfo = JSON.parse(stdout);

    return {
      success: true,
      cosmosAddress: keyInfo.address,
      keyName,
      validatorAddress,
      ethAddress: ethPrivateKey // Same private key = same funds
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}


