'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { config } from '../config';
import { Transaction } from '../types';

export const useTransactions = (limit: number = 10) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallet, provider, contract } = useWeb3();

  const fetchTransactions = async () => {
    if (!wallet.isConnected || !wallet.address || !provider || !contract) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get recent blocks to search for transactions
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000); // Search last 1000 blocks

      // Get Transfer events from the ERC20 contract
      const transferFilter = contract.filters.Transfer();
      const events = await contract.queryFilter(transferFilter, fromBlock, currentBlock);

      // Filter events related to the current wallet
      const userEvents = events.filter(event =>
        event.args && (
          event.args[0].toLowerCase() === wallet.address.toLowerCase() || // from
          event.args[1].toLowerCase() === wallet.address.toLowerCase()    // to
        )
      );

      // Convert events to Transaction objects
      const txPromises = userEvents.slice(-limit).map(async (event) => {
        const block = await event.getBlock();
        const from = event.args![0];
        const to = event.args![1];
        const value = event.args![2];

        const isOutgoing = from.toLowerCase() === wallet.address.toLowerCase();
        const isMint = from === '0x0000000000000000000000000000000000000000';
        const isBurn = to === '0x0000000000000000000000000000000000000000';

        let type: 'transfer' | 'receive' | 'mint' | 'burn';
        if (isMint) {
          type = 'mint';
        } else if (isBurn) {
          type = 'burn';
        } else if (isOutgoing) {
          type = 'transfer';
        } else {
          type = 'receive';
        }

        return {
          hash: event.transactionHash,
          from,
          to,
          amount: ethers.formatEther(value),
          type,
          status: 'confirmed',
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          tokenSymbol: config.TOKEN_SYMBOL,
          blockNumber: event.blockNumber
        } as Transaction;
      });

      const txs = await Promise.all(txPromises);

      // Sort by block number (newest first)
      txs.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));

      setTransactions(txs);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to fetch transactions');

      // Fallback to mock data if blockchain query fails
      const mockTransactions: Transaction[] = [
        {
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          from: wallet.address,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
          amount: '100.0',
          type: 'transfer',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          tokenSymbol: config.TOKEN_SYMBOL
        },
        {
          hash: '0xabcdef1234567890abcdef1234567890abcdef12',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
          to: wallet.address,
          amount: '50.0',
          type: 'receive',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          tokenSymbol: config.TOKEN_SYMBOL
        },
        {
          hash: '0x9876543210fedcba9876543210fedcba98765432',
          from: '0x0000000000000000000000000000000000000000',
          to: wallet.address,
          amount: '1000.0',
          type: 'mint',
          status: 'confirmed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          tokenSymbol: config.TOKEN_SYMBOL
        }
      ];

      setTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [wallet.isConnected, wallet.address, provider, contract]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions
  };
};
