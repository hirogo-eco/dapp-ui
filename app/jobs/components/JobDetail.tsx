import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { config } from '../../config';

interface JobDetailProps {
  jobType: string;
  onStartJob: (jobType: string) => void;
  onBack: () => void;
}

const JobDetail: React.FC<JobDetailProps> = ({ jobType, onStartJob, onBack }) => {
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReadme = async () => {
      try {
        // Get job type info from contract
        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, [
          "function getJobTypeInfo(string calldata jobType) view returns (string image, string readme, string yaml, bool exists)"
        ], provider);

        const jobTypeInfo = await contract.getJobTypeInfo(jobType);

        // Fetch readme content
        const response = await fetch(jobTypeInfo.readme);
        if (response.ok) {
          const content = await response.text();
          setReadmeContent(content);
        } else {
          setReadmeContent('Failed to load job description');
        }
      } catch (error) {
        console.error('Failed to load readme:', error);
        setReadmeContent('Failed to load job description');
      } finally {
        setLoading(false);
      }
    };

    loadReadme();
  }, [jobType]);

  if (loading) {
    return <div>Loading job details...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{jobType} Job Details</h2>

        <button
          onClick={() => onStartJob(jobType)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Start Job
        </button>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: readmeContent }} />
      </div>
      <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={onBack}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
        </div>
    </div>

  );
};

export default JobDetail;