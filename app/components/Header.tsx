'use client';

import React from 'react';
import Link from 'next/link';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import WalletConnect from './WalletConnect';
import { config } from '../config';

const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {config.NATIVE_TOKEN_NAME}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Decentralized Token Platform
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/transfer"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Transfer
            </Link>
            <Link
              href="/history"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              History
            </Link>
            <Link
              href="/purchase"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Purchase
            </Link>
            <Link
              href="/admin"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Admin
            </Link>
          </nav>

          {/* Wallet Connect */}
          <div className="flex items-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
