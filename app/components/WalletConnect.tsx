'use client';

import React, { useState } from 'react';
import {
  WalletIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useWeb3 } from '../contexts/Web3Context';
import { config, formatAddress, getNetworkByChainId, formatTokenAmountFull } from '../config';
import { Button, Modal } from './ui';

const WalletConnect: React.FC = () => {
  const {
    wallet,
    nativeBalance,
    tokenBalance,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    addTokenToWallet,
    refreshNativeBalance,
    refreshBalance,
  } = useWeb3();

  const [showModal, setShowModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
      setShowModal(false);
    } catch (error: any) {
      console.error('Failed to connect:', error);
      // You might want to show a toast notification here
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true);
    try {
      await switchNetwork(config.CHAIN_ID);
    } catch (error: any) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const handleAddToken = async () => {
    try {
      await addTokenToWallet();
    } catch (error: any) {
      console.error('Failed to add token:', error);
    }
  };

  // If wallet is not connected
  if (!wallet.isConnected) {
    return (
      <>
        <Button
          onClick={() => setShowModal(true)}
          variant="primary"
          className="flex items-center space-x-2"
        >
          <WalletIcon className="h-5 w-5" />
          <span>Connect Wallet</span>
        </Button>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Connect Your Wallet"
          size="md"
        >
          <div className="space-y-4">
            <div className="text-center">
              <WalletIcon className="mx-auto h-12 w-12 text-blue-600" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                Connect to MetaMask
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Connect your MetaMask wallet to interact with DATACOIN
              </p>
            </div>

            {typeof window !== 'undefined' && !window.ethereum && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      MetaMask Not Detected
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                      Please install MetaMask browser extension to continue.
                    </p>
                    <div className="mt-2">
                      <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-yellow-800 dark:text-yellow-200 underline hover:text-yellow-900 dark:hover:text-yellow-100"
                      >
                        Download MetaMask →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleConnect}
                loading={isConnecting}
                disabled={typeof window !== 'undefined' && !window.ethereum}
                className="w-full"
                variant="primary"
              >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // If wallet is connected but wrong network
  if (!wallet.isCorrectNetwork) {
    return (
      <div className="flex items-center space-x-3">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Wrong Network
            </span>
          </div>
        </div>

        <Button
          onClick={handleSwitchNetwork}
          loading={isSwitchingNetwork}
          variant="danger"
          size="sm"
        >
          Switch to {config.CHAIN_ID === 9000 ? 'DATACOIN Network' : 'Correct Network'}
        </Button>
      </div>
    );
  }

  // Connected wallet display
  return (
    <div className="flex items-center space-x-3">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
            </span>
          </div>

          <div className="text-xs text-green-600 dark:text-green-400">
            <div>{nativeBalance.formattedBalance} {nativeBalance.symbol}</div>
            <div>{tokenBalance.formattedBalance} {config.TOKEN_SYMBOL}</div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Refresh Balance Button */}
            <button
              onClick={() => {
                refreshNativeBalance();
                refreshBalance();
              }}
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              title="Refresh balances"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>

            {/* Add Token to MetaMask Button */}
            <button
              onClick={handleAddToken}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              title="Add DTCERC token to MetaMask"
            >
              <PlusIcon className="h-4 w-4" />
            </button>

            {/* Disconnect Button */}
            <button
              onClick={disconnectWallet}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="Disconnect wallet"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
