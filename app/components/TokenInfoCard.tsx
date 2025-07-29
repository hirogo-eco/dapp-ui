'use client';

import React from 'react';
import { 
  CurrencyDollarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { config } from '../config';
import { Card } from './ui';

const TokenInfoCard: React.FC = () => {
  return (
    <Card title="Token Information">
      <div className="space-y-6">
        {/* Native Token Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CurrencyDollarIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Native Token
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Name:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {config.NATIVE_TOKEN_NAME}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Symbol:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {config.NATIVE_TOKEN_SYMBOL}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Type:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Native Currency
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Network:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    DATACOIN Network (Chain ID: {config.CHAIN_ID})
                  </span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-800/30 rounded-md">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    This is the native currency of your DATACOIN network. It's used for gas fees and can be transferred directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ERC20 Token Info */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                ERC20 Token
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Name:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {config.TOKEN_NAME}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Symbol:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {config.TOKEN_SYMBOL}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Type:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    ERC20 Smart Contract
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Contract:</span>
                  <span className="font-medium text-green-900 dark:text-green-100 font-mono text-xs">
                    {config.CONTRACT_ADDRESS.slice(0, 10)}...{config.CONTRACT_ADDRESS.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Decimals:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {config.TOKEN_DECIMALS}
                  </span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-green-100 dark:bg-green-800/30 rounded-md">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800 dark:text-green-200">
                    This is a custom ERC20 token deployed on your DATACOIN network. It has additional features like minting and burning.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Guide */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            How to Use
          </h3>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-medium text-blue-600">Native DTC:</span>
              <span className="ml-2">Used for gas fees and direct transfers. Available by default in your wallet.</span>
            </div>
            <div>
              <span className="font-medium text-green-600">DTCERC Token:</span>
              <span className="ml-2">Custom token with smart contract features. Add to MetaMask using the contract address above.</span>
            </div>
            <div>
              <span className="font-medium text-purple-600">Transfer:</span>
              <span className="ml-2">Choose the token type when sending. Native for gas-free transfers, ERC20 for contract features.</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TokenInfoCard;
