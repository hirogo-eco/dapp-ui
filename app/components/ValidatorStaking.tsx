'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, Button, Input, LoadingSpinner } from './ui';
import { createCosmosKeyFromSignature } from '../actions/cosmos';
import { ethers } from 'ethers';
import { config } from '../config';

const convertCosmosToEthAddress = async (cosmosAddr: string): Promise<string> => {
  try {
    // Use ethermintd debug addr command to convert cosmos address to Ethereum format
    const response = await fetch('/api/cosmos/convert-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cosmosAddress: cosmosAddr })
    });

    const result = await response.json();
    if (result.success && result.ethAddress) {
      return result.ethAddress;
    }

    throw new Error(result.error || 'Failed to convert address');
  } catch (error: any) {
    throw new Error(`Address conversion failed: ${error.message}`);
  }
};

interface Validator {
  address: string;
  moniker: string;
  commission: string;
  status: string;
  tokens: string;
  votingPowerPercent: string;
  jailed: boolean;
}

interface StakingInfo {
  delegated: string;
  rewards: string;
  validatorRewards?: Array<{
    validator: string;
    amount: string;
  }>;
  unbonding: Array<{
    validator: string;
    amount: string;
    completionTime: string;
  }>;
  delegations?: Array<{
    validator: string;
    amount: string;
  }>;
}

export default function ValidatorStaking() {
  const { wallet, provider } = useWeb3();
  const [validators, setValidators] = useState<Validator[]>([]);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [cosmosAddress, setCosmosAddress] = useState<string>('');
  const [cosmosBalance, setCosmosBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'validators' | 'staking' | 'rewards' | 'transfer'>('validators');
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  // Form states
  const [delegateAmount, setDelegateAmount] = useState('');
  const [undelegateAmount, setUndelegateAmount] = useState('');
  const [transferToCosmosAmount, setTransferToCosmosAmount] = useState('');
  const [transferToETHAmount, setTransferToETHAmount] = useState('');
  const [selectedValidator, setSelectedValidator] = useState<string>('');

  // Add conversion functions
  const dtcToAphoton = (dtcAmount: string): string => {
    return (parseFloat(dtcAmount) * 1e18).toString();
  };

  const aphotonToDtc = (aphotonAmount: string): string => {
    return (parseFloat(aphotonAmount) / 1e18).toFixed(6);
  };

  // Add function for rewards display
  const formatRewards = (aphotonAmount: string): string => {
    const dtc = parseFloat(aphotonAmount) / 1e18;
    if (dtc === 0) return '0.000000';
    if (dtc < 0.000001) return dtc.toExponential(6); // Scientific notation for very small
    if (dtc < 0.001) return dtc.toFixed(12); // More decimals for small amounts
    return dtc.toFixed(6);
  };

  // Helper function to check if user has delegated to a validator
  const getDelegationAmount = (validatorAddress: string): string => {
    if (!stakingInfo?.delegations) return '0';
    const delegation = stakingInfo.delegations.find(d => d.validator === validatorAddress);
    return delegation ? aphotonToDtc(delegation.amount) : '0';
  };

  const hasJoinedValidator = (validatorAddress: string): boolean => {
    return parseFloat(getDelegationAmount(validatorAddress)) > 0;
  };

  // Add this function for undelegate transfer info
  const calculateUndelegateTransferInfo = () => {
    if (!undelegateAmount || !cosmosBalance) return null;

    const available = parseFloat(cosmosBalance);
    const estimatedGas = 0.005; // Conservative estimate for undelegate

    return {
      available,
      estimatedGas,
      needsTransfer: available < estimatedGas,
      transferAmount: available < estimatedGas ? estimatedGas - available + 0.01 : 0
    };
  };

  // Load validators on mount
  useEffect(() => {
    loadValidators();
    if (wallet.address) {
      loadStakingInfo();
    }
  }, [wallet.address]);

  // Auto-refresh staking info every 10 seconds
  useEffect(() => {
    if (!wallet.address) return;

    const interval = setInterval(() => {
      loadStakingInfo();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [wallet.address]);

  const loadValidators = async () => {
    try {
      const response = await fetch('/api/cosmos/validators');
      const data = await response.json();

      if (data.success && data.validators) {
        // Try to fetch pool data for voting power calculation
        try {
          const poolRes = await fetch(`${config.COSMOS_REST_URL}/cosmos/staking/v1beta1/pool`);
          if (poolRes.ok) {
            const poolData = await poolRes.json();
            const bondedTokens = Number(poolData.pool.bonded_tokens);

            const validatorsWithVotingPower = data.validators.map((v: any) => ({
              ...v,
              votingPowerPercent: bondedTokens > 0
                ? ((Number(v.tokens) / bondedTokens) * 100).toFixed(2)
                : '0.00'
            }));

            // Sort by voting power (descending)
            validatorsWithVotingPower.sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));
            setValidators(validatorsWithVotingPower);
          } else {
            // Fallback: calculate relative voting power from available validators
            const totalTokens = data.validators.reduce((sum: number, v: any) => sum + Number(v.tokens), 0);
            const validatorsWithRelativePower = data.validators.map((v: any) => ({
              ...v,
              votingPowerPercent: totalTokens > 0
                ? ((Number(v.tokens) / totalTokens) * 100).toFixed(2)
                : '0.00'
            }));

            validatorsWithRelativePower.sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));
            setValidators(validatorsWithRelativePower);
          }
        } catch (poolError) {
          console.warn('Failed to fetch pool data, using relative voting power:', poolError);
          // Fallback: calculate relative voting power
          const totalTokens = data.validators.reduce((sum: number, v: any) => sum + Number(v.tokens), 0);
          const validatorsWithRelativePower = data.validators.map((v: any) => ({
            ...v,
            votingPowerPercent: totalTokens > 0
              ? ((Number(v.tokens) / totalTokens) * 100).toFixed(2)
              : '0.00'
          }));

          validatorsWithRelativePower.sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));
          setValidators(validatorsWithRelativePower);
        }
      } else {
        setValidators(data.validators || []);
      }
    } catch (error) {
      console.error('Failed to load validators:', error);
    }
  };

  const loadStakingInfo = async () => {
    if (!wallet.address) return;

    try {
      const keyName = `staker_${wallet.address.slice(-8)}`;
      const response = await fetch(`/api/cosmos/staking-info?keyName=${keyName}&ethAddress=${wallet.address}`);
      const data = await response.json();

      console.log('Staking info response:', data); // Debug log

      if (data.success) {
        setStakingInfo(data.stakingInfo);
        setCosmosAddress(data.cosmosAddress);
        setCosmosBalance(data.cosmosBalance);

        // Debug rewards specifically
        console.log('Rewards data:', data.stakingInfo?.rewards);
        console.log('Delegations data:', data.stakingInfo?.delegations);
        console.log('Unbonding data:', data.stakingInfo?.unbonding);
      }
    } catch (error) {
      console.error('Failed to load staking info:', error);
    }
  };

  const handleJoinValidator = async (validator: Validator) => {
    if (!wallet.address || !provider) return;

    setLoading(true);
    try {
      const message = `Join validator ${validator.moniker} for staking - ${wallet.address}`;
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const keyName = `staker_${wallet.address.slice(-8)}`;
      const result = await createCosmosKeyFromSignature(keyName, signature, validator.address, wallet.address);

      if (result.success) {
        alert(`✅ Đã tham gia ${validator.moniker}!\n\nKey: ${keyName}\nCosmos Address: ${result.cosmosAddress}`);
        await loadStakingInfo();
      } else {
        throw new Error(result.error || 'Failed to join validator');
      }
    } catch (error: any) {
      console.error('Failed to join validator:', error);
      alert(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!selectedValidator || !delegateAmount) return;

    setLoading(true);
    try {
      // Validate inputs
      if (!cosmosAddress) {
        throw new Error('Cosmos address not found. Please join a validator first.');
      }

      console.log("Cosmos address:", cosmosAddress);

      const aphotonAmount = dtcToAphoton(delegateAmount);
      const requiredAmount = parseFloat(aphotonAmount);
      const currentBalance = parseFloat(cosmosBalance) * 1e18;

      // Estimate gas cost for this specific transaction
      console.log('Estimating gas cost...');
      const gasEstimate = await fetch('/api/cosmos/estimate-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress: wallet.address,
          validatorAddress: selectedValidator,
          amount: aphotonAmount,
          operation: 'delegate'
        })
      });

      const gasData = await gasEstimate.json();
      const gasBuffer = gasData.success ? parseFloat(gasData.gasCostDTC) * 1e18 * 1.5 : 0.005e18; // 50% safety margin

      console.log(`Required: ${(requiredAmount / 1e18).toFixed(6)} DTC`);
      console.log(`Current balance: ${(currentBalance / 1e18).toFixed(6)} DTC`);
      console.log(`Estimated gas: ${(gasBuffer / 1e18).toFixed(6)} DTC`);
      console.log(`Total needed: ${((requiredAmount + gasBuffer) / 1e18).toFixed(6)} DTC`);

      // Check if we need to transfer more funds
      if (currentBalance < requiredAmount + gasBuffer) {
        const shortfall = (requiredAmount + gasBuffer - currentBalance) / 1e18;
        const transferNeeded = shortfall + 0.01; // Add small buffer

        if (!provider) throw new Error('Provider not available');

        console.log(`Insufficient balance. Need to transfer ${transferNeeded.toFixed(6)} DTC more`);

        // Convert cosmos address to Ethereum format
        console.log('Converting cosmos address to Ethereum format...');
        const ethAddress = await convertCosmosToEthAddress(cosmosAddress);
        console.log('Converted to:', ethAddress);

        console.log(`Auto-transferring ${transferNeeded.toFixed(6)} DTC to ${ethAddress}...`);

        // Auto transfer from DTC to Cosmos
        const signer = await provider.getSigner();
        const transferTx = await signer.sendTransaction({
          to: ethAddress,
          value: ethers.parseEther(transferNeeded.toString()),
          gasLimit: 21000
        });

        await transferTx.wait();

        // Wait for balance to update
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Refresh cosmos balance
        await loadStakingInfo();
      } else {
        console.log('Sufficient balance available, proceeding with delegation...');
      }

      // Now proceed with delegation
      const response = await fetch('/api/cosmos/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress: wallet.address,
          validatorAddress: selectedValidator,
          amount: aphotonAmount
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Delegate thành công!\nTx: ${result.txHash}\nAmount: ${delegateAmount} DTC`);
        setDelegateAmount('');
        await loadStakingInfo();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Delegate error:', error);
      alert(`❌ Lỗi delegate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUndelegate = async () => {
    if (!selectedValidator || !undelegateAmount) return;

    setLoading(true);
    try {
      // Validate inputs
      if (!cosmosAddress) {
        throw new Error('Cosmos address not found. Please join a validator first.');
      }

      const aphotonAmount = dtcToAphoton(undelegateAmount);
      const currentBalance = parseFloat(cosmosBalance) * 1e18;

      // Estimate gas cost for undelegate transaction
      console.log('Estimating gas cost for undelegate...');
      const gasEstimate = await fetch('/api/cosmos/estimate-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress: wallet.address,
          validatorAddress: selectedValidator,
          amount: aphotonAmount,
          operation: 'undelegate'
        })
      });

      const gasData = await gasEstimate.json();
      const gasBuffer = gasData.success ? parseFloat(gasData.gasCostDTC) * 1e18 * 1.5 : 0.005e18; // 50% safety margin

      console.log(`Current balance: ${(currentBalance / 1e18).toFixed(6)} DTC`);
      console.log(`Estimated gas: ${(gasBuffer / 1e18).toFixed(6)} DTC`);

      // Check if we have enough balance for gas fees
      if (currentBalance < gasBuffer) {
        const shortfall = (gasBuffer - currentBalance) / 1e18;
        const transferNeeded = shortfall + 0.01; // Add small buffer

        if (!provider) throw new Error('Provider not available');

        console.log(`Insufficient balance for gas. Need to transfer ${transferNeeded.toFixed(6)} DTC more`);

        // Convert cosmos address to Ethereum format
        console.log('Converting cosmos address to Ethereum format...');
        const ethAddress = await convertCosmosToEthAddress(cosmosAddress);
        console.log('Converted to:', ethAddress);

        console.log(`Auto-transferring ${transferNeeded.toFixed(6)} DTC for gas fees...`);

        // Auto transfer from DTC to Cosmos for gas fees
        const signer = await provider.getSigner();
        const transferTx = await signer.sendTransaction({
          to: ethAddress,
          value: ethers.parseEther(transferNeeded.toString()),
          gasLimit: 21000
        });

        await transferTx.wait();

        // Wait for balance to update
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Refresh cosmos balance
        await loadStakingInfo();
      } else {
        console.log('Sufficient balance for gas fees, proceeding with undelegation...');
      }

      const response = await fetch('/api/cosmos/undelegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress: wallet.address,
          validatorAddress: selectedValidator,
          amount: aphotonAmount
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Undelegate thành công!\nTx: ${result.txHash}\nAmount: ${undelegateAmount} DTC\n\n⏳ Tiền sẽ về sau 21 ngày unbonding period.`);
        setUndelegateAmount('');
        await loadStakingInfo();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Undelegate error:', error);
      alert(`❌ Lỗi undelegate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRewards = async (validatorAddress?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cosmos/withdraw-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress: wallet.address,
          validatorAddress
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Withdraw rewards thành công!\nTx: ${result.txHash}\n\n💰 Rewards đã về cosmos address.`);

        // Refresh multiple times to ensure update
        await loadStakingInfo();
        setTimeout(() => loadStakingInfo(), 2000);
        setTimeout(() => loadStakingInfo(), 5000);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      alert(`❌ Lỗi withdraw rewards: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToETH = async () => {
    if (!transferToETHAmount) return;

    setLoading(true);
    try {
      const response = await fetch('/api/cosmos/transfer-to-eth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress: wallet.address,
          amount: transferToETHAmount
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Transfer thành công!\nTx: ${result.txHash}\nAmount: ${transferToETHAmount} aphoton\n\n💡 Funds đã chuyển về địa chỉ tương ứng với ETH wallet của bạn.`);
        setTransferToETHAmount('');
        await loadStakingInfo();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.log(`❌ Lỗi transfer: ${error.message}`);
      alert(`❌ Lỗi transfer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToCosmos = async () => {
    if (!transferToCosmosAmount || !provider) return;

    setLoading(true);
    try {
      // Validate cosmos address
      if (!cosmosAddress) {
        throw new Error('Cosmos address not found. Please join a validator first.');
      }

      console.log("Converting cosmos address:", cosmosAddress);

      // Convert cosmos address to Ethereum format
      const ethAddress = await convertCosmosToEthAddress(cosmosAddress);
      console.log("Converted to:", ethAddress);

      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: ethAddress,
        value: ethers.parseEther(transferToCosmosAmount),
        gasLimit: 21000
      });

      await tx.wait();
      alert(`✅ Transfer to Cosmos thành công!\nTx: ${tx.hash}\nAmount: ${transferToCosmosAmount} DTC`);
      setTransferToCosmosAmount('');
      await loadStakingInfo();
    } catch (error: any) {
      console.error(`❌ Lỗi transfer: ${error.message}`);
      alert(`❌ Lỗi transfer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.address) {
    return (
      <Card title="Validator Staking">
        <p className="text-center text-gray-500">Vui lòng kết nối ví để sử dụng tính năng staking</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card title="Staking Overview">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">DTC Address</p>
            <p className="font-mono text-sm">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Cosmos Address</p>
            <p className="font-mono text-sm">{cosmosAddress ? `${cosmosAddress.slice(0, 10)}...${cosmosAddress.slice(-8)}` : 'Not created'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Cosmos Balance</p>
            <p className="font-semibold">{parseFloat(cosmosBalance).toFixed(6)} DTC</p>
            <p className="text-xs text-gray-400">
              {cosmosBalance ? (parseFloat(cosmosBalance) * 1e18).toFixed(0) : '0'} aphoton
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'validators', label: 'Validators' },
          { key: 'staking', label: 'My Staking' },
          { key: 'rewards', label: 'Rewards' },
          { key: 'transfer', label: 'Transfer' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Validators Tab */}
      {activeTab === 'validators' && (
        <Card title="Available Validators">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {validators.map((validator, index) => (
                <div
                  key={validator.address}
                  className={`${
                    validator.jailed ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                    index === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                    'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  } rounded-lg p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        validator.jailed ? 'text-red-700 dark:text-red-300' :
                        index === 0 ? 'text-green-700 dark:text-green-300' :
                        'text-blue-700 dark:text-blue-300'
                      }`}>
                        {validator.moniker} ({validator.votingPowerPercent || '0.00'}%)
                      </p>
                      <p className="text-xs text-gray-500">Commission: {parseFloat(validator.commission).toFixed(2)}%</p>
                      <p className="text-xs text-gray-500">DTC: {(parseFloat(validator.tokens) / 1e18).toFixed(0)}</p>
                      {hasJoinedValidator(validator.address) && (
                        <p className="text-xs text-green-600 font-medium">
                          Delegated: {getDelegationAmount(validator.address)} DTC
                        </p>
                      )}
                      <p className={`text-xs truncate ${
                        validator.jailed ? 'text-red-600 dark:text-red-400' :
                        index === 0 ? 'text-green-600 dark:text-green-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {validator.address.slice(0, 20)}...
                      </p>
                      {validator.jailed && (
                        <p className="text-xs text-red-500 font-medium">JAILED</p>
                      )}
                    </div>

                    {!validator.jailed && (
                      <Button
                        onClick={() => handleJoinValidator(validator)}
                        disabled={loading || hasJoinedValidator(validator.address)}
                        size="sm"
                        className="ml-2"
                        variant={hasJoinedValidator(validator.address) ? "secondary" : "primary"}
                      >
                        {loading ? <LoadingSpinner size="sm" /> :
                         hasJoinedValidator(validator.address) ? 'Joined' : 'Join'}
                      </Button>
                    )}

                    <div className={`h-3 w-3 rounded-full flex-shrink-0 ml-2 ${
                      validator.jailed ? 'bg-red-500' :
                      index === 0 ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>

            {validators.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No validators found
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Staking Tab */}
      {activeTab === 'staking' && (
        <div className="space-y-6">
          <Card title="Delegate Tokens">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Validator</label>
                <select
                  value={selectedValidator}
                  onChange={(e) => setSelectedValidator(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Choose validator...</option>
                  {validators.map((v) => (
                    <option key={v.address} value={v.address}>{v.moniker}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Amount (DTC)"
                value={delegateAmount}
                onChange={(e) => setDelegateAmount(e.target.value)}
                placeholder="1.0"
                helperText="Enter amount in DTC tokens"
              />
              <div className="text-xs text-gray-500">
                ≈ {delegateAmount ? dtcToAphoton(delegateAmount) : '0'} aphoton
              </div>

              {/* Auto-transfer info */}
              {delegateAmount && cosmosBalance && (
                <div className="bg-blue-50 p-3 rounded-md text-sm">
                  <p className="font-medium text-blue-800">Auto-transfer Info:</p>
                  <p className="text-blue-600">
                    Cosmos Balance: {parseFloat(cosmosBalance).toFixed(6)} DTC
                  </p>
                  <p className="text-blue-600">
                    Delegate Amount: {delegateAmount} DTC
                  </p>
                  <p className="text-blue-600">
                    Estimated Gas: ~0.005 DTC
                  </p>
                  {parseFloat(cosmosBalance) < parseFloat(delegateAmount) + 0.005 && (
                    <p className="text-orange-600">
                      ⚠️ Will auto-transfer {(parseFloat(delegateAmount) + 0.005 - parseFloat(cosmosBalance)).toFixed(6)} DTC from your wallet
                    </p>
                  )}
                  {parseFloat(cosmosBalance) >= parseFloat(delegateAmount) + 0.005 && (
                    <p className="text-green-600">
                      ✅ Sufficient balance available (no transfer needed)
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleDelegate}
                disabled={loading || !selectedValidator || !delegateAmount}
                className="w-full"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Delegate (Auto-transfer if needed)'}
              </Button>
            </div>
          </Card>

          <Card title="Undelegate Tokens">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Validator</label>
                <select
                  value={selectedValidator}
                  onChange={(e) => setSelectedValidator(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Choose validator...</option>
                  {validators.map((v) => (
                    <option key={v.address} value={v.address}>{v.moniker}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Amount (DTC)"
                value={undelegateAmount}
                onChange={(e) => setUndelegateAmount(e.target.value)}
                placeholder="1.0"
                helperText="Enter amount in DTC tokens"
              />
              <div className="text-xs text-gray-500">
                ≈ {undelegateAmount ? dtcToAphoton(undelegateAmount) : '0'} aphoton
              </div>

              {/* Gas fee info for undelegate */}
              {(() => {
                const transferInfo = calculateUndelegateTransferInfo();
                if (!transferInfo) return null;

                return (
                  <div className="bg-blue-50 p-3 rounded-md text-sm">
                    <p className="font-medium text-blue-800">Gas Fee Info:</p>
                    <p className="text-blue-600">
                      Available: {transferInfo.available.toFixed(6)} DTC
                    </p>
                    <p className="text-blue-600">
                      Est. Gas: {transferInfo.estimatedGas.toFixed(6)} DTC
                    </p>
                    {transferInfo.needsTransfer ? (
                      <p className="text-orange-600">
                        ⚠️ Will auto-transfer {transferInfo.transferAmount.toFixed(6)} DTC for gas fees
                      </p>
                    ) : (
                      <p className="text-green-600">
                        ✅ Sufficient balance for gas fees
                      </p>
                    )}
                  </div>
                );
              })()}

              <Button
                onClick={handleUndelegate}
                disabled={loading || !selectedValidator || !undelegateAmount}
                variant="secondary"
                className="w-full"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Undelegate (Auto-transfer gas if needed)'}
              </Button>
            </div>
          </Card>

          {/* Current Delegations - show in DTC */}
          {stakingInfo && (
            <Card title="My Delegations">
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    Total Delegated: {stakingInfo.delegated} DTC
                  </p>
                </div>

                {/* Delegations by Validator */}
                {stakingInfo.delegations && stakingInfo.delegations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Delegations by Validator</h4>
                    <div className="space-y-2">
                      {stakingInfo.delegations.map((delegation, index) => {
                        const validator = validators.find(v => v.address === delegation.validator);
                        const validatorName = validator?.moniker || `Validator ${index + 1}`;
                        const delegatedDTC = aphotonToDtc(delegation.amount);

                        return (
                          <div key={delegation.validator} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {validatorName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {delegation.validator.slice(0, 20)}...
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-600 dark:text-blue-400">
                                {delegatedDTC} DTC
                              </p>
                              <p className="text-xs text-gray-500">
                                {Math.floor(parseFloat(delegation.amount))} aphoton
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Unbonding section */}
                {stakingInfo.unbonding.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Unbonding Delegations</h4>
                    <div className="space-y-2">
                      {stakingInfo.unbonding.map((ub, i) => {
                        const validator = validators.find(v => v.address === ub.validator);
                        const validatorName = validator?.moniker || `Validator ${i + 1}`;
                        const unbondingDTC = aphotonToDtc(ub.amount); // Convert from aphoton to DTC
                        const completionDate = new Date(ub.completionTime);
                        const now = new Date();
                        const daysLeft = Math.ceil((completionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <div key={i} className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex-1">
                              <p className="font-medium text-orange-900 dark:text-orange-100">
                                {validatorName}
                              </p>
                              <p className="text-xs text-orange-600 dark:text-orange-400">
                                {daysLeft > 0 ? (
                                  <>Complete in {daysLeft} days ({completionDate.toLocaleDateString()})</>
                                ) : (
                                  <>Ready to withdraw</>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-orange-600 dark:text-orange-400">
                                {unbondingDTC} DTC
                              </p>
                              <p className="text-xs text-orange-500">
                                {daysLeft > 0 ? 'Unbonding...' : 'Ready'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(!stakingInfo.delegations || stakingInfo.delegations.length === 0) && stakingInfo.unbonding.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <p>No active delegations</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <Card title="Staking Rewards">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {stakingInfo ? stakingInfo.rewards : '0'} aphoton
                </p>
                <p className="text-sm text-gray-500">
                  ~ {stakingInfo ? formatRewards(stakingInfo.rewards) : '0.000000'} DTC
                </p>
                <p className="text-sm text-gray-500">Available Rewards</p>
              </div>

              {/* Validator Selection for Withdraw */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Validator (for individual withdraw)</label>
                <select
                  value={selectedValidator}
                  onChange={(e) => setSelectedValidator(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Choose validator...</option>
                  {validators.map((v) => (
                    <option key={v.address} value={v.address}>{v.moniker}</option>
                  ))}
                </select>
              </div>

              {/* Rewards by Validator */}
              {stakingInfo?.validatorRewards && stakingInfo.validatorRewards.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Rewards by Validator</h4>
                  <div className="space-y-2">
                    {stakingInfo.validatorRewards.map((validatorReward, index) => {
                      const validator = validators.find(v => v.address === validatorReward.validator);
                      const validatorName = validator?.moniker || `Validator ${index + 1}`;

                      return (
                        <div key={validatorReward.validator} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {validatorName}
                          </span>
                          <div className="text-right">
                            <span className="text-green-600 font-medium">
                              {Math.floor(parseFloat(validatorReward.amount))} aphoton
                            </span>
                            <div className="text-xs text-gray-500">
                              ~ {formatRewards(validatorReward.amount)} DTC
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleWithdrawRewards()}
                  disabled={loading || !stakingInfo || parseFloat(stakingInfo.rewards) === 0}
                  className="w-full"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Withdraw All Rewards'}
                </Button>

                <Button
                  onClick={() => handleWithdrawRewards(selectedValidator)}
                  disabled={loading || !selectedValidator || !stakingInfo || parseFloat(stakingInfo.rewards) === 0}
                  variant="secondary"
                  className="w-full"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Withdraw from Selected'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Transfer Tab */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <Card title="Transfer DTC to Cosmos">
            <div className="space-y-4">
              <Input
                label="Amount (DTC)"
                value={transferToCosmosAmount}
                onChange={(e) => setTransferToCosmosAmount(e.target.value)}
                placeholder="0.1"
              />
              <Button
                onClick={handleTransferToCosmos}
                disabled={loading || !transferToCosmosAmount || !cosmosAddress}
                className="w-full"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Transfer to Cosmos'}
              </Button>
            </div>
          </Card>

          <Card title="Transfer Cosmos to DTC">
            <div className="space-y-4">
              <Input
                label="Amount (aphoton)"
                value={transferToETHAmount}
                onChange={(e) => setTransferToETHAmount(e.target.value)}
                placeholder="1000000000000000000"
              />
              <Button
                onClick={handleTransferToETH}
                disabled={loading || !transferToETHAmount}
                variant="secondary"
                className="w-full"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Transfer to DTC'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


