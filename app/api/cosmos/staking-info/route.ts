import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyName = searchParams.get('keyName');
    const ethAddress = searchParams.get('ethAddress');

    if (!keyName || !ethAddress) {
      throw new Error('Missing keyName or ethAddress');
    }

    // Get cosmos address
    let cosmosAddress = '';
    try {
      const showKeyCommand = `ethermintd keys show ${keyName} --keyring-backend test --output json`;
      const { stdout } = await execAsync(showKeyCommand);
      const keyInfo = JSON.parse(stdout);
      cosmosAddress = keyInfo.address;
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Cosmos key not found' });
    }

    // Get balance
    const balanceCommand = `ethermintd query bank balances ${cosmosAddress} --output json`;
    const { stdout: balanceOutput } = await execAsync(balanceCommand);
    const balanceData = JSON.parse(balanceOutput);
    const aphotonBalance = balanceData.balances.find((b: any) => b.denom === 'aphoton');
    const cosmosBalance = aphotonBalance ? (parseFloat(aphotonBalance.amount) / 1e18).toString() : '0';

    // Get delegations
    const delegationsCommand = `ethermintd query staking delegations ${cosmosAddress} --output json`;
    const { stdout: delegationsOutput } = await execAsync(delegationsCommand);
    const delegationsData = JSON.parse(delegationsOutput);
    const totalDelegated = delegationsData.delegation_responses?.reduce((sum: number, del: any) => {
      return sum + parseFloat(del.balance.amount);
    }, 0) || 0;

    // Extract delegations details
    const delegations = delegationsData.delegation_responses?.map((del: any) => ({
      validator: del.delegation.validator_address,
      amount: del.balance.amount
    })) || [];

    // Get rewards
    const rewardsCommand = `ethermintd query distribution rewards ${cosmosAddress} --output json`;
    const { stdout: rewardsOutput } = await execAsync(rewardsCommand);
    const rewardsData = JSON.parse(rewardsOutput);

    console.log('Raw rewards data:', rewardsData);

    // Calculate total rewards and individual validator rewards
    const validatorRewards: Array<{validator: string, amount: string}> = [];
    const totalRewards = rewardsData.rewards?.reduce((sum: number, reward: any) => {
      const rewardAmount = reward.reward?.[0] ? parseFloat(reward.reward[0].amount) : 0;
      console.log(`Reward from ${reward.validator_address}: ${rewardAmount}`);

      if (rewardAmount > 0) {
        validatorRewards.push({
          validator: reward.validator_address,
          amount: rewardAmount.toString()
        });
      }

      return sum + rewardAmount;
    }, 0) || 0;

    console.log('Total rewards (aphoton):', totalRewards);
    console.log('Validator rewards:', validatorRewards);

    // Get unbonding delegations
    const unbondingCommand = `ethermintd query staking unbonding-delegations ${cosmosAddress} --output json`;
    const { stdout: unbondingOutput } = await execAsync(unbondingCommand);
    const unbondingData = JSON.parse(unbondingOutput);
    const unbonding = unbondingData.unbonding_responses?.flatMap((ub: any) =>
      ub.entries.map((entry: any) => ({
        validator: ub.validator_address,
        amount: entry.balance, // Keep in aphoton, will convert in UI
        completionTime: entry.completion_time
      }))
    ) || [];

    const stakingInfo = {
      delegated: (totalDelegated / 1e18).toString(),
      rewards: totalRewards,
      delegations: delegationsData.delegation_responses?.map((del: any) => ({
        validator: del.delegation.validator_address,
        amount: del.balance.amount
      })) || [],
      unbonding,
      validatorRewards
    };

    return NextResponse.json({
      success: true,
      stakingInfo,
      cosmosAddress,
      cosmosBalance
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
