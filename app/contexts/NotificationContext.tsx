'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification } from '../types';
import ToastContainer from '../components/ui/ToastContainer';

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
  showWarning: (title: string, message: string, duration?: number) => void;
  showInfo: (title: string, message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000, // Default 5 seconds
    };

    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((title: string, message: string, duration = 5000) => {
    addNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, duration = 7000) => {
    addNotification({
      type: 'error',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, duration = 6000) => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, duration = 5000) => {
    addNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  }, [addNotification]);

  const contextValue: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
