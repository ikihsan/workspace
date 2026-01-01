'use client';

import { useState, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { MoreVertical, Eye, Download, Pencil, Trash2 } from 'lucide-react';
import { DocumentFile } from '@/types';
import { useDocuments } from '@/context/DocumentsContext';
import { useToast } from '@/context/ToastContext';
import { FileIcon } from '@/components/ui/FileIcon';
import { Modal } from '@/components/ui/Modal';
import { formatFileSize, formatDate, truncateFileName } from '@/lib/utils';

interface DocumentCardProps {
  document: DocumentFile;
  onClick: () => void;
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  const { deleteFile, renameFile } = useDocuments();
  const { success, error: showError } = useToast();
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newFileName, setNewFileName] = useState(document.fileName);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRename = async () => {
    if (!newFileName.trim()) return;
    try {
      await renameFile(document.fileId, newFileName);
      success('File renamed', `Renamed to "${newFileName}"`);
      setShowRenameModal(false);
    } catch (err) {
      showError('Rename failed', 'Please try again');
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteFile(document.fileId);
      success('File deleted', 'The file has been removed');
      setShowDeleteModal(false);
    } catch (err) {
      showError('Delete failed', 'Please try again');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    window.open(document.ipfsURL, '_blank');
  };

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="file-card group"
        onClick={onClick}
      >
        {/* File Icon */}
        <FileIcon
          mimeType={document.mimeType}
          fileName={document.fileName}
          size="lg"
        />

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {truncateFileName(document.fileName, 40)}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>{formatFileSize(document.fileSize)}</span>
            <span>•</span>
            <span>{formatDate(document.createdAt)}</span>
          </div>
        </div>

        {/* Actions Menu */}
        <Menu as="div" className="relative">
          <Menu.Button
            onClick={(e) => e.stopPropagation()}
            className="btn-icon btn-ghost opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-soft-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-50">
              <div className="p-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                        active ? 'bg-gray-50 dark:bg-gray-800' : ''
                      } text-gray-700 dark:text-gray-300`}
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                        active ? 'bg-gray-50 dark:bg-gray-800' : ''
                      } text-gray-700 dark:text-gray-300`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewFileName(document.fileName);
                        setShowRenameModal(true);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                        active ? 'bg-gray-50 dark:bg-gray-800' : ''
                      } text-gray-700 dark:text-gray-300`}
                    >
                      <Pencil className="w-4 h-4" />
                      Rename
                    </button>
                  )}
                </Menu.Item>
                <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(true);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                        active ? 'bg-red-50 dark:bg-red-900/20' : ''
                      } text-red-500`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </motion.div>

      {/* Rename Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Rename file"
      >
        <div className="space-y-4">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            className="input"
            placeholder="Enter new file name"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={() => setShowRenameModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button onClick={handleRename} className="btn-primary flex-1">
              Rename
            </button>
          </div>
        </div>
      </Modal>

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
