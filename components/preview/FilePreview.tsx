'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Download, Share2, Trash2, ChevronLeft } from 'lucide-react';
import { DocumentFile } from '@/types';
import { useDocuments } from '@/context/DocumentsContext';
import { useToast } from '@/context/ToastContext';
import { getFileType, formatFileSize, truncateFileName } from '@/lib/utils';
import { PDFViewer } from './PDFViewer';
import { ImageViewer } from './ImageViewer';
import { TextViewer } from './TextViewer';
import { UnsupportedViewer } from './UnsupportedViewer';
import { Modal } from '@/components/ui/Modal';

interface FilePreviewProps {
  document: DocumentFile;
  onClose: () => void;
  isMobile: boolean;
}

export function FilePreview({ document, onClose, isMobile }: FilePreviewProps) {
  const { deleteFile } = useDocuments();
  const { success, error: showError } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileType = getFileType(document.mimeType, document.fileName);

  // Handle swipe down to close on mobile
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 150) {
      onClose();
    }
  };

  const handleDownload = () => {
    window.open(document.ipfsURL, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.fileName,
          url: document.ipfsURL,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Copy to clipboard fallback
      await navigator.clipboard.writeText(document.ipfsURL);
      success('Link copied', 'File link copied to clipboard');
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteFile(document.fileId);
      success('File deleted', 'The file has been removed');
      onClose();
    } catch (err) {
      showError('Delete failed', 'Please try again');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Render viewer based on file type
  const renderViewer = () => {
    switch (fileType) {
      case 'pdf':
        return <PDFViewer url={document.ipfsURL} />;
      case 'image':
        return <ImageViewer url={document.ipfsURL} fileName={document.fileName} />;
      case 'text':
        return <TextViewer url={document.ipfsURL} fileName={document.fileName} />;
      default:
        return <UnsupportedViewer document={document} onDownload={handleDownload} />;
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
        >
          {/* Mobile: Swipeable container */}
          {isMobile ? (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 bg-white dark:bg-gray-950 flex flex-col safe-top safe-bottom"
            >
              {/* Mobile Header */}
              <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm">Back</span>
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="btn-icon btn-ghost"
                    aria-label="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-icon btn-ghost"
                    aria-label="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn-icon btn-ghost text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* File Info */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-medium text-gray-900 dark:text-white truncate">
                  {truncateFileName(document.fileName, 40)}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(document.fileSize)}
                </p>
              </div>

              {/* Viewer */}
              <div className="flex-1 overflow-auto">
                {renderViewer()}
              </div>
            </motion.div>
          ) : (
            /* Desktop: Modal style */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-4 md:inset-8 lg:inset-12 bg-white dark:bg-gray-950 rounded-2xl shadow-soft-lg flex flex-col overflow-hidden"
            >
              {/* Desktop Header */}
              <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                    {document.fileName}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(document.fileSize)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="btn-ghost btn-sm gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-ghost btn-sm gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn-ghost btn-sm gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
                  <button
                    onClick={onClose}
                    className="btn-icon btn-ghost"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* Viewer */}
              <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
                {renderViewer()}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete file"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{truncateFileName(document.fileName, 30)}"?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="btn-secondary flex-1"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="btn-danger flex-1"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
