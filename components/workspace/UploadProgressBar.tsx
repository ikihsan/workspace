'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { UploadProgress } from '@/types';
import { useDocuments } from '@/context/DocumentsContext';

interface UploadProgressBarProps {
  items: UploadProgress[];
}

export function UploadProgressBar({ items }: UploadProgressBarProps) {
  const { clearUploadProgress } = useDocuments();

  return (
    <div className="px-4 md:px-6 pb-2">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.fileName}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="card p-3 mb-2">
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {item.status === 'complete' ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  ) : item.status === 'error' ? (
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.status === 'uploading' && 'Uploading...'}
                    {item.status === 'processing' && 'Processing...'}
                    {item.status === 'complete' && 'Upload complete'}
                    {item.status === 'error' && (item.error || 'Upload failed')}
                  </p>
                </div>

                {/* Progress or Dismiss */}
                {item.status === 'uploading' || item.status === 'processing' ? (
                  <div className="w-16 text-right">
                    <span className="text-sm font-medium text-primary-500">
                      {Math.round(item.progress)}%
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => clearUploadProgress(item.fileName)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {(item.status === 'uploading' || item.status === 'processing') && (
                <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-primary rounded-full"
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
