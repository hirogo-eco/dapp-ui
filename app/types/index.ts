// Wallet and Web3 related types
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string;
  chainId: number | null;
  isCorrectNetwork: boolean;
}

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Token related types
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  contractAddress: string;
  network: NetworkConfig;
}

export interface TokenBalance {
  balance: string;
  formattedBalance: string;
  usdValue?: number;
}

export interface NativeBalance {
  balance: string;
  formattedBalance: string;
  symbol: string;
  usdValue?: number;
}

export interface WalletBalances {
  native: NativeBalance;
  token: TokenBalance;
}

// Transaction related types
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  formattedValue: string;
  timestamp: number;
  blockNumber: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'send' | 'receive' | 'mint' | 'burn';
  gasUsed?: string;
  gasPrice?: string;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  status: number;
}

// Form related types
export interface SendTokenForm {
  recipient: string;
  amount: string;
  gasLimit?: string;
}

export interface AdminMintForm {
  recipient: string;
  amount: string;
}

export interface AdminBurnForm {
  amount: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TokenStats {
  totalSupply: string;
  circulatingSupply: string;
  holders: number;
  totalTransfers: number;
  marketCap: number;
  price: number;
}

// User and Authentication types
export interface User {
  email?: string;
  walletAddress: string;
  isAdmin: boolean;
  createdAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

// Component Props types
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Error types
export interface Web3Error {
  code: number;
  message: string;
  data?: any;
}

export interface AppError {
  type: 'wallet' | 'network' | 'transaction' | 'api' | 'validation';
  message: string;
  details?: string;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Contract interaction types
export interface ContractMethod {
  name: string;
  inputs: any[];
  outputs: any[];
}

export interface ContractCall {
  method: string;
  params: any[];
  value?: string;
}

// Dashboard data types
export interface DashboardData {
  tokenBalance: TokenBalance;
  recentTransactions: Transaction[];
  tokenStats: TokenStats;
  networkStatus: {
    isConnected: boolean;
    blockNumber: number;
    gasPrice: string;
  };
}

// Admin panel types
export interface AdminStats {
  totalSupply: string;
  totalHolders: number;
  totalTransactions: number;
  recentMints: Transaction[];
  recentBurns: Transaction[];
}

// Filter and pagination types
export interface TransactionFilter {
  type?: 'all' | 'send' | 'receive' | 'mint' | 'burn';
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: string;
  maxAmount?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Constants
export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  9000: {
    chainId: 9000,
    chainName: 'Ethermint Local',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorerUrl: 'http://localhost:8545',
    nativeCurrency: {
      name: 'Ethermint',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

export const DEFAULT_NETWORK = SUPPORTED_NETWORKS[9000];

// Event types for Web3 context
export type Web3ContextEvents =
  | { type: 'WALLET_CONNECTED'; payload: { address: string; chainId: number } }
  | { type: 'WALLET_DISCONNECTED' }
  | { type: 'NETWORK_CHANGED'; payload: { chainId: number } }
  | { type: 'ACCOUNT_CHANGED'; payload: { address: string } }
  | { type: 'BALANCE_UPDATED'; payload: { balance: string } }
  | { type: 'TRANSACTION_PENDING'; payload: { hash: string } }
  | { type: 'TRANSACTION_CONFIRMED'; payload: { hash: string; receipt: TransactionReceipt } }
  | { type: 'TRANSACTION_FAILED'; payload: { hash: string; error: string } };

// MetaMask types
interface MetaMaskEthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  selectedAddress: string | null;
  chainId: string;
}

declare global {
  interface Window {
    ethereum?: MetaMaskEthereumProvider;
  }
}
