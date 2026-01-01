'use client';

import { Download, FileQuestion } from 'lucide-react';
import { DocumentFile } from '@/types';
import { formatFileSize } from '@/lib/utils';

interface UnsupportedViewerProps {
  document: DocumentFile;
  onDownload: () => void;
}

export function UnsupportedViewer({ document, onDownload }: UnsupportedViewerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <FileQuestion className="w-10 h-10 text-gray-400" />
      </div>

      {/* Message */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Preview not available
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        This file type ({document.mimeType || 'unknown'}) cannot be previewed in the browser.
        Download the file to view it.
      </p>

      {/* File info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 w-full max-w-sm">
        <p className="font-medium text-gray-900 dark:text-white truncate mb-1">
          {document.fileName}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatFileSize(document.fileSize)}
        </p>
      </div>

      {/* Download button */}
      <button onClick={onDownload} className="btn-primary gap-2">
        <Download className="w-4 h-4" />
        Download File
      </button>
    </div>
  );
}
