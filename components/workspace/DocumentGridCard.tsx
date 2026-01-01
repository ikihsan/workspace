'use client';

import { motion } from 'framer-motion';
import { DocumentFile } from '@/types';
import { FileIcon } from '@/components/ui/FileIcon';
import { formatFileSize, formatDate, truncateFileName } from '@/lib/utils';

interface DocumentGridCardProps {
  document: DocumentFile;
  onClick: () => void;
}

export function DocumentGridCard({ document, onClick }: DocumentGridCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="card-hover p-4 flex flex-col items-center text-center cursor-pointer"
      onClick={onClick}
    >
      {/* File Icon */}
      <FileIcon
        mimeType={document.mimeType}
        fileName={document.fileName}
        size="xl"
        className="mb-3"
      />

      {/* File Name */}
      <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-tight mb-1 line-clamp-2">
        {truncateFileName(document.fileName, 25)}
      </h3>

      {/* File Info */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {formatFileSize(document.fileSize)}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {formatDate(document.createdAt)}
      </p>
    </motion.div>
  );
}
