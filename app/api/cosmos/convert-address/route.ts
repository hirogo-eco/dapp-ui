import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { cosmosAddress } = await request.json();
    
    if (!cosmosAddress) {
      throw new Error('Cosmos address is required');
    }
    
    // Use ethermintd debug addr to convert cosmos address to Ethereum format
    const command = `ethermintd debug addr ${cosmosAddress}`;
    const { stdout } = await execAsync(command);
    
    // Parse the output to extract EIP-55 address
    const lines = stdout.split('\n');
    const eip55Line = lines.find(line => line.includes('Address (EIP-55):'));
    
    if (!eip55Line) {
      throw new Error('Could not find EIP-55 address in output');
    }
    
    const ethAddress = eip55Line.split('Address (EIP-55):')[1].trim();
    
    if (!ethAddress.startsWith('0x')) {
      throw new Error('Invalid Ethereum address format');
    }
    
    return NextResponse.json({ 
      success: true, 
      ethAddress,
      cosmosAddress 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    });
  }
}