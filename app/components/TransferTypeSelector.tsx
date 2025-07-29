'use client';

import React from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { config } from '../config';
import { useWeb3 } from '../contexts/Web3Context';

interface TransferTypeSelectorProps {
  selectedType: 'native' | 'token';
  onTypeChange: (type: 'native' | 'token') => void;
  className?: string;
}

const TransferTypeSelector: React.FC<TransferTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  className = ''
}) => {
  const { nativeBalance } = useWeb3();

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {/* Native Token Option */}
      <button
        onClick={() => onTypeChange('native')}
        className={`p-4 rounded-lg border-2 transition-all ${
          selectedType === 'native'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center space-x-3">
          <CurrencyDollarIcon className={`h-6 w-6 ${
            selectedType === 'native' ? 'text-blue-600' : 'text-gray-400'
          }`} />
          <div className="text-left">
            <p className={`font-medium ${
              selectedType === 'native'
                ? 'text-blue-900 dark:text-blue-100'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {config.NATIVE_TOKEN_NAME}
            </p>
            <p className={`text-sm ${
              selectedType === 'native'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {config.NATIVE_TOKEN_SYMBOL} (Native)
            </p>
          </div>
        </div>
      </button>

      {/* ERC20 Token Option */}
      <button
        onClick={() => onTypeChange('token')}
        className={`p-4 rounded-lg border-2 transition-all ${
          selectedType === 'token'
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center space-x-3">
          <CurrencyDollarIcon className={`h-6 w-6 ${
            selectedType === 'token' ? 'text-green-600' : 'text-gray-400'
          }`} />
          <div className="text-left">
            <p className={`font-medium ${
              selectedType === 'token'
                ? 'text-green-900 dark:text-green-100'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {config.TOKEN_NAME}
            </p>
            <p className={`text-sm ${
              selectedType === 'token'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {config.TOKEN_SYMBOL} (ERC20)
            </p>
          </div>
        </div>
      </button>
    </div>
  );
};

export default TransferTypeSelector;
