'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import { config } from '../config';
import TabContainer from './components/TabContainer';
import JobList from './components/JobList';
import JobDetail from './components/JobDetail';
import CreateJobForm from './components/CreateJobForm';
import JobPopup from './components/JobPopup';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobResult, setJobResult] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupJobData, setPopupJobData] = useState<any>(null);
  const selectedJobType = searchParams.get('type') || '';
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');

  const JOB_PAYMENT_ABI = [
    "function getJobTypes() view returns (string[])",
    "function requestJob(string calldata jobType, uint256 cpu, uint256 mem, uint256 storageSsd, string calldata gpuInfo) payable",
    "function getJobDetails(uint256 jobId) view returns (uint256 id, address requester, address provider, string jobType, uint256 cpu, uint256 mem, uint256 storageSsd, string gpuInfo, uint256 totalPayment, uint256 paidToProvider, uint8 status, string resultHash, uint256 createdAt)",
    "function nextJobId() view returns (uint256)",
    "function jobs(uint256) view returns (uint256 id, address requester, address provider, string jobType, uint256 cpu, uint256 mem, uint256 storageSsd, string gpuInfo, uint256 totalPayment, uint256 paidToProvider, uint8 status, string resultHash, uint256 createdAt)",
    "event JobRequested(uint256 indexed jobId, address indexed requester, string jobType, uint256 payment)",
    "event JobCompleted(uint256 indexed jobId, string resultHash)"
  ];

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
              params: jobRaw.gpuInfo && jobRaw.gpuInfo.length > 0
                ? `CPU: ${jobRaw.cpu}, Memory: ${jobRaw.mem}Gi, Storage: ${jobRaw.storageSsd}GB, GPU Info: ${jobRaw.gpuInfo}`
                : `CPU: ${jobRaw.cpu}, Memory: ${jobRaw.mem}Gi, Storage: ${jobRaw.storageSsd}GB`,
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

  const handleJobSelect = (jobType: string) => {
    // Set view to detail and store selected job type
    setView('detail');
    window.history.pushState({}, '', `/jobs?type=${jobType}`);
  };

  const handleStartJob = (jobType: string) => {
    // Set view to create and store selected job type
    setView('create');
    window.history.pushState({}, '', `/jobs?type=${jobType}&view=create`);
  };

  const handleBackToList = () => {
    // Redirect back to main jobs page
    window.location.href = '/jobs';
  };

  const handleShowPopup = (jobData: any) => {
    setPopupJobData(jobData);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleConfirmJob = async (dtcAmount: string) => {
    if (!wallet.address || !provider) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, signer);

      // Convert payment to wei
      const paymentInWei = ethers.parseEther(dtcAmount);

      // Call requestJob with all parameters
      const tx = await contract.requestJob(
        popupJobData.jobType,
        popupJobData.cpu,
        popupJobData.mem,
        popupJobData.storageSsd,
        popupJobData.gpuInfo,
        { value: paymentInWei }
      );

      await tx.wait();
      alert('✅ Job created successfully!');
      setShowPopup(false);
      loadMyJobs();
      setView('list');
      window.history.pushState({}, '', '/jobs');
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert(`❌ Failed to create job: ${error.message || error}`);
    }
  };

  const renderJobList = () => (
    <JobList onJobSelect={handleJobSelect} />
  );

  const renderMyJobs = () => (
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
        <p className="text-gray-700 dark:text-gray-300">No jobs found.</p>
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
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">🔧 Job Management</h1>

        {jobResult && (
          <div className="mb-6 p-4 bg-green-100 text-green-900 rounded">
            <strong>Job Result:</strong> {jobResult}
          </div>
        )}

        {/* Nếu có type parameter thì hiển thị trang detail hoặc form tạo job */}
        {selectedJobType ? (
          view === 'detail' ? (
            <JobDetail
              jobType={selectedJobType}
              onStartJob={handleStartJob}
              onBack={() => setView('list')}
            />
          ) : view === 'create' ? (
            <CreateJobForm
              jobType={selectedJobType}
              onBack={() => setView('detail')}
              onJobCreated={loadMyJobs}
              onShowPopup={handleShowPopup}
            />
          ) : (
            <TabContainer tabLabels={['List Jobs', 'My Jobs']}>
              {renderJobList()}
              {renderMyJobs()}
            </TabContainer>
          )
        ) : (
          <TabContainer tabLabels={['List Jobs', 'My Jobs']}>
            {renderJobList()}
            {renderMyJobs()}
          </TabContainer>
        )}

        {showPopup && (
          <JobPopup
            jobData={popupJobData}
            onClose={handleClosePopup}
            onConfirm={handleConfirmJob}
          />
        )}
      </div>
    </div>
  );
};

export default JobsPage;
