import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = useCallback(() => {
    setLoadingCount(prev => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount(prev => Math.max(0, prev - 1));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    if (loading) startLoading();
    else stopLoading();
  }, [startLoading, stopLoading]);

  return (
    <LoadingContext.Provider value={{ 
      isLoading: loadingCount > 0, 
      setIsLoading, 
      startLoading, 
      stopLoading 
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
