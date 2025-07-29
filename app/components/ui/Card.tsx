'use client';

import React from 'react';
import { clsx } from 'clsx';
import { CardProps } from '../../types';

const Card: React.FC<CardProps> = ({ children, title, className }) => {
  return (
    <div className={clsx(
      'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700',
      className
    )}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
