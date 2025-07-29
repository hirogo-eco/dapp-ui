'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import {
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useWeb3 } from '../contexts/Web3Context';
import { config, formatAddress, formatTokenAmountFull } from '../config';
import { Card, Button, Input, Modal } from '../components/ui';
import { SendTokenForm } from '../types';
import TransferTypeSelector from '../components/TransferTypeSelector';
import BalanceDisplay from '../components/BalanceDisplay';

const TransferPage: React.FC = () => {
  const router = useRouter();
  const { wallet, nativeBalance, tokenBalance, sendTransaction, provider, isLoading } = useWeb3();

  const [transferType, setTransferType] = useState<'native' | 'token'>('token');
  const [form, setForm] = useState<SendTokenForm>({
    recipient: '',
    amount: '',
  });

  const [errors, setErrors] = useState<Partial<SendTokenForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Partial<SendTokenForm> = {};

    // Validate recipient address
    if (!form.recipient) {
      newErrors.recipient = 'Recipient address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(form.recipient)) {
      newErrors.recipient = 'Invalid Ethereum address';
    } else if (form.recipient.toLowerCase() === wallet.address?.toLowerCase()) {
      newErrors.recipient = 'Cannot send tokens to yourself';
    }

    // Validate amount
    if (!form.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(form.amount);
      const currentBalance = getCurrentBalance();
      const maxAmount = transferType === 'native'
        ? parseFloat(currentBalance.formattedBalance) - 0.001 // Leave gas for native
        : parseFloat(currentBalance.formattedBalance);

      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      } else if (amount > maxAmount) {
        newErrors.amount = transferType === 'native'
          ? 'Insufficient balance (reserve some for gas fees)'
          : 'Insufficient balance';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SendTokenForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const sendNativeToken = async (to: string, amount: string): Promise<string> => {
    if (!provider) {
      throw new Error('Provider not available');
    }

    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });

    await tx.wait();
    return tx.hash;
  };

  const handleConfirmTransfer = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      let txHash: string;

      if (transferType === 'native') {
        txHash = await sendNativeToken(form.recipient, form.amount);
      } else {
        txHash = await sendTransaction(form.recipient, form.amount);
      }

      setTransactionHash(txHash);
      setShowSuccessModal(true);

      // Reset form
      setForm({ recipient: '', amount: '' });
    } catch (error: any) {
      console.error('Transfer failed:', error);
      // You might want to show an error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  const setMaxAmount = () => {
    if (transferType === 'native') {
      // Leave a small amount for gas fees
      const maxAmount = Math.max(0, parseFloat(nativeBalance.formattedBalance) - 0.001);
      setForm(prev => ({ ...prev, amount: maxAmount.toString() }));
    } else {
      // For token transfers, use full balance (gas is paid in native token)
      const maxAmount = parseFloat(tokenBalance.formattedBalance);
      setForm(prev => ({ ...prev, amount: maxAmount.toString() }));
    }
  };

  const getCurrentBalance = () => {
    return transferType === 'native' ? nativeBalance : tokenBalance;
  };

  const getCurrentSymbol = () => {
    return transferType === 'native' ? config.NATIVE_TOKEN_SYMBOL : config.TOKEN_SYMBOL;
  };

  const getFormattedBalance = () => {
    const balance = getCurrentBalance();
    if (transferType === 'native') {
      // For native DTC, use the original formatting
      return balance.formattedBalance;
    } else {
      // For DTCERC token, use full number formatting
      return formatTokenAmountFull(balance.formattedBalance);
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
              Please connect your wallet to send tokens
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
              Please switch to the correct network to send tokens
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Send Tokens
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Transfer {config.TOKEN_SYMBOL} tokens to another address
          </p>
        </div>

        {/* Transfer Type Selector */}
        <Card title="Select Transfer Type" className="mb-6">
          <TransferTypeSelector
            selectedType={transferType}
            onTypeChange={setTransferType}
          />
        </Card>

        {/* Balance Info */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getFormattedBalance()} {getCurrentSymbol()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">From</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(wallet.address!)}
              </p>
            </div>
          </div>
        </Card>

        {/* Transfer Form */}
        <Card title="Transfer Details">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Recipient Address"
              type="text"
              placeholder="0x..."
              value={form.recipient}
              onChange={(e) => handleInputChange('recipient', e.target.value)}
              error={errors.recipient}
              helperText="Enter the Ethereum address of the recipient"
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount ({getCurrentSymbol()})
                </label>
                <button
                  type="button"
                  onClick={setMaxAmount}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Max
                </button>
              </div>
              <Input
                type="number"
                step="0.000001"
                placeholder="0.0"
                value={form.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                error={errors.amount}
                helperText={`Available: ${getFormattedBalance()} ${getCurrentSymbol()}`}
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Important Notice
                  </h3>
                  <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Double-check the recipient address before sending</li>
                      <li>Transactions cannot be reversed once confirmed</li>
                      <li>Network fees will be deducted from your ETH balance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full flex items-center justify-center space-x-2"
              disabled={isSubmitting || isLoading}
              loading={isSubmitting}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              <span>Send Tokens</span>
            </Button>
          </form>
        </Card>

        {/* Confirmation Modal */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Transfer"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">From:</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {formatAddress(wallet.address!)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">To:</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {formatAddress(form.recipient)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {form.amount} {getCurrentSymbol()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {transferType === 'native' ? `${config.NATIVE_TOKEN_NAME} (Native)` : `${config.TOKEN_NAME} (ERC20)`}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmTransfer}
                loading={isSubmitting}
                className="flex-1"
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        </Modal>

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Transfer Successful"
          size="md"
        >
          <div className="text-center space-y-4">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Transaction Sent!
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Your transaction has been submitted to the network
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

            <div className="flex space-x-3">
              <Button
                onClick={() => router.push('/history')}
                variant="secondary"
                className="flex-1"
              >
                View History
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/');
                }}
                className="flex-1"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default TransferPage;
