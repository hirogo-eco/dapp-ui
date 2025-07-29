'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useWeb3 } from '../contexts/Web3Context';
import { config, formatAddress } from '../config';
import { Card, Button, Input, LoadingSpinner } from '../components/ui';
import { Transaction, TransactionFilter, PaginationParams } from '../types';
import { useTransactions } from '../hooks/useTransactions';

const HistoryPage: React.FC = () => {
  const router = useRouter();
  const { wallet } = useWeb3();

  // Use the transactions hook to get real data
  const { transactions: allTransactions, loading: isLoading, refetch } = useTransactions(50);
  const [showFilters, setShowFilters] = useState(false);

  const [filter, setFilter] = useState<TransactionFilter>({
    type: 'all',
  });

  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Filter transactions from the hook
  const filteredTransactions = allTransactions.filter(tx => {
    if (filter.type !== 'all' && tx.type !== filter.type) return false;
    if (searchTerm && !tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tx.from.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tx.to.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'From', 'To', 'Amount', 'Status', 'Hash'];
    const csvData = filteredTransactions.map(tx => [
      new Date(tx.timestamp).toLocaleString(),
      tx.type,
      tx.from,
      tx.to,
      `${tx.amount} ${tx.tokenSymbol || config.TOKEN_SYMBOL}`,
      tx.status,
      tx.hash,
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datacoin-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send':
        return <ArrowUpIcon className="h-5 w-5 text-red-500" />;
      case 'receive':
        return <ArrowDownIcon className="h-5 w-5 text-green-500" />;
      case 'mint':
      case 'burn':
        return <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <div className="space-y-4">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Wallet Not Connected
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to view transaction history
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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Transaction History
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                View all your {config.TOKEN_SYMBOL} transactions
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
              </Button>

              <Button
                onClick={exportToCSV}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
                disabled={filteredTransactions.length === 0}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Type
                </label>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as any }))}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="send">Send</option>
                  <option value="receive">Receive</option>
                  <option value="mint">Mint</option>
                  <option value="burn">Burn</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <Input
                  type="text"
                  placeholder="Search by hash or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<MagnifyingGlassIcon />}
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setFilter({ type: 'all' });
                    setSearchTerm('');
                  }}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading transactions..." />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No transactions found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {allTransactions.length === 0
                  ? "You haven't made any transactions yet"
                  : "No transactions match your current filters"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.hash}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getTransactionIcon(tx.type)}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {tx.type}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p>From: {formatAddress(tx.from)}</p>
                        <p>To: {formatAddress(tx.to)}</p>
                        <p>Hash: {formatAddress(tx.hash, 10)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {tx.amount} {tx.tokenSymbol || config.TOKEN_SYMBOL}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </p>
                    {tx.blockNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Block #{tx.blockNumber}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing {filteredTransactions.length} of {allTransactions.length} transactions
            </p>

            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                variant="secondary"
                size="sm"
              >
                Previous
              </Button>

              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page}
              </span>

              <Button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                variant="secondary"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
