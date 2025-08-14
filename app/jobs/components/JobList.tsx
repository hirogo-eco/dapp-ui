import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { config } from '../../config';

interface JobType {
  name: string;
}

interface JobListProps {
  onJobSelect: (jobType: string) => void;
}

const JobList: React.FC<JobListProps> = ({ onJobSelect }) => {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);

  const JOB_PAYMENT_ABI = [
    "function getJobTypes() view returns (string[])",
  ];

  useEffect(() => {
    const fetchJobTypes = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, JOB_PAYMENT_ABI, provider);
        const types: string[] = await contract.getJobTypes();
        const typeObjects = types.map(type => ({ name: type }));
        setJobTypes(typeObjects);
      } catch (error) {
        console.error("Failed to fetch job types:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobTypes();
  }, []);

  if (loading) {
    return <div>Loading job types...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Available Job Types</h2>
      {jobTypes.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">No job types available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobTypes.map((jobType, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => onJobSelect(jobType.name)}
            >
              <h3 className="font-medium text-lg">{jobType.name}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobList;