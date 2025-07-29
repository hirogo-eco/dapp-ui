'use client';

import React, { useState } from 'react';
import {
  WalletIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
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
  } = useWeb3();

  const [showModal, setShowModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Check if user manually disconnected - if so, force account selection
      const manuallyDisconnected = localStorage.getItem('wallet_manually_disconnected');
      const sessionDisconnected = sessionStorage.getItem('session_disconnected');
      const forceSelection = manuallyDisconnected === 'true' || sessionDisconnected === 'true';

      await connectWallet(forceSelection);
      setShowModal(false);
    } catch (error: any) {
      console.error('Failed to connect:', error);
      // You might want to show a toast notification here
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectDifferentWallet = async () => {
    setIsConnecting(true);
    try {
      // Clear auto-connect data to force wallet selection
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('last_connected_address');
      localStorage.setItem('wallet_manually_disconnected', 'true');
      sessionStorage.setItem('session_disconnected', 'true');

      // Force MetaMask to show account selection
      if (window.ethereum) {
        // First disconnect current connection
        disconnectWallet();

        // Small delay to ensure disconnect is processed
        await new Promise(resolve => setTimeout(resolve, 200));

        // Then request new connection with forced account selection
        await connectWallet(true);
      }
      setShowModal(false);
    } catch (error: any) {
      console.error('Failed to connect different wallet:', error);
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

  // If wallet is connected and on correct network
  return (
    <div className="flex items-center space-x-3">
      {/* Network Status */}
      <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
        <span className="text-sm text-green-700 dark:text-green-300">
          {getNetworkByChainId(wallet.chainId!)?.chainName || 'Connected'}
        </span>
      </div>

      {/* Native Balance Display */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshNativeBalance}
            className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            title="Click to refresh balance"
          >
            {nativeBalance.formattedBalance === '0' ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              `${nativeBalance.formattedBalance} ${config.NATIVE_TOKEN_SYMBOL}`
            )}
          </button>
          <button
            onClick={handleAddToken}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="Add DTCERC token to wallet"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Wallet Address Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <WalletIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatAddress(wallet.address!)}
          </span>
          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
        </button>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Wallet Information"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Wallet Address
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 font-mono text-sm break-all">
                {wallet.address}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Network
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm">
                {getNetworkByChainId(wallet.chainId!)?.chainName} (Chain ID: {wallet.chainId})
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {config.NATIVE_TOKEN_SYMBOL} Balance (Native)
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm">
                {nativeBalance.formattedBalance} {config.NATIVE_TOKEN_SYMBOL}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {config.TOKEN_SYMBOL} Balance (ERC20)
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm">
                {formatTokenAmountFull(tokenBalance.formattedBalance)} {config.TOKEN_SYMBOL}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddToken}
                  variant="secondary"
                  className="flex-1"
                >
                  Add {config.TOKEN_SYMBOL} to Wallet
                </Button>

                <Button
                  onClick={handleConnectDifferentWallet}
                  variant="secondary"
                  className="flex-1"
                  loading={isConnecting}
                >
                  Switch Wallet
                </Button>
              </div>

              <Button
                onClick={() => {
                  disconnectWallet();
                  setShowModal(false);
                }}
                variant="danger"
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default WalletConnect;
