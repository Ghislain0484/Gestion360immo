import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../contexts/LoadingContext';

export const LoadingBar: React.FC = () => {
  const { isLoading } = useLoading();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 0.8, 
            ease: "easeInOut",
            opacity: { duration: 0.2 }
          }}
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 z-[9999] origin-left shadow-[0_0_10px_rgba(37,99,235,0.5)]"
        />
      )}
    </AnimatePresence>
  );
};
