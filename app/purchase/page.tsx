'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCardIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { useWeb3 } from '../contexts/Web3Context';
import { config } from '../config';
import { Card, Button, Input } from '../components/ui';

interface PurchaseForm {
  amount: string;
  email: string;
}

const PurchasePage: React.FC = () => {
  const router = useRouter();
  const { wallet } = useWeb3();
  
  const [form, setForm] = useState<PurchaseForm>({
    amount: '',
    email: '',
  });
  
  const [errors, setErrors] = useState<Partial<PurchaseForm>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Token price (fixed at $1 for demo)
  const TOKEN_PRICE = 1.0;

  const calculateTotal = () => {
    const amount = parseFloat(form.amount) || 0;
    return {
      tokenAmount: amount,
      usdAmount: amount * TOKEN_PRICE,
      fees: amount * TOKEN_PRICE * 0.03, // 3% processing fee
      total: amount * TOKEN_PRICE * 1.03,
    };
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PurchaseForm> = {};

    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!form.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      } else if (amount < 1) {
        newErrors.amount = 'Minimum purchase amount is 1 token';
      } else if (amount > 10000) {
        newErrors.amount = 'Maximum purchase amount is 10,000 tokens';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof PurchaseForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsProcessing(true);
    
    try {
      // In a real implementation, this would integrate with Stripe
      // For demo purposes, we'll simulate the process
      
      const total = calculateTotal();
      
      // Simulate API call to create payment intent
      console.log('Creating payment intent for:', {
        amount: total.total,
        tokenAmount: form.amount,
        email: form.email,
        walletAddress: wallet.address,
      });
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation:
      // 1. Create Stripe payment intent
      // 2. Process payment
      // 3. Mint tokens to user's wallet
      // 4. Send confirmation email
      
      alert(`Demo: Would purchase ${form.amount} ${config.TOKEN_SYMBOL} for $${total.total.toFixed(2)}`);
      
      // Reset form
      setForm({ amount: '', email: '' });
      
    } catch (error: any) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const total = calculateTotal();

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
              Please connect your wallet to purchase tokens
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Dashboard
            </Button>
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
          
          <div className="flex items-center space-x-3">
            <div className="bg-green-600 p-3 rounded-lg">
              <ShoppingCartIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Purchase Tokens
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Buy {config.TOKEN_SYMBOL} tokens with your credit card
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <div className="flex">
            <CurrencyDollarIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Token Purchase Information
              </h3>
              <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                <ul className="list-disc list-inside space-y-1">
                  <li>Current price: $1.00 per {config.TOKEN_SYMBOL}</li>
                  <li>Processing fee: 3% of purchase amount</li>
                  <li>Tokens will be sent to your connected wallet</li>
                  <li>Minimum purchase: 1 {config.TOKEN_SYMBOL}</li>
                  <li>Maximum purchase: 10,000 {config.TOKEN_SYMBOL}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase Form */}
          <Card title="Purchase Details">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                helperText="We'll send your receipt and transaction details here"
              />

              <Input
                label={`Amount (${config.TOKEN_SYMBOL})`}
                type="number"
                step="1"
                min="1"
                max="10000"
                placeholder="100"
                value={form.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                error={errors.amount}
                helperText="Enter the number of tokens you want to purchase"
              />

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Connected Wallet
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {wallet.address}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Tokens will be sent to this address
                </p>
              </div>

              <Button
                type="submit"
                className="w-full flex items-center justify-center space-x-2"
                disabled={isProcessing}
                loading={isProcessing}
              >
                <CreditCardIcon className="h-5 w-5" />
                <span>Purchase with Credit Card</span>
              </Button>
            </form>
          </Card>

          {/* Order Summary */}
          <Card title="Order Summary">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Token Amount:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {total.tokenAmount.toFixed(0)} {config.TOKEN_SYMBOL}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Price per token:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${TOKEN_PRICE.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Subtotal:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${total.usdAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Processing fee (3%):
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${total.fees.toFixed(2)}
                </span>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div className="flex justify-between">
                <span className="text-base font-medium text-gray-900 dark:text-white">
                  Total:
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ${total.total.toFixed(2)}
                </span>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mt-4">
                <div className="flex">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>Secure Payment:</strong> Your payment is processed securely through Stripe.
                      We never store your credit card information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Demo Notice */}
        <div className="mt-8">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Demo Mode
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  This is a demonstration of the purchase flow. In a production environment, 
                  this would integrate with Stripe for real payment processing and automatically 
                  mint tokens to your wallet upon successful payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasePage;
