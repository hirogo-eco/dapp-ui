'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { config } from '../config';
import { Card, Button } from './ui';
import { ethers } from 'ethers';

const DebugInfo: React.FC = () => {
  const { wallet, nativeBalance, tokenBalance, provider, contract } = useWeb3();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  const checkContractInfo = async () => {
    if (!provider || !wallet.address) return;

    try {
      const info: any = {
        walletAddress: wallet.address,
        chainId: wallet.chainId,
        isCorrectNetwork: wallet.isCorrectNetwork,
        contractAddress: config.CONTRACT_ADDRESS,
        providerConnected: !!provider,
        contractConnected: !!contract,
      };

      // Check if contract exists
      const code = await provider.getCode(config.CONTRACT_ADDRESS);
      info.contractExists = code !== '0x';

      if (contract && info.contractExists) {
        try {
          // Try to get token info
          const name = await contract.name();
          const symbol = await contract.symbol();
          const decimals = await contract.decimals();
          const totalSupply = await contract.totalSupply();
          const balance = await contract.balanceOf(wallet.address);

          info.tokenInfo = {
            name,
            symbol,
            decimals: decimals.toString(),
            totalSupply: ethers.formatEther(totalSupply),
            userBalance: ethers.formatEther(balance),
          };
        } catch (error: any) {
          info.contractError = error.message;
        }
      }

      // Check MetaMask token balance
      if (window.ethereum) {
        try {
          const tokenBalance = await window.ethereum.request({
            method: 'eth_call',
            params: [{
              to: config.CONTRACT_ADDRESS,
              data: `0x70a08231000000000000000000000000${wallet.address.slice(2)}`, // balanceOf(address)
            }, 'latest'],
          });

          if (tokenBalance && tokenBalance !== '0x') {
            info.metamaskBalance = ethers.formatEther(tokenBalance);
          }
        } catch (error: any) {
          info.metamaskError = error.message;
        }
      }

      setDebugInfo(info);
    } catch (error: any) {
      setDebugInfo({ error: error.message });
    }
  };

  useEffect(() => {
    if (wallet.isConnected) {
      checkContractInfo();
    }
  }, [wallet.isConnected, wallet.address, provider, contract]);

  if (!wallet.isConnected) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsVisible(!isVisible)}
        variant="secondary"
        size="sm"
        className="mb-2"
      >
        {isVisible ? 'Hide' : 'Show'} Debug Info
      </Button>

      {isVisible && (
        <Card className="max-w-md max-h-96 overflow-y-auto">
          <div className="space-y-2">
            <h3 className="font-bold text-sm">Debug Information</h3>

            <div className="text-xs space-y-1">
              <div><strong>Wallet:</strong> {debugInfo.walletAddress}</div>
              <div><strong>Chain ID:</strong> {debugInfo.chainId}</div>
              <div><strong>Correct Network:</strong> {debugInfo.isCorrectNetwork ? 'Yes' : 'No'}</div>
              <div><strong>Contract Address:</strong> {debugInfo.contractAddress}</div>
              <div><strong>Provider Connected:</strong> {debugInfo.providerConnected ? 'Yes' : 'No'}</div>
              <div><strong>Contract Connected:</strong> {debugInfo.contractConnected ? 'Yes' : 'No'}</div>
              <div><strong>Contract Exists:</strong> {debugInfo.contractExists ? 'Yes' : 'No'}</div>

              {debugInfo.tokenInfo && (
                <div className="border-t pt-2">
                  <div><strong>Token Name:</strong> {debugInfo.tokenInfo.name}</div>
                  <div><strong>Token Symbol:</strong> {debugInfo.tokenInfo.symbol}</div>
                  <div><strong>Decimals:</strong> {debugInfo.tokenInfo.decimals}</div>
                  <div><strong>Total Supply:</strong> {debugInfo.tokenInfo.totalSupply}</div>
                  <div><strong>Your Balance:</strong> {debugInfo.tokenInfo.userBalance}</div>
                </div>
              )}

              {debugInfo.metamaskBalance && (
                <div className="border-t pt-2">
                  <div><strong>MetaMask Balance:</strong> {debugInfo.metamaskBalance}</div>
                </div>
              )}

              {debugInfo.contractError && (
                <div className="border-t pt-2 text-red-600">
                  <div><strong>Contract Error:</strong> {debugInfo.contractError}</div>
                </div>
              )}

              {debugInfo.metamaskError && (
                <div className="border-t pt-2 text-red-600">
                  <div><strong>MetaMask Error:</strong> {debugInfo.metamaskError}</div>
                </div>
              )}

              {debugInfo.error && (
                <div className="text-red-600">
                  <div><strong>Error:</strong> {debugInfo.error}</div>
                </div>
              )}
            </div>

            <div className="border-t pt-2">
              <div className="text-xs space-y-1">
                <div><strong>App Native Balance:</strong> {nativeBalance.formattedBalance} {nativeBalance.symbol}</div>
                <div><strong>App Token Balance:</strong> {tokenBalance.formattedBalance} {config.TOKEN_SYMBOL}</div>
              </div>
            </div>

            <Button
              onClick={checkContractInfo}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Refresh Debug Info
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DebugInfo;
