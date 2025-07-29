'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CogIcon,
  PlusIcon,
  MinusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useWeb3 } from '../contexts/Web3Context';
import { config, formatTokenAmount } from '../config';
import { Card, Button, Input, Modal } from '../components/ui';
import { AdminMintForm, AdminBurnForm, TokenStats } from '../types';

const AdminPage: React.FC = () => {
  const router = useRouter();
  const { wallet, tokenBalance, mintTokens, burnTokens, isLoading } = useWeb3();

  const [mintForm, setMintForm] = useState<AdminMintForm>({
    recipient: '',
    amount: '',
  });

  const [burnForm, setBurnForm] = useState<AdminBurnForm>({
    amount: '',
  });

  const [mintErrors, setMintErrors] = useState<Partial<AdminMintForm>>({});
  const [burnErrors, setBurnErrors] = useState<Partial<AdminBurnForm>>({});
  const [isMinting, setIsMinting] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch token stats
  useEffect(() => {
    const fetchTokenStats = async () => {
      if (!wallet.isConnected) return;

      setStatsLoading(true);
      try {
        const response = await fetch(`${config.API_BASE_URL}/token/stats`);
        if (response.ok) {
          const data = await response.json();
          setTokenStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch token stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchTokenStats();
  }, [wallet.isConnected]);

  // Validate mint form
  const validateMintForm = (): boolean => {
    const newErrors: Partial<AdminMintForm> = {};

    if (!mintForm.recipient) {
      newErrors.recipient = 'Recipient address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(mintForm.recipient)) {
      newErrors.recipient = 'Invalid Ethereum address';
    }

    if (!mintForm.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(mintForm.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      }
    }

    setMintErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate burn form
  const validateBurnForm = (): boolean => {
    const newErrors: Partial<AdminBurnForm> = {};

    if (!burnForm.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(burnForm.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      } else if (amount > parseFloat(tokenBalance.formattedBalance)) {
        newErrors.amount = 'Insufficient balance to burn';
      }
    }

    setBurnErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateMintForm()) {
      setShowMintModal(true);
    }
  };

  const handleBurnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateBurnForm()) {
      setShowBurnModal(true);
    }
  };

  const handleConfirmMint = async () => {
    setIsMinting(true);
    setShowMintModal(false);

    try {
      const txHash = await mintTokens(mintForm.recipient, mintForm.amount);
      setTransactionHash(txHash);
      setSuccessMessage(`Successfully minted ${mintForm.amount} ${config.TOKEN_SYMBOL} to ${mintForm.recipient}`);
      setShowSuccessModal(true);

      // Reset form
      setMintForm({ recipient: '', amount: '' });
    } catch (error: any) {
      console.error('Mint failed:', error);
      // You might want to show an error toast here
    } finally {
      setIsMinting(false);
    }
  };

  const handleConfirmBurn = async () => {
    setIsBurning(true);
    setShowBurnModal(false);

    try {
      const txHash = await burnTokens(burnForm.amount);
      setTransactionHash(txHash);
      setSuccessMessage(`Successfully burned ${burnForm.amount} ${config.TOKEN_SYMBOL}`);
      setShowSuccessModal(true);

      // Reset form
      setBurnForm({ amount: '' });
    } catch (error: any) {
      console.error('Burn failed:', error);
      // You might want to show an error toast here
    } finally {
      setIsBurning(false);
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <div className="space-y-4">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Wallet Not Connected
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to access admin functions
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Dashboard
            </Button>
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
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Wrong Network
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please switch to the correct network to access admin functions
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="secondary"
            size="sm"
            className="mb-4 flex items-center space-x-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back</span>
          </Button>

          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-3 rounded-lg">
              <CogIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Admin Panel
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Manage {config.TOKEN_SYMBOL} token supply and operations
              </p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Admin Access Required
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                These functions require admin privileges. Make sure you are connected with an authorized admin wallet.
                All operations are irreversible and will be recorded on the blockchain.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Supply
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tokenStats ? formatTokenAmount(tokenStats.totalSupply) : '0'} {config.TOKEN_SYMBOL}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Token Holders
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tokenStats?.holders || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
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

        {/* Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mint Tokens */}
          <Card title="Mint Tokens">
            <form onSubmit={handleMintSubmit} className="space-y-4">
              <Input
                label="Recipient Address"
                type="text"
                placeholder="0x..."
                value={mintForm.recipient}
                onChange={(e) => {
                  setMintForm(prev => ({ ...prev, recipient: e.target.value }));
                  if (mintErrors.recipient) {
                    setMintErrors(prev => ({ ...prev, recipient: undefined }));
                  }
                }}
                error={mintErrors.recipient}
                helperText="Enter the address to receive the minted tokens"
              />

              <Input
                label={`Amount (${config.TOKEN_SYMBOL})`}
                type="number"
                step="0.000001"
                placeholder="0.0"
                value={mintForm.amount}
                onChange={(e) => {
                  setMintForm(prev => ({ ...prev, amount: e.target.value }));
                  if (mintErrors.amount) {
                    setMintErrors(prev => ({ ...prev, amount: undefined }));
                  }
                }}
                error={mintErrors.amount}
                helperText="Enter the amount of tokens to mint"
              />

              <Button
                type="submit"
                className="w-full flex items-center justify-center space-x-2"
                disabled={isMinting || isLoading}
                loading={isMinting}
              >
                <PlusIcon className="h-5 w-5" />
                <span>Mint Tokens</span>
              </Button>
            </form>
          </Card>

          {/* Burn Tokens */}
          <Card title="Burn Tokens">
            <form onSubmit={handleBurnSubmit} className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Your Balance</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {tokenBalance.formattedBalance} {config.TOKEN_SYMBOL}
                </p>
              </div>

              <Input
                label={`Amount to Burn (${config.TOKEN_SYMBOL})`}
                type="number"
                step="0.000001"
                placeholder="0.0"
                value={burnForm.amount}
                onChange={(e) => {
                  setBurnForm(prev => ({ ...prev, amount: e.target.value }));
                  if (burnErrors.amount) {
                    setBurnErrors(prev => ({ ...prev, amount: undefined }));
                  }
                }}
                error={burnErrors.amount}
                helperText={`Available: ${tokenBalance.formattedBalance} ${config.TOKEN_SYMBOL}`}
              />

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>Warning:</strong> Burned tokens will be permanently removed from circulation.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="danger"
                className="w-full flex items-center justify-center space-x-2"
                disabled={isBurning || isLoading}
                loading={isBurning}
              >
                <MinusIcon className="h-5 w-5" />
                <span>Burn Tokens</span>
              </Button>
            </form>
          </Card>
        </div>

        {/* Mint Confirmation Modal */}
        <Modal
          isOpen={showMintModal}
          onClose={() => setShowMintModal(false)}
          title="Confirm Mint Operation"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Recipient:</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {mintForm.recipient}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {mintForm.amount} {config.TOKEN_SYMBOL}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This will create new tokens and add them to the total supply.
                    Make sure the recipient address is correct.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowMintModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmMint}
                loading={isMinting}
                className="flex-1"
              >
                Confirm Mint
              </Button>
            </div>
          </div>
        </Modal>

        {/* Burn Confirmation Modal */}
        <Modal
          isOpen={showBurnModal}
          onClose={() => setShowBurnModal(false)}
          title="Confirm Burn Operation"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount to Burn:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {burnForm.amount} {config.TOKEN_SYMBOL}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Your Balance After:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {(parseFloat(tokenBalance.formattedBalance) - parseFloat(burnForm.amount || '0')).toFixed(6)} {config.TOKEN_SYMBOL}
                </span>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Warning:</strong> This will permanently destroy {burnForm.amount} {config.TOKEN_SYMBOL} tokens.
                    This action cannot be reversed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowBurnModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBurn}
                loading={isBurning}
                variant="danger"
                className="flex-1"
              >
                Confirm Burn
              </Button>
            </div>
          </div>
        </Modal>

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Operation Successful"
          size="md"
        >
          <div className="text-center space-y-4">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Transaction Completed!
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {successMessage}
              </p>
            </div>

            {transactionHash && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                  {transactionHash}
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setTransactionHash(null);
                setSuccessMessage('');
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default AdminPage;
