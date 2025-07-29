import { NetworkConfig } from '../types';

// Environment variables with fallbacks
export const config = {
  // Contract configuration
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xF19A2d609770c473a38b0547217ec60FF0AeF0aB',

  // Network configuration
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '9000'),
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545',

  // API configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',

  // App configuration
  APP_NAME: 'DATACOIN dApp',
  APP_DESCRIPTION: 'Decentralized application for DATACOIN token management',

  // ERC20 Token configuration
  TOKEN_NAME: 'DATACOIN ERC20',
  TOKEN_SYMBOL: 'DTCERC',
  TOKEN_DECIMALS: 18,

  // Native Token configuration
  NATIVE_TOKEN_NAME: 'DATACOIN',
  NATIVE_TOKEN_SYMBOL: 'DTC',

  // UI configuration
  ITEMS_PER_PAGE: 10,
  TRANSACTION_REFRESH_INTERVAL: 30000, // 30 seconds
  BALANCE_REFRESH_INTERVAL: 10000, // 10 seconds

  // MetaMask configuration
  METAMASK_DEEP_LINK: 'https://metamask.app.link/dapp/',

  // Error messages
  ERRORS: {
    WALLET_NOT_CONNECTED: 'Please connect your wallet first',
    WRONG_NETWORK: 'Please switch to the correct network',
    INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
    TRANSACTION_REJECTED: 'Transaction was rejected by user',
    NETWORK_ERROR: 'Network error occurred. Please try again.',
    INVALID_ADDRESS: 'Invalid wallet address',
    INVALID_AMOUNT: 'Invalid amount entered',
    METAMASK_NOT_INSTALLED: 'MetaMask is not installed. Please install MetaMask to continue.',
  },

  // Success messages
  SUCCESS: {
    WALLET_CONNECTED: 'Wallet connected successfully',
    TRANSACTION_SENT: 'Transaction sent successfully',
    TRANSACTION_CONFIRMED: 'Transaction confirmed',
    NETWORK_SWITCHED: 'Network switched successfully',
    TOKEN_ADDED: 'Token added to wallet successfully',
  },
} as const;

// Network configurations
export const NETWORKS: Record<number, NetworkConfig> = {
  9000: {
    chainId: 9000,
    chainName: 'DATACOIN Network',
    rpcUrl: config.RPC_URL,
    blockExplorerUrl: 'http://localhost:8545',
    nativeCurrency: {
      name: config.NATIVE_TOKEN_NAME,
      symbol: config.NATIVE_TOKEN_SYMBOL,
      decimals: 18,
    },
  },
  // Add more networks as needed
  11155111: {
    chainId: 11155111,
    chainName: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

// Default network
export const DEFAULT_NETWORK = NETWORKS[config.CHAIN_ID];

// Contract ABI (simplified version - you should import the full ABI)
export const CONTRACT_ABI = [
  // ERC20 standard functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',

  // Custom functions
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function owner() view returns (address)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Mint(address indexed to, uint256 amount)',
  'event Burn(address indexed from, uint256 amount)',
];

// Gas limits for different operations
export const GAS_LIMITS = {
  TRANSFER: 21000,
  TOKEN_TRANSFER: 65000,
  TOKEN_APPROVE: 50000,
  TOKEN_MINT: 80000,
  TOKEN_BURN: 60000,
  CONTRACT_INTERACTION: 100000,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  WALLET_ADDRESS: 'wallet_address',
  PREFERRED_NETWORK: 'preferred_network',
  USER_PREFERENCES: 'user_preferences',
  TRANSACTION_HISTORY: 'transaction_history',
  AUTH_TOKEN: 'auth_token',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Token endpoints
  TOKEN_INFO: '/token/info',
  TOKEN_BALANCE: '/token/balance',
  TOKEN_TRANSACTIONS: '/token/transactions',
  TOKEN_STATS: '/token/stats',

  // Admin endpoints
  ADMIN_MINT: '/admin/mint',
  ADMIN_BURN: '/admin/burn',
  ADMIN_DASHBOARD: '/admin/dashboard',

  // Auth endpoints
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_VERIFY: '/auth/verify',

  // Payment endpoints
  PAYMENT_CREATE: '/payment/create-intent',
  PAYMENT_CONFIRM: '/payment/confirm',
} as const;

// Validation rules
export const VALIDATION = {
  MIN_TRANSFER_AMOUNT: '0.000001',
  MAX_TRANSFER_AMOUNT: '1000000',
  ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  AMOUNT_REGEX: /^\d+(\.\d{1,18})?$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Theme configuration
export const THEME = {
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#6B7280',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#06B6D4',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
  },
} as const;

// Feature flags
export const FEATURES = {
  ENABLE_ADMIN_PANEL: true,
  ENABLE_PAYMENT_GATEWAY: true,
  ENABLE_TRANSACTION_HISTORY: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_MULTI_LANGUAGE: false,
} as const;

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Utility function to get network by chain ID
export const getNetworkByChainId = (chainId: number): NetworkConfig | undefined => {
  return NETWORKS[chainId];
};

// Utility function to check if network is supported
export const isSupportedNetwork = (chainId: number): boolean => {
  return chainId in NETWORKS;
};

// Utility function to format contract address for display
export const formatAddress = (address: string, length: number = 6): string => {
  if (!address) return '';
  return `${address.slice(0, length)}...${address.slice(-4)}`;
};

// Utility function to format token amount (with K/M abbreviations)
export const formatTokenAmount = (amount: string, decimals: number = 18): string => {
  const num = parseFloat(amount);
  if (num === 0) return '0';
  if (num < 0.001) return '< 0.001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(3);
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
};

// Utility function to format token amount (full numbers like native DTC)
export const formatTokenAmountFull = (amount: string, decimals: number = 18): string => {
  const num = parseFloat(amount);
  if (num === 0) return '0';
  if (num < 0.001) return '< 0.001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(3);
  // Show full numbers instead of K/M abbreviations
  if (num < 1000000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};
