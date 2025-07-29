'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CurrencyDollarIcon,
  PaperAirplaneIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useWeb3 } from '../contexts/Web3Context';
import { config, formatTokenAmount } from '../config';
import { ethers } from 'ethers';
import { Card, Button, LoadingSpinner } from './ui';
import { TokenStats } from '../types';
import { useTransactions } from '../hooks/useTransactions';
import DebugInfo from './DebugInfo';
import BalanceDisplay from './BalanceDisplay';
import TokenInfoCard from './TokenInfoCard';

const Dashboard: React.FC = () => {
  const { wallet, nativeBalance, tokenBalance, isLoading, provider, contract } = useWeb3();
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [validators, setValidators] = useState<any[]>([]);
  const [validatorsLoading, setValidatorsLoading] = useState(false);

  // Use the new transactions hook
  const { transactions: recentTransactions, loading: transactionsLoading } = useTransactions(5);

  // Fetch token stats from blockchain
  useEffect(() => {
    const fetchTokenStats = async () => {
      if (!wallet.isConnected || !provider || !contract) return;

      setStatsLoading(true);
      try {
        // Get real data from blockchain
        const totalSupply = await contract.totalSupply();
        const totalSupplyFormatted = ethers.formatEther(totalSupply);

        // Get recent blocks to estimate transaction count
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);

        // Get Transfer events to count transactions and holders
        const transferFilter = contract.filters.Transfer();
        const events = await contract.queryFilter(transferFilter, fromBlock, currentBlock);

        // Count unique holders from recent events
        const holders = new Set<string>();
        events.forEach(event => {
          if (event.args) {
            const from = event.args[0];
            const to = event.args[1];
            if (from !== '0x0000000000000000000000000000000000000000') holders.add(from);
            if (to !== '0x0000000000000000000000000000000000000000') holders.add(to);
          }
        });

        const stats: TokenStats = {
          totalSupply: totalSupplyFormatted,
          totalHolders: holders.size || 1, // At least 1 (current user)
          totalTransactions: events.length,
          price: 1.0, // Mock price - would come from price oracle
          marketCap: parseFloat(totalSupplyFormatted) * 1.0,
          volume24h: events.length * 100, // Mock volume calculation
          priceChange24h: Math.random() * 10 - 5 // Mock price change
        };

        setTokenStats(stats);
      } catch (error) {
        console.error('Failed to fetch token stats:', error);
        // Fallback to mock stats on error
        const fallbackStats: TokenStats = {
          totalSupply: tokenBalance.formattedBalance || '0',
          totalHolders: 1,
          totalTransactions: 0,
          price: 1.0,
          marketCap: parseFloat(tokenBalance.formattedBalance || '0') * 1.0,
          volume24h: 0,
          priceChange24h: 0
        };
        setTokenStats(fallbackStats);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchTokenStats();
  }, [wallet.isConnected, provider, contract, tokenBalance.formattedBalance]);

  // Fetch validators data from Ethermint
  useEffect(() => {
    const fetchValidators = async () => {
      setValidatorsLoading(true);
      try {
        // Fetch validators and pool data from Ethermint REST API
        const [validatorsRes, poolRes] = await Promise.all([
          fetch(`${config.COSMOS_REST_URL}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED`),
          fetch(`${config.COSMOS_REST_URL}/cosmos/staking/v1beta1/pool`)
        ]);

        if (!validatorsRes.ok || !poolRes.ok) {
          throw new Error('Failed to fetch validator data');
        }

        const validatorsData = await validatorsRes.json();
        const poolData = await poolRes.json();

        const bondedTokens = Number(poolData.pool.bonded_tokens);

        const validatorList = validatorsData.validators.map((v: any) => ({
          moniker: v.description.moniker,
          address: v.operator_address,
          tokens: Number(v.tokens),
          votingPowerPercent: ((Number(v.tokens) / bondedTokens) * 100).toFixed(2),
          status: v.status,
          jailed: v.jailed
        }));

        // Sort by voting power (descending)
        validatorList.sort((a: any, b: any) => b.tokens - a.tokens);

        setValidators(validatorList.slice(0, 6)); // Show top 6 validators
      } catch (error) {
        console.error('Failed to fetch validators:', error);
        // Fallback to mock data
        setValidators([
          {
            moniker: 'Validator 1',
            address: 'ethermintvaloper1...',
            votingPowerPercent: '25.5',
            tokens: 1000000,
            status: 'BOND_STATUS_BONDED',
            jailed: false
          },
          {
            moniker: 'Validator 2',
            address: 'ethermintvaloper2...',
            votingPowerPercent: '18.2',
            tokens: 750000,
            status: 'BOND_STATUS_BONDED',
            jailed: false
          },
          {
            moniker: 'Validator 3',
            address: 'ethermintvaloper3...',
            votingPowerPercent: '12.8',
            tokens: 500000,
            status: 'BOND_STATUS_BONDED',
            jailed: false
          }
        ]);
      } finally {
        setValidatorsLoading(false);
      }
    };

    fetchValidators();
  }, []);



  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <div className="space-y-4">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Welcome to DATACOIN dApp
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Connect your wallet to start managing your DATACOIN tokens
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!wallet.isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <div className="space-y-4">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-full p-3 w-fit mx-auto">
              <CogIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Wrong Network
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please switch to the correct network to continue
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage your DATACOIN tokens and view your portfolio
          </p>
        </div>

        {/* Balance Display */}
        <div className="mb-8">
          <BalanceDisplay showBoth={true} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Supply */}
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Supply
                </p>
                {statsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tokenStats ? formatTokenAmount(tokenStats.totalSupply) : '0'} {config.TOKEN_SYMBOL}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Token Price */}
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowUpIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Token Price
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${tokenStats?.price.toFixed(2) || '1.00'}
                </p>
              </div>
            </div>
          </Card>

          {/* Market Cap */}
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Market Cap
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${tokenStats ? formatTokenAmount(tokenStats.marketCap.toString()) : '0'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Ethermint Validators */}
        <Card title="Ethermint Validators" className="mb-8">
          {validatorsLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Loading validators...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validators.map((validator, index) => (
                  <div
                    key={validator.address}
                    className={`${
                      validator.jailed ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                      index === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                      'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    } rounded-lg p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          validator.jailed ? 'text-red-700 dark:text-red-300' :
                          index === 0 ? 'text-green-700 dark:text-green-300' :
                          'text-blue-700 dark:text-blue-300'
                        }`}>
                          {validator.moniker} ({validator.votingPowerPercent}%)
                        </p>
                        <p className={`text-xs truncate ${
                          validator.jailed ? 'text-red-600 dark:text-red-400' :
                          index === 0 ? 'text-green-600 dark:text-green-400' :
                          'text-blue-600 dark:text-blue-400'
                        }`}>
                          {validator.address.slice(0, 20)}...
                        </p>
                        {validator.jailed && (
                          <p className="text-xs text-red-500 font-medium">JAILED</p>
                        )}
                      </div>
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ml-2 ${
                        validator.jailed ? 'bg-red-500' :
                        index === 0 ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}></div>
                    </div>
                  </div>
                ))}
              </div>

              {validators.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No validators found
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/transfer">
                <Button className="w-full flex items-center justify-center space-x-2">
                  <PaperAirplaneIcon className="h-5 w-5" />
                  <span>Send Tokens</span>
                </Button>
              </Link>

              <Link href="/purchase">
                <Button variant="secondary" className="w-full flex items-center justify-center space-x-2">
                  <CurrencyDollarIcon className="h-5 w-5" />
                  <span>Buy Tokens</span>
                </Button>
              </Link>

              <Link href="/history">
                <Button variant="secondary" className="w-full flex items-center justify-center space-x-2">
                  <ClockIcon className="h-5 w-5" />
                  <span>History</span>
                </Button>
              </Link>

              {/* Admin Panel - only show if user is admin */}
              <Link href="/admin">
                <Button variant="secondary" className="w-full flex items-center justify-center space-x-2">
                  <CogIcon className="h-5 w-5" />
                  <span>Admin</span>
                </Button>
              </Link>
            </div>
          </Card>

          {/* Token Information */}
          <TokenInfoCard />
        </div>

        {/* Recent Transactions */}
        <Card title="Recent Transactions">
          {transactionsLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Loading transactions...
              </p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No transactions yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.hash}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'transfer' ? 'bg-red-100 dark:bg-red-900/20' :
                      tx.type === 'receive' ? 'bg-green-100 dark:bg-green-900/20' :
                      'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      {tx.type === 'transfer' ? (
                        <ArrowUpIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : tx.type === 'receive' ? (
                        <ArrowDownIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <CurrencyDollarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {tx.type === 'transfer' ? 'Sent' : tx.type === 'receive' ? 'Received' : 'Minted'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      tx.type === 'transfer' ? 'text-red-600 dark:text-red-400' :
                      tx.type === 'receive' ? 'text-green-600 dark:text-green-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {tx.type === 'transfer' ? '-' : '+'}{tx.amount} {tx.tokenSymbol}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}

              <div className="text-center pt-4">
                <Link href="/history">
                  <Button variant="secondary" size="sm">
                    View All Transactions
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* Debug Info */}
        <DebugInfo />
      </div>
    </div>
  );
};

export default Dashboard;
