import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/primitives/Toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Singleton toast instance for use outside React components
let toastInstance: ToastContextType | null = null;

export const setToastInstance = (instance: ToastContextType) => {
  toastInstance = instance;
};

export const toast = {
  success: (message: string) => {
    if (toastInstance) {
      toastInstance.success(message);
    } else {
      console.warn('Toast instance not initialized');
    }
  },
  error: (message: string) => {
    if (toastInstance) {
      toastInstance.error(message);
    } else {
      console.warn('Toast instance not initialized');
    }
  },
  warning: (message: string) => {
    if (toastInstance) {
      toastInstance.warning(message);
    } else {
      console.warn('Toast instance not initialized');
    }
  },
  info: (message: string) => {
    if (toastInstance) {
      toastInstance.info(message);
    } else {
      console.warn('Toast instance not initialized');
    }
  },
  showToast: (message: string, type: ToastType = 'info') => {
    if (toastInstance) {
      toastInstance.showToast(message, type);
    } else {
      console.warn('Toast instance not initialized');
    }
  },
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
  }, []);

  const success = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const error = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const warning = useCallback((message: string) => {
    showToast(message, 'warning');
  }, [showToast]);

  const info = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  const handleClose = useCallback(() => {
    setToast(null);
  }, []);

  const value: ToastContextType = {
    showToast,
    success,
    error,
    warning,
    info,
  };

  // Register singleton instance on mount
  React.useEffect(() => {
    setToastInstance(value);
    return () => {
      setToastInstance(null as any);
    };
  }, [value]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        open={toast !== null}
        severity={toast?.type || 'info'}
        message={toast?.message || ''}
        onClose={handleClose}
        autoHideDuration={6000}
      />
    </ToastContext.Provider>
  );
};
