'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import { config } from '../config';

interface Job {
  id: string;
  jobType: string;
  payment: string;
  status: string;
  createdAt: string;
  params: string;
}
const statusLabels = ['Created', 'Assigned', 'Running', 'Completed', 'Cancelled', 'Disputed'];
const JobsPage: React.FC = () => {
  const { wallet, provider } = useWeb3();
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobForm, setJobForm] = useState({
    jobType: '',
    payment: '',
    cpu: '',
    mem: '',
    gpu: '',
  });
  const [jobResult, setJobResult] = useState<string | null>(null);

  const JOB_PAYMENT_ABI = [
    "function getJobTypes() view returns (string[])",
    "function requestJob(string calldata jobType, uint256 cpu, uint256 mem, uint256 gpu, string calldata params) payable",
    "function getJobDetails(uint256 jobId) view returns (uint256 id, address requester, address provider, string jobType, uint256 cpu, uint256 mem, uint256 gpu, uint256 totalPayment, uint256 paidToProvider, uint8 status, string resultHash, string params, uint256 createdAt, uint256 updatedAt)",
    "function nextJobId() view returns (uint256)",
    "function jobs(uint256) view returns (uint256 id, address requester, address provider, string jobType, uint256 cpu, uint256 mem, uint256 gpu, uint256 totalPayment, uint256 paidToProvider, uint8 status, string resultHash, string params, uint256 createdAt, uint256 updatedAt)",
    "event JobRequested(uint256 indexed jobId, address indexed requester, string jobType, uint256 payment)",
    "event JobCompleted(uint256 indexed jobId, string resultHash)"
  ];

  useEffect(() => {
    if (!provider) return;

    const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, provider);

    async function fetchJobTypes() {
      try {
        const types: string[] = await contract.getJobTypes();
        setJobTypes(types);
        if(types.length > 0) setJobForm((f) => ({ ...f, jobType: types[0] }));
      } catch (error) {
        console.error("Failed to fetch job types:", error);
      }
    }

    fetchJobTypes();
  }, [provider]);

  const createJob = async () => {
    if (!wallet.address || !provider) {
      alert('Please connect your wallet first');
      return;
    }

    if (!jobForm.jobType) {
      alert('Please select job type');
      return;
    }

    if (!jobForm.payment || isNaN(Number(jobForm.payment)) || Number(jobForm.payment) <= 0) {
      alert('Please enter valid payment amount');
      return;
    }

    const userBalance = await provider.getBalance(wallet.address);
    if (userBalance < Number(jobForm.payment)) {
      alert(`❌ Insufficient DTC balance. Need: ${ethers.formatEther(jobForm.payment)} DTC`);
      return;
    }

    setLoading(true);
    setJobResult(null);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, signer);

      // Chuẩn bị params và các tham số riêng biệt
      const cpu = Number(jobForm.cpu) || 1;
      const mem = Number(jobForm.mem) || 512;
      const gpu = Number(jobForm.gpu) || 0;

      const paramsObj = {
        cpu: cpu,
        mem: mem,
        gpu: gpu,
      };
      const paramsStr = JSON.stringify(paramsObj);

      const tx = await contract.requestJob(jobForm.jobType, cpu, mem, gpu, paramsStr, { value:  ethers.parseEther(jobForm.payment.toString()) });

      await tx.wait();

      alert('✅ Job created successfully!');
      setJobForm((f) => ({
        ...f,
        payment: '',
        cpu: '',
        mem: '',
        gpu: '',
      }));

      loadMyJobs();
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert(`❌ Failed to create job: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMyJobs = async () => {
    if (!wallet.address || !provider) return;

    try {
      const directProvider = new ethers.JsonRpcProvider(config.RPC_URL);
      const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, directProvider);

      const nextJobId = await contract.nextJobId();
      const myJobs: Job[] = [];

      for (let i = 1; i < nextJobId; i++) {
        try {
          const jobRaw = await contract.getJobDetails(i);
          if (jobRaw.requester.toLowerCase() == wallet.address.toLowerCase()) {
            myJobs.push({
              id: jobRaw.id.toString(),
              jobType: jobRaw.jobType,
              payment: ethers.formatEther(jobRaw.totalPayment),
              status: statusLabels[jobRaw.status] || 'Unknown',
              createdAt: new Date(Number(jobRaw.createdAt) * 1000).toLocaleString(),
              params: jobRaw.params,
            });
          }
        } catch (e) {
          console.error('Load job error:', e);
        }
      }

      setJobs(myJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  useEffect(() => {
    if (!provider || !wallet.address) return;

    const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, provider);

    const handleJobCompleted = async (jobId: bigint, resultHash: string) => {
      try {
        setJobResult(`Job #${jobId.toString()} completed with result: ${resultHash}`);
      } catch {
        setJobResult(`Job #${jobId.toString()} completed.`);
      }
      loadMyJobs();
    };

    contract.on("JobCompleted", handleJobCompleted);

    return () => {
      contract.off("JobCompleted", handleJobCompleted);
    };
  }, [provider, wallet.address]);

  useEffect(() => {
    if (wallet.address) {
      loadMyJobs();
    }
  }, [wallet.address]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">🔧 Job Management</h1>

        <div className="bg-white dark:bg-gray-800 rounded shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Job</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium text-gray-900 dark:text-gray-100">Job Type</label>
              <select
                value={jobForm.jobType}
                onChange={e => setJobForm({ ...jobForm, jobType: e.target.value })}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {jobTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-900 dark:text-gray-100">Payment (DTC)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={jobForm.payment}
                onChange={e => setJobForm({ ...jobForm, payment: e.target.value })}
                placeholder="Enter DTC amount"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-900 dark:text-gray-100">CPU</label>
              <input
                type="number"
                min="0"
                step="1"
                value={jobForm.cpu}
                onChange={e => setJobForm({ ...jobForm, cpu: e.target.value })}
                placeholder="Number of CPUs"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-900 dark:text-gray-100">Memory (MB)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={jobForm.mem}
                onChange={e => setJobForm({ ...jobForm, mem: e.target.value })}
                placeholder="Memory in MB"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-900 dark:text-gray-100">GPU</label>
              <input
                type="number"
                min="0"
                step="1"
                value={jobForm.gpu}
                onChange={e => setJobForm({ ...jobForm, gpu: e.target.value })}
                placeholder="Number of GPUs"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <button
            disabled={loading}
            onClick={createJob}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </div>

        {jobResult && (
          <div className="mb-6 p-4 bg-green-100 text-green-900 rounded">
            <strong>Job Result:</strong> {jobResult}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded shadow p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">My Jobs</h2>
            <button
              onClick={loadMyJobs}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>

          {jobs.length == 0 ? (
            <p className="text-gray-700 dark:text-gray-300">No jobs found. Create one above!</p>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="border px-3 py-2">ID</th>
                  <th className="border px-3 py-2">Type</th>
                  <th className="border px-3 py-2">Payment (DTC)</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Created At</th>
                  <th className="border px-3 py-2">Params</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                    <td className="border px-3 py-2">{job.id}</td>
                    <td className="border px-3 py-2">{job.jobType}</td>
                    <td className="border px-3 py-2">{job.payment}</td>
                    <td className="border px-3 py-2">{job.status}</td>
                    <td className="border px-3 py-2">{job.createdAt}</td>
                    <td className="border px-3 py-2 whitespace-pre-wrap">{job.params}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
