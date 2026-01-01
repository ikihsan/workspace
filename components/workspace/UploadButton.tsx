'use client';

import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Plus, X, Camera, FolderOpen } from 'lucide-react';
import { useDocuments } from '@/context/DocumentsContext';
import { useToast } from '@/context/ToastContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { validateFile } from '@/lib/utils';

interface UploadButtonProps {
  variant: 'button' | 'fab';
}

export function UploadButton({ variant }: UploadButtonProps) {
  const { uploadFile } = useDocuments();
  const { success, error: showError, info } = useToast();
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setShowUploadSheet(false);
      
      for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
          showError('Invalid file', validation.error);
          continue;
        }

        try {
          info('Uploading', `Uploading ${file.name}...`);
          await uploadFile(file);
          success('Upload complete', `${file.name} has been uploaded`);
        } catch (err) {
          showError('Upload failed', `Failed to upload ${file.name}`);
        }
      }
    },
    [uploadFile, success, showError, info]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    noClick: true,
    noKeyboard: true,
  });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCameraSelect = () => {
    cameraInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  // Desktop button
  if (variant === 'button') {
    return (
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
          accept="image/*,application/pdf,.txt,.md,.json,.xml,.csv"
        />
        
        <button onClick={handleFileSelect} className="btn-primary gap-2">
          <Upload className="w-4 h-4" />
          Upload
        </button>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-primary-500/10 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-soft-lg border-2 border-dashed border-primary-500">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Drop files here
                  </p>
                  <p className="text-gray-500">Release to upload</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Mobile FAB
  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowUploadSheet(true)}
        className="w-14 h-14 rounded-full bg-gradient-primary text-white shadow-lg shadow-primary-500/30 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        accept="image/*,application/pdf,.txt,.md,.json,.xml,.csv"
      />
      <input
        ref={cameraInputRef}
        type="file"
        capture="environment"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Upload options sheet */}
      <BottomSheet
        isOpen={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        title="Upload Document"
      >
        <div className="p-4 space-y-3 safe-bottom">
          <button
            onClick={handleCameraSelect}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Camera className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                Take a Photo
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use your camera to capture
              </p>
            </div>
          </button>

          <button
            onClick={handleFileSelect}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                Choose Files
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Browse from your device
              </p>
            </div>
          </button>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-2">
            Supports PDFs, images, and text files up to 100MB
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
