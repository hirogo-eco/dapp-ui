'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import { config } from '../config';

const JobsPage: React.FC = () => {
  const { wallet, provider } = useWeb3();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jobForm, setJobForm] = useState<{ jobType: string; params: Record<string, string> }>({
    jobType: 'data_processing',
    params: {}
  });
  const [jobResult, setJobResult] = useState<string | null>(null);

  const JOB_PAYMENT_ABI = [
    "function requestJob(string memory jobType, string memory params) external payable",
    "function jobs(uint256) view returns (uint256 id, address requester, address provider, string jobType, uint256 payment, uint8 status, uint256 createdAt, uint256 completedAt, string params)",
    "function jobTypePrices(string) view returns (uint256)",
    "function nextJobId() view returns (uint256)",
    "event JobRequested(uint256 indexed jobId, address indexed requester, string jobType, uint256 payment)",
    "event JobCompleted(uint256 indexed jobId, bool success)",
    "function getJobResult(uint256 jobId) view returns (string)"
  ];

  const jobTypes = [
    { value: 'data_processing', label: 'Data Processing', price: '10' },
    { value: 'ai_training', label: 'AI Training', price: '50' },
    { value: 'image_analysis', label: 'Image Analysis', price: '20' },
    { value: 'text_analysis', label: 'Text Analysis', price: '15' },
    { value: 'text_generation', label: 'Text Generation', price: '25' },
    { value: 'image_generation', label: 'Image Generation', price: '30' },
    { value: 'speech_to_text', label: 'Speech to Text', price: '40' }
  ];

  const statusLabels = ['Pending', 'Running', 'Completed', 'Failed', 'Cancelled'];

  const jobTypeFields: Record<string, { label: string; placeholder: string; key: string }[]> = {
    data_processing: [
      { label: 'Numbers', placeholder: 'Enter numbers (comma-separated)', key: 'numbers' }
    ],
    text_analysis: [
      { label: 'Text', placeholder: 'Enter text for analysis', key: 'text' }
    ],
    image_analysis: [
      { label: 'Image URL', placeholder: 'Enter image URL', key: 'image_url' }
    ],
    text_generation: [
      { label: 'Prompt', placeholder: 'Enter prompt for text generation', key: 'prompt' }
    ],
    image_generation: [
      { label: 'Prompt', placeholder: 'Enter prompt for image generation', key: 'prompt' }
    ],
    speech_to_text: [
      { label: 'Audio URL', placeholder: 'Enter audio URL', key: 'audio_url' }
    ]
  };

  const createJob = async () => {
    if (!wallet.address || !provider) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setJobResult(null); // Reset kết quả trước khi tạo job
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, signer);

      // Check job price
      const jobPrice = await contract.jobTypePrices(jobForm.jobType);
      console.log(`Job price: ${ethers.formatEther(jobPrice)} DTC`);

      // Check if user has enough DTC balance
      const userBalance = await provider.getBalance(wallet.address);
      console.log(`User balance: ${ethers.formatEther(userBalance)} DTC`);

      if (userBalance < jobPrice) {
        alert(`❌ Insufficient DTC balance. Need: ${ethers.formatEther(jobPrice)} DTC`);
        return;
      }

      // Send transaction with DTC
      const tx = await contract.requestJob(jobForm.jobType, JSON.stringify(jobForm.params), { value: jobPrice });
      console.log('Transaction sent:', tx.hash);

      await tx.wait();
      console.log('Transaction confirmed');

      alert('✅ Job created successfully! Backend will process it automatically.');
      setJobForm({ jobType: 'data_processing', params: {} });

      // Refresh job list
      await loadMyJobs();
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert(`❌ Failed to create job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!provider || !wallet.address) return;

    const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, provider);

    const handleJobCompleted = async (jobId: ethers.BigNumber, success: boolean) => {
      console.log(`🔔 JobCompleted event received for jobId: ${jobId.toString()}, success: ${success}`);

      // Lấy thông tin chi tiết của job từ hợp đồng
      const job = await contract.jobs(jobId);
      console.log(`🔍 Job details:`, job);

      if (job.requester.toLowerCase() == wallet.address.toLowerCase()) {
        let resultText = '';
        if (success) {
          resultText = await contract.getJobResult(jobId);
          setJobResult(`Job ${jobId} completed successfully: ${resultText}`);
        } else {
          setJobResult(`Job ${jobId} failed.`);
        }
      }

      await loadMyJobs();
    };

    // Lắng nghe sự kiện JobCompleted
    contract.on("JobCompleted", handleJobCompleted);

    return () => {
      // Gỡ bỏ listener khi component bị unmount
      contract.off("JobCompleted", handleJobCompleted);
    };
  }, [provider, wallet.address]);

  const loadMyJobs = async () => {
    if (!wallet.address) return;

    try {
      // Use same RPC as backend to get fresh data
      const directProvider = new ethers.JsonRpcProvider(config.RPC_URL);
      const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, directProvider);

      console.log('🔍 Using direct RPC:', config.RPC_URL);

      const nextJobId = await contract.nextJobId();
      console.log('🔍 Next job ID:', nextJobId.toString());

      const myJobs = [];
      for (let i = 1; i < nextJobId; i++) {
        try {
          const job = await contract.jobs(i);
          console.log(`🔍 Job ${i} status from direct RPC:`, job.status.toString());

          if (job.requester.toLowerCase() === wallet.address.toLowerCase()) {
            myJobs.push({
              id: job.id.toString(),
              jobType: job.jobType,
              payment: ethers.formatEther(job.payment),
              status: statusLabels[Number(job.status)] || 'Unknown',
              params: job.params,
              createdAt: new Date(Number(job.createdAt) * 1000).toLocaleString()
            });
          }
        } catch (err) {
          console.error(`❌ Error loading job ${i}:`, err);
        }
      }

      setJobs(myJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  useEffect(() => {
    console.log('🔍 Config check:', {
      JOB_PAYMENT_ADDRESS: config.JOB_PAYMENT_ADDRESS,
      RPC_URL: config.RPC_URL,
      CHAIN_ID: config.CHAIN_ID
    });

    if (wallet.address) {
      loadMyJobs();
    }
  }, [wallet.address]);

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className=" max-w-7xl min-h-screen mx-auto px-8 sm:px-12 lg:px-12 py-8">
        <h1 className="text-3xl font-bold mb-6">🔧 Job Management</h1>
        {/* Create Job Form */}
        <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Job</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Job Type</label>
              <select
                value={jobForm.jobType}
                onChange={(e) => setJobForm({ jobType: e.target.value, params: {} })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
              >
                {jobTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.price} DTC
                  </option>
                ))}
              </select>
            </div>

            {jobTypeFields[jobForm.jobType]?.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{field.label}</label>
                <input
                  type="text"
                  value={jobForm.params[field.key] || ''}
                  onChange={(e) =>
                    setJobForm({
                      ...jobForm,
                      params: { ...jobForm.params, [field.key]: e.target.value }
                    })
                  }
                  placeholder={field.placeholder}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            onClick={createJob}
            disabled={!wallet.address || loading}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </div>

        {jobResult && (
          <div className="mt-4 bg-green-100 text-green-800 p-4 rounded mb-4">
            <h3 className="font-bold">Job Result:</h3>
            <p>{jobResult}</p>
          </div>
        )}

        {/* Job List */}
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">My Jobs</h2>
            <button
              onClick={loadMyJobs}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="text-gray-700 dark:text-gray-300">No jobs found. Create your first job!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">ID</th>
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Type</th>
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Payment</th>
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Status</th>
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Created</th>
                    <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Parameters</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => (
                    <tr key={job.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">#{job.id}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{job.jobType}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{job.payment} DTC</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          job.status == 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          job.status == 'Running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          job.status == 'Failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{job.createdAt}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{job.params || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
