import React, { useState } from 'react';

interface JobPopupProps {
  jobData: {
    jobType: string;
    cpu: string;
    mem: string;
    storageSsd: string;
    gpuInfo: string;
  };
  onClose: () => void;
  onConfirm: (dtcAmount: string) => void;
}

const JobPopup: React.FC<JobPopupProps> = ({ jobData, onClose, onConfirm }) => {
  const [dtcAmount, setDtcAmount] = useState('');

  const handleConfirm = () => {
    if (!dtcAmount || isNaN(Number(dtcAmount)) || Number(dtcAmount) <= 0) {
      alert('Please enter valid payment amount');
      return;
    }
    onConfirm(dtcAmount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Confirm Job Deployment</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold text-lg mb-2">Job Details</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Job Type:</span>
              <span className="font-medium">{jobData.jobType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">CPU:</span>
              <span className="font-medium">{jobData.cpu} cores</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Memory:</span>
              <span className="font-medium">{jobData.mem} Gi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Storage SSD:</span>
              <span className="font-medium">{jobData.storageSsd} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">GPU Info:</span>
              <span className="font-medium">{jobData.gpuInfo}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-medium">Payment (DTC)</label>
          <input
            type="number"
            value={dtcAmount}
            onChange={(e) => setDtcAmount(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter DTC amount"
            min="0"
            step="0.01"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm and Deploy
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobPopup;