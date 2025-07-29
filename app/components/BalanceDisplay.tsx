'use client';

import React, { useState } from 'react';
import {
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useWeb3 } from '../contexts/Web3Context';
import { config, formatTokenAmount, formatTokenAmountFull } from '../config';
import { Button } from './ui';

interface BalanceDisplayProps {
  showBoth?: boolean;
  defaultView?: 'native' | 'token';
  className?: string;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  showBoth = true,
  defaultView = 'token',
  className = ''
}) => {
  const { nativeBalance, tokenBalance, refreshBalance, refreshNativeBalance } = useWeb3();
  const [currentView, setCurrentView] = useState<'native' | 'token'>(defaultView);
  const [isVisible, setIsVisible] = useState(true);

  const toggleView = () => {
    setCurrentView(prev => prev === 'native' ? 'token' : 'native');
  };

  const refreshCurrentBalance = async () => {
    if (currentView === 'native') {
      await refreshNativeBalance();
    } else {
      await refreshBalance();
    }
  };

  const getCurrentBalance = () => {
    if (currentView === 'native') {
      return {
        balance: nativeBalance.formattedBalance,
        symbol: config.NATIVE_TOKEN_SYMBOL,
        type: `${config.NATIVE_TOKEN_NAME} (Native)`,
        icon: <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />,
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-700 dark:text-blue-300',
      };
    } else {
      return {
        balance: tokenBalance.formattedBalance,
        symbol: config.TOKEN_SYMBOL,
        type: `${config.TOKEN_NAME} (ERC20)`,
        icon: <CurrencyDollarIcon className="h-6 w-6 text-green-600" />,
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        textColor: 'text-green-700 dark:text-green-300',
      };
    }
  };

  const current = getCurrentBalance();

  if (showBoth) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Native Balance */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {config.NATIVE_TOKEN_NAME} (Native)
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {isVisible ? formatTokenAmount(nativeBalance.formattedBalance) : '••••••'} {config.NATIVE_TOKEN_SYMBOL}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsVisible(!isVisible)}
                variant="secondary"
                size="sm"
                className="p-2"
              >
                {isVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </Button>
              <Button
                onClick={refreshNativeBalance}
                variant="secondary"
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Token Balance */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  {config.TOKEN_NAME} (ERC20)
                </p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">
                  {isVisible ? formatTokenAmountFull(tokenBalance.formattedBalance) : '••••••'} {config.TOKEN_SYMBOL}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsVisible(!isVisible)}
                variant="secondary"
                size="sm"
                className="p-2"
              >
                {isVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </Button>
              <Button
                onClick={refreshBalance}
                variant="secondary"
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single balance view with toggle
  return (
    <div className={`${current.bgColor} border ${current.borderColor} rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {current.icon}
          <div>
            <div className="flex items-center space-x-2">
              <p className={`text-sm font-medium ${current.textColor}`}>
                {current.type}
              </p>
              <Button
                onClick={toggleView}
                variant="secondary"
                size="sm"
                className="p-1"
                title="Switch balance view"
              >
                <ArrowsRightLeftIcon className="h-3 w-3" />
              </Button>
            </div>
            <p className={`text-lg font-bold ${current.textColor.replace('text-', 'text-').replace('-300', '-100').replace('-700', '-900')}`}>
              {isVisible ? (currentView === 'token' ? formatTokenAmountFull(current.balance) : formatTokenAmount(current.balance)) : '••••••'} {current.symbol}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsVisible(!isVisible)}
            variant="secondary"
            size="sm"
            className="p-2"
          >
            {isVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </Button>
          <Button
            onClick={refreshCurrentBalance}
            variant="secondary"
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BalanceDisplay;
