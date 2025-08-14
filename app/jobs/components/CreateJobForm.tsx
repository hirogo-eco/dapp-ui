import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { config } from '../../config';

interface CreateJobFormProps {
  jobType: string;
  onBack: () => void;
  onJobCreated: () => void;
  onShowPopup: (jobData: any) => void;
}

const CreateJobForm: React.FC<CreateJobFormProps> = ({ jobType, onBack, onJobCreated, onShowPopup }) => {
  const { wallet, provider } = useWeb3();
  const [activeTab, setActiveTab] = useState<'builder' | 'yaml'>('builder');
  const [jobForm, setJobForm] = useState({
    cpu: '1',
    mem: '1',
    gpu: '0',
    storageSsd: '1',
    gpuVendor: 'nvidia',
    gpuModel: 'rtx3060',
    gpuMemory: '8Gi',
    gpuInterface: 'pcie',
  });
  const [loading, setLoading] = useState(false);
  const [yamlContent, setYamlContent] = useState<string>('');

  // Load YAML content when component mounts or jobType changes
  useEffect(() => {
    const loadYamlContent = async () => {
      try {
        // Get job type info from contract
        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, [
          "function getJobTypeInfo(string calldata jobType) view returns (string image, string readme, string yaml, bool exists)"
        ], provider);

        const jobTypeInfo = await contract.getJobTypeInfo(jobType);

        // Set job type image
        setJobTypeImage(jobTypeInfo.image);

        // Fetch YAML content
        const response = await fetch(jobTypeInfo.yaml);
        if (response.ok) {
          const content = await response.text();
          // Update the YAML content with job type image and current form values
          const updatedContent = content
            .replace(/name: .*/, `name: job_${jobType}_${Date.now()}`)
            .replace(/image: .*/, `image: ${jobTypeInfo.image}`);
          setYamlContent(updatedContent);
        } else {
          throw new Error('Failed to fetch YAML file');
        }
      } catch (error) {
        console.error('Failed to load yaml:', error);
        // Fallback to default content from the actual file
        const content = ``;
        setYamlContent(content);
      }
    };

    loadYamlContent();
  }, [jobType]);

  // Load job type info to get image
  const [jobTypeImage, setJobTypeImage] = useState<string>('');
  useEffect(() => {
    const loadJobTypeInfo = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const contract = new ethers.Contract(config.JOB_PAYMENT_ADDRESS, [
          "function getJobTypeInfo(string calldata jobType) view returns (string image, string readme, string yaml, bool exists)"
        ], provider);

        const jobTypeInfo = await contract.getJobTypeInfo(jobType);
        setJobTypeImage(jobTypeInfo.image);
      } catch (error) {
        console.error('Failed to load job type info:', error);
      }
    };

    loadJobTypeInfo();
  }, [jobType]);

  // Update YAML content when form values change
  useEffect(() => {
    // Only update YAML when we have the YAML content
    if (!yamlContent) return;

    // Update YAML content with form values
    let updatedYaml = yamlContent;

    // Update resources section
    updatedYaml = updatedYaml
      .replace(/cpu:\s*.*/, `cpu: ${jobForm.cpu}`)
      .replace(/memory:\s*.*/, `memory: ${jobForm.mem}Gi`)
      .replace(/gpu:\s*.*/, `gpu: ${jobForm.gpu}`)
      .replace(/storageSsd:\s*.*/, `storageSsd: ${jobForm.storageSsd}Gi`)
      .replace(/gpuVendor:\s*.*/, `gpuVendor: ${jobForm.gpuVendor}`)
      .replace(/gpuModel:\s*.*/, `gpuModel: ${jobForm.gpuModel}`)
      .replace(/gpuMemory:\s*.*/, `gpuMemory: ${jobForm.gpuMemory}`)
      .replace(/gpuInterface:\s*.*/, `gpuInterface: ${jobForm.gpuInterface}`);

    setYamlContent(updatedYaml);
  }, [jobForm, yamlContent, jobType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setJobForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleYamlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setYamlContent(content);

    // Parse YAML content and update form values
    try {
      // Simple parsing for demonstration - in a real app, you'd use a proper YAML parser
      const lines = content.split('\n');
      const newJobForm = { ...jobForm };

      lines.forEach(line => {
        if (line.includes('cpu:')) {
          const cpuMatch = line.match(/cpu:\s*(\d+)/);
          if (cpuMatch && cpuMatch[1]) {
            newJobForm.cpu = cpuMatch[1];
          }
        }
        if (line.includes('memory:')) {
          const memMatch = line.match(/memory:\s*(\d+)/);
          if (memMatch && memMatch[1]) {
            newJobForm.mem = memMatch[1];
          }
        }
        if (line.includes('gpu:')) {
          const gpuMatch = line.match(/gpu:\s*(\d+)/);
          if (gpuMatch && gpuMatch[1]) {
            newJobForm.gpu = gpuMatch[1];
          }
        }
        if (line.includes('storageSsd:')) {
          const storageMatch = line.match(/storageSsd:\s*(\d+)/);
          if (storageMatch && storageMatch[1]) {
            newJobForm.storageSsd = storageMatch[1];
          }
        }
        if (line.includes('gpuVendor:')) {
          const vendorMatch = line.match(/gpuVendor:\s*(\w+)/);
          if (vendorMatch && vendorMatch[1]) {
            newJobForm.gpuVendor = vendorMatch[1];
          }
        }
        if (line.includes('gpuModel:')) {
          const modelMatch = line.match(/gpuModel:\s*([^\s]+)/);
          if (modelMatch && modelMatch[1]) {
            newJobForm.gpuModel = modelMatch[1];
          }
        }
        if (line.includes('gpuMemory:')) {
          const memoryMatch = line.match(/gpuMemory:\s*([^\s]+)/);
          if (memoryMatch && memoryMatch[1]) {
            newJobForm.gpuMemory = memoryMatch[1];
          }
        }
        if (line.includes('gpuInterface:')) {
          const interfaceMatch = line.match(/gpuInterface:\s*([^\s]+)/);
          if (interfaceMatch && interfaceMatch[1]) {
            newJobForm.gpuInterface = interfaceMatch[1];
          }
        }
      });

      setJobForm(newJobForm);
    } catch (error) {
      console.error('Failed to parse YAML:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet.address || !provider) {
      alert('Please connect your wallet first');
      return;
    }

    // Show popup with job data
    const jobData = {
      jobType,
      cpu: jobForm.cpu,
      mem: jobForm.mem,
      storageSsd: jobForm.storageSsd,
      gpu: jobForm.gpu,
      gpuInfo: `${jobForm.gpuVendor}:${jobForm.gpuModel}:${jobForm.gpuMemory}:${jobForm.gpuInterface}:${jobForm.gpu}`,
      yamlContent: yamlContent,
    };

    onShowPopup(jobData);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Create {jobType} Job</h2>
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Back to Job Details
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'builder'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('builder')}
        >
          Builder
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'yaml'
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('yaml')}
        >
          YAML
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'builder' ? (
          // Builder Tab Content
          <div className="space-y-6">
          {/* CPU */}
          <div className="bg-gray-800 p-4 rounded">
            <div className="flex justify-between items-center">
              <label className="font-medium text-white">CPU</label>
              <input
                type="number"
                name="cpu"
                value={jobForm.cpu}
                onChange={handleInputChange}
                className="w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
              />
            </div>
            <input
              type="range"
              min="1"
              max="64"
              value={jobForm.cpu}
              onChange={handleInputChange}
              name="cpu"
              className="w-full mt-2"
            />
          </div>



          {/* Memory */}
          <div className="bg-gray-800 p-4 rounded">
            <div className="flex justify-between items-center">
              <label className="font-medium text-white">Memory (GB)</label>
              <input
                type="number"
                name="mem"
                value={jobForm.mem}
                onChange={handleInputChange}
                className="w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
              />
            </div>
            <input
              type="range"
              min="1"
              max="256"
              value={jobForm.mem}
              onChange={handleInputChange}
              name="mem"
              className="w-full mt-2"
            />
          </div>

                    {/* GPU */}
                    <div className="bg-gray-800 p-4 rounded">
                      <div className="flex justify-between items-center">
                        <label className="font-medium text-white">GPU</label>
                        <input
                          type="number"
                          name="gpu"
                          value={jobForm.gpu}
                          onChange={handleInputChange}
                          className="w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        value={jobForm.gpu}
                        onChange={handleInputChange}
                        name="gpu"
                        className="w-full mt-2"
                      />

                      {/* GPU Filters */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                        <select
                          name="gpuVendor"
                          value={jobForm.gpuVendor}
                          onChange={handleInputChange}
                          className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
                        >
                          <option value="nvidia">nvidia</option>
                          <option value="amd">amd</option>
                        </select>
                        <select
                          name="gpuModel"
                          value={jobForm.gpuModel}
                          onChange={handleInputChange}
                          className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
                        >
                          <option value="rtx3060">rtx3060</option>
                          <option value="rtx3090">rtx3090</option>
                        </select>
                        <select
                          name="gpuMemory"
                          value={jobForm.gpuMemory}
                          onChange={handleInputChange}
                          className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
                        >
                          <option value="8Gi">8Gi</option>
                          <option value="12Gi">12Gi</option>
                          <option value="24Gi">24Gi</option>
                        </select>
                        <select
                          name="gpuInterface"
                          value={jobForm.gpuInterface}
                          onChange={handleInputChange}
                          className="px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
                        >
                          <option value="pcie">pcie</option>
                          <option value="nvlink">nvlink</option>
                        </select>
                      </div>
                    </div>
          {/* Ephemeral Storage */}
          <div className="bg-gray-800 p-4 rounded">
            <div className="flex justify-between items-center">
              <label className="font-medium text-white">Ephemeral Storage (GB)</label>
              <input
                type="number"
                name="storageSsd"
                value={jobForm.storageSsd}
                onChange={handleInputChange}
                className="w-20 px-2 py-1 rounded bg-gray-700 text-white border border-gray-600"
              />
            </div>
            <input
              type="range"
              min="1"
              max="2000"
              value={jobForm.storageSsd}
              onChange={handleInputChange}
              name="storageSsd"
              className="w-full mt-2"
            />
          </div>
        </div>

        ) : (
          // YAML Tab Content
          <div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-gray-900 dark:text-gray-100">YAML Configuration</label>
              <textarea
                value={yamlContent}
                onChange={handleYamlChange}
                rows={15}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={onBack}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Deploying...' : 'Deploy Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJobForm;