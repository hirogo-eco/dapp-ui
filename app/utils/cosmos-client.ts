import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CosmosClient {
  static async createKeyFromSignature(
    keyName: string, 
    signature: string, 
    validatorAddress: string
  ) {
    try {
      // Create key from signature seed
      const crypto = require('crypto');
      const seed = crypto.createHash('sha256').update(signature).digest('hex');
      
      // Generate mnemonic
      const mnemonic = this.generateMnemonicFromSeed(seed);
      
      // Add key to keyring
      const addKeyCommand = `echo "${mnemonic}" | ethermintd keys add ${keyName} --recover --keyring-backend test`;
      await execAsync(addKeyCommand);

      // Get cosmos address
      const showKeyCommand = `ethermintd keys show ${keyName} --keyring-backend test --output json`;
      const { stdout } = await execAsync(showKeyCommand);
      const keyInfo = JSON.parse(stdout);

      return {
        success: true,
        cosmosAddress: keyInfo.address,
        keyName,
        validatorAddress
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private static generateMnemonicFromSeed(seed: string): string {
    const words = ['abandon', 'ability', 'able', 'about', 'above', 'absent'];
    let mnemonic = '';
    for (let i = 0; i < 12; i++) {
      const index = parseInt(seed.substr(i * 2, 2), 16) % words.length;
      mnemonic += words[index] + (i < 11 ? ' ' : '');
    }
    return mnemonic;
  }
}