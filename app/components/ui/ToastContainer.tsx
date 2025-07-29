'use client';

import React from 'react';
import Toast from './Toast';
import { Notification } from '../../types';

interface ToastContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-4">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
