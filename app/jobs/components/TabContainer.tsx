import React, { useState } from 'react';

interface TabContainerProps {
  children: React.ReactNode[];
  tabLabels: string[];
}

const TabContainer: React.FC<TabContainerProps> = ({ children, tabLabels }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="w-full">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabLabels.map((label, index) => (
          <button
            key={index}
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === index
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="py-4">
        {children[activeTab]}
      </div>
    </div>
  );
};

export default TabContainer;