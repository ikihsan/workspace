'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';

interface ImageViewerProps {
  url: string;
  fileName: string;
}

export function ImageViewer({ url, fileName }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetView = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-4 px-4 py-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="btn-icon btn-ghost btn-sm disabled:opacity-30"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="btn-icon btn-ghost btn-sm disabled:opacity-30"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Rotate */}
        <button
          onClick={rotate}
          className="btn-icon btn-ghost btn-sm"
          aria-label="Rotate"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Reset */}
        {(scale !== 1 || rotation !== 0) && (
          <button
            onClick={resetView}
            className="btn-ghost btn-sm text-sm"
          >
            Reset
          </button>
        )}
      </div>

      {/* Image Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🖼️</span>
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-2">
              Unable to load image
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              The image couldn't be displayed
            </p>
          </div>
        ) : (
          <motion.div
            animate={{
              scale,
              rotate: rotation,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={fileName}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-soft"
              style={{ display: loading ? 'none' : 'block' }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
