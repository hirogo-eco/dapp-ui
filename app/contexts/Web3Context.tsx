'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  WalletState,
  TokenBalance,
  NativeBalance,
  WalletBalances,
  Transaction,
  Web3ContextEvents,
  NetworkConfig,
  AppError
} from '../types';
import {
  config,
  DEFAULT_NETWORK,
  CONTRACT_ABI,
  NETWORKS,
  isSupportedNetwork,
  getNetworkByChainId
} from '../config';

// Web3 Context State
interface Web3State {
  wallet: WalletState;
  nativeBalance: NativeBalance;
  tokenBalance: TokenBalance;
  isLoading: boolean;
  error: AppError | null;
  provider: ethers.BrowserProvider | null;
  contract: ethers.Contract | null;
  signer: ethers.JsonRpcSigner | null;
}

// Web3 Context Actions
interface Web3ContextValue extends Web3State {
  connectWallet: (forceAccountSelection?: boolean) => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  addTokenToWallet: () => Promise<void>;
  sendTransaction: (to: string, amount: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
  refreshNativeBalance: () => Promise<void>;
  getTransactionHistory: () => Promise<Transaction[]>;
  mintTokens: (to: string, amount: string) => Promise<string>;
  burnTokens: (amount: string) => Promise<string>;
}

// Initial state
const initialState: Web3State = {
  wallet: {
    isConnected: false,
    address: null,
    balance: '0',
    chainId: null,
    isCorrectNetwork: false,
  },
  nativeBalance: {
    balance: '0',
    formattedBalance: '0',
    symbol: config.NATIVE_TOKEN_SYMBOL,
  },
  tokenBalance: {
    balance: '0',
    formattedBalance: '0',
  },
  isLoading: false,
  error: null,
  provider: null,
  contract: null,
  signer: null,
};

// Additional action types for Web3 state
type Web3StateAction =
  | Web3ContextEvents
  | { type: 'SET_PROVIDER'; payload: { provider: ethers.BrowserProvider; contract: ethers.Contract; signer: ethers.JsonRpcSigner } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { error: AppError | null } }
  | { type: 'NATIVE_BALANCE_UPDATED'; payload: { balance: string; symbol: string } };

// Reducer
function web3Reducer(state: Web3State, action: Web3StateAction): Web3State {
  switch (action.type) {
    case 'WALLET_CONNECTED':
      return {
        ...state,
        wallet: {
          ...state.wallet,
          isConnected: true,
          address: action.payload.address,
          chainId: action.payload.chainId,
          isCorrectNetwork: isSupportedNetwork(action.payload.chainId),
        },
        error: null,
      };

    case 'WALLET_DISCONNECTED':
      return {
        ...initialState,
      };

    case 'NETWORK_CHANGED':
      return {
        ...state,
        wallet: {
          ...state.wallet,
          chainId: action.payload.chainId,
          isCorrectNetwork: isSupportedNetwork(action.payload.chainId),
        },
      };

    case 'ACCOUNT_CHANGED':
      return {
        ...state,
        wallet: {
          ...state.wallet,
          address: action.payload.address,
        },
      };

    case 'BALANCE_UPDATED':
      return {
        ...state,
        tokenBalance: {
          balance: action.payload.balance,
          formattedBalance: ethers.formatEther(action.payload.balance),
        },
      };

    case 'SET_PROVIDER':
      return {
        ...state,
        provider: action.payload.provider,
        contract: action.payload.contract,
        signer: action.payload.signer,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload.error,
      };

    case 'NATIVE_BALANCE_UPDATED':
      return {
        ...state,
        nativeBalance: {
          balance: action.payload.balance,
          formattedBalance: ethers.formatEther(action.payload.balance),
          symbol: action.payload.symbol,
        },
      };

    default:
      return state;
  }
}

// Create context
const Web3Context = createContext<Web3ContextValue | null>(null);

// Provider component
export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(web3Reducer, initialState);

  // Initialize provider and contract
  const initializeWeb3 = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(config.CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Update state with provider and contract
      // Note: We need to extend the reducer to handle this
      return { provider, contract, signer };
    } catch (error) {
      console.error('Failed to initialize Web3:', error);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async (forceAccountSelection = false) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error(config.ERRORS.METAMASK_NOT_INSTALLED);
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });

      let accounts;

      if (forceAccountSelection) {
        // Force MetaMask to show account selection dialog
        // First, try to revoke permissions (this might not work in all cases)
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (error) {
          // Ignore errors - this method might not be supported
          console.log('wallet_revokePermissions not supported, continuing...');
        }

        // Small delay to ensure permission revocation is processed
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Request account access
      accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(config.CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const address = accounts[0];

      // Set provider, contract, and signer in state
      dispatch({
        type: 'SET_PROVIDER',
        payload: { provider, contract, signer },
      });

      // Set wallet connected
      dispatch({
        type: 'WALLET_CONNECTED',
        payload: {
          address,
          chainId: Number(network.chainId),
        },
      });

      // Store in localStorage
      localStorage.setItem('wallet_connected', 'true');
      localStorage.setItem('wallet_address', address);
      localStorage.setItem('last_connected_address', address);
      // Clear disconnect flags when successfully connecting
      localStorage.removeItem('wallet_manually_disconnected');
      sessionStorage.removeItem('session_disconnected');

      // Refresh balances after connection
      try {
        // Get token balance
        const tokenBalance = await contract.balanceOf(address);
        dispatch({
          type: 'BALANCE_UPDATED',
          payload: { balance: tokenBalance.toString() },
        });

        // Get native balance
        const nativeBalance = await provider.getBalance(address);
        const networkInfo = getNetworkByChainId(Number(network.chainId));
        dispatch({
          type: 'NATIVE_BALANCE_UPDATED',
          payload: {
            balance: nativeBalance.toString(),
            symbol: networkInfo?.nativeCurrency.symbol || 'ETH'
          },
        });
      } catch (error) {
        console.error('Failed to get initial balances:', error);
      }

    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: { error: { type: 'wallet', message: error.message || 'Failed to connect wallet' } } });
      throw new Error(error.message || 'Failed to connect wallet');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    dispatch({ type: 'WALLET_DISCONNECTED' });
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('last_connected_address');
    // Set flags to indicate manual disconnect
    localStorage.setItem('wallet_manually_disconnected', 'true');
    sessionStorage.setItem('session_disconnected', 'true');
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error(config.ERRORS.METAMASK_NOT_INSTALLED);
    }

    const network = getNetworkByChainId(chainId);
    if (!network) {
      throw new Error('Unsupported network');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainId.toString(16)}`,
            chainName: network.chainName,
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.blockExplorerUrl],
            nativeCurrency: network.nativeCurrency,
          }],
        });
      } else {
        throw error;
      }
    }
  }, []);

  // Add token to wallet
  const addTokenToWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error(config.ERRORS.METAMASK_NOT_INSTALLED);
    }

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: [{
          type: 'ERC20',
          options: {
            address: config.CONTRACT_ADDRESS,
            symbol: config.TOKEN_SYMBOL,
            decimals: config.TOKEN_DECIMALS,
          },
        }],
      });
    } catch (error: any) {
      console.error('Failed to add token to wallet:', error);
      throw new Error('Failed to add token to wallet');
    }
  }, []);

  // Send transaction
  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string> => {
    if (!state.contract || !state.signer) {
      throw new Error(config.ERRORS.WALLET_NOT_CONNECTED);
    }

    if (!state.wallet.isCorrectNetwork) {
      throw new Error(config.ERRORS.WRONG_NETWORK);
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await state.contract.transfer(to, amountWei);

      dispatch({
        type: 'TRANSACTION_PENDING',
        payload: { hash: tx.hash },
      });

      const receipt = await tx.wait();

      dispatch({
        type: 'TRANSACTION_CONFIRMED',
        payload: { hash: tx.hash, receipt },
      });

      // Refresh balance after transaction
      await refreshBalance();

      return tx.hash;
    } catch (error: any) {
      console.error('Transaction failed:', error);
      throw new Error(error.message || 'Transaction failed');
    }
  }, [state.contract, state.signer, state.wallet.isCorrectNetwork]);

  // Refresh token balance
  const refreshBalance = useCallback(async () => {
    if (!state.contract || !state.wallet.address) {
      return;
    }

    try {
      const balance = await state.contract.balanceOf(state.wallet.address);
      dispatch({
        type: 'BALANCE_UPDATED',
        payload: { balance: balance.toString() },
      });
    } catch (error) {
      console.error('Failed to refresh token balance:', error);
    }
  }, [state.contract, state.wallet.address]);

  // Refresh native balance
  const refreshNativeBalance = useCallback(async () => {
    if (!state.provider || !state.wallet.address) {
      return;
    }

    try {
      const balance = await state.provider.getBalance(state.wallet.address);
      const networkInfo = getNetworkByChainId(state.wallet.chainId || config.CHAIN_ID);
      dispatch({
        type: 'NATIVE_BALANCE_UPDATED',
        payload: {
          balance: balance.toString(),
          symbol: networkInfo?.nativeCurrency.symbol || 'ETH'
        },
      });
    } catch (error) {
      console.error('Failed to refresh native balance:', error);
    }
  }, [state.provider, state.wallet.address, state.wallet.chainId]);

  // Get transaction history (placeholder - would need to implement with backend API)
  const getTransactionHistory = useCallback(async (): Promise<Transaction[]> => {
    // This would typically call your backend API
    // For now, return empty array
    return [];
  }, []);

  // Mint tokens (admin only)
  const mintTokens = useCallback(async (to: string, amount: string): Promise<string> => {
    if (!state.contract || !state.signer) {
      throw new Error(config.ERRORS.WALLET_NOT_CONNECTED);
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await state.contract.mint(to, amountWei);
      await tx.wait();

      // Refresh balance after minting
      await refreshBalance();

      return tx.hash;
    } catch (error: any) {
      console.error('Mint failed:', error);
      throw new Error(error.message || 'Mint failed');
    }
  }, [state.contract, state.signer, refreshBalance]);

  // Burn tokens
  const burnTokens = useCallback(async (amount: string): Promise<string> => {
    if (!state.contract || !state.signer) {
      throw new Error(config.ERRORS.WALLET_NOT_CONNECTED);
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await state.contract.burn(amountWei);
      await tx.wait();

      // Refresh balance after burning
      await refreshBalance();

      return tx.hash;
    } catch (error: any) {
      console.error('Burn failed:', error);
      throw new Error(error.message || 'Burn failed');
    }
  }, [state.contract, state.signer, refreshBalance]);

  // Setup event listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        dispatch({
          type: 'ACCOUNT_CHANGED',
          payload: { address: accounts[0] },
        });
      }
    };

    const handleChainChanged = (chainId: string) => {
      dispatch({
        type: 'NETWORK_CHANGED',
        payload: { chainId: parseInt(chainId, 16) },
      });
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnectWallet]);

  // Auto-connect if previously connected and user hasn't manually disconnected
  useEffect(() => {
    const autoConnect = async () => {
      const wasConnected = localStorage.getItem('wallet_connected');
      const manuallyDisconnected = localStorage.getItem('wallet_manually_disconnected');
      const sessionDisconnected = sessionStorage.getItem('session_disconnected');

      // Don't auto-connect if:
      // 1. User manually disconnected
      // 2. User disconnected in this session
      // 3. Was never connected before
      if (manuallyDisconnected === 'true' || sessionDisconnected === 'true' || wasConnected !== 'true') {
        return;
      }

      // Only auto-connect if was connected and not manually disconnected
      if (window.ethereum) {
        try {
          // Check if already connected and user hasn't changed accounts
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          const lastConnectedAddress = localStorage.getItem('last_connected_address');

          if (accounts.length > 0 && lastConnectedAddress && accounts.includes(lastConnectedAddress)) {
            // Only auto-connect if the same address is still available and user didn't disconnect
            await connectWallet(false); // false = don't force account selection
          } else {
            // Clear connection state if address changed or not available
            localStorage.removeItem('wallet_connected');
            localStorage.removeItem('last_connected_address');
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
          // Clear connection state on error
          localStorage.removeItem('wallet_connected');
          localStorage.removeItem('last_connected_address');
        }
      }
    };

    // Wait a bit for MetaMask to be ready
    setTimeout(autoConnect, 100);
  }, [connectWallet]);

  // Fetch balances when wallet address changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (!state.wallet.isConnected || !state.wallet.address || !state.wallet.isCorrectNetwork) {
        return;
      }

      try {
        // Initialize provider if not already done
        if (!state.provider && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(config.CONTRACT_ADDRESS, CONTRACT_ABI, signer);

          dispatch({
            type: 'SET_PROVIDER',
            payload: { provider, contract, signer },
          });

          // Fetch native balance
          const nativeBalance = await provider.getBalance(state.wallet.address);
          const networkInfo = getNetworkByChainId(state.wallet.chainId || config.CHAIN_ID);
          dispatch({
            type: 'NATIVE_BALANCE_UPDATED',
            payload: {
              balance: nativeBalance.toString(),
              symbol: networkInfo?.nativeCurrency.symbol || config.NATIVE_TOKEN_SYMBOL
            },
          });

          // Fetch token balance
          const tokenBalance = await contract.balanceOf(state.wallet.address);
          dispatch({
            type: 'BALANCE_UPDATED',
            payload: { balance: tokenBalance.toString() },
          });
        } else if (state.provider && state.contract) {
          // If provider exists, just refresh balances
          const nativeBalance = await state.provider.getBalance(state.wallet.address);
          const networkInfo = getNetworkByChainId(state.wallet.chainId || config.CHAIN_ID);
          dispatch({
            type: 'NATIVE_BALANCE_UPDATED',
            payload: {
              balance: nativeBalance.toString(),
              symbol: networkInfo?.nativeCurrency.symbol || config.NATIVE_TOKEN_SYMBOL
            },
          });

          const tokenBalance = await state.contract.balanceOf(state.wallet.address);
          dispatch({
            type: 'BALANCE_UPDATED',
            payload: { balance: tokenBalance.toString() },
          });
        }
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      }
    };

    fetchBalances();
  }, [state.wallet.isConnected, state.wallet.address, state.wallet.isCorrectNetwork, state.wallet.chainId]);



  // Refresh balances periodically
  useEffect(() => {
    if (state.wallet.isConnected && state.wallet.isCorrectNetwork && state.contract && state.provider) {
      const interval = setInterval(() => {
        refreshBalance();
        refreshNativeBalance();
      }, config.BALANCE_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [state.wallet.isConnected, state.wallet.isCorrectNetwork, state.contract, state.provider, refreshBalance, refreshNativeBalance]);

  const contextValue: Web3ContextValue = {
    ...state,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    addTokenToWallet,
    sendTransaction,
    refreshBalance,
    refreshNativeBalance,
    getTransactionHistory,
    mintTokens,
    burnTokens,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
}

// Hook to use Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
