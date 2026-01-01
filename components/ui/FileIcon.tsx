'use client';

import { FileText, Image, File, FileCode, FileSpreadsheet } from 'lucide-react';
import { getFileType } from '@/lib/utils';

interface FileIconProps {
  mimeType: string;
  fileName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const iconColors: Record<string, string> = {
  pdf: 'text-red-500',
  image: 'text-green-500',
  text: 'text-blue-500',
  unsupported: 'text-gray-400',
};

const bgColors: Record<string, string> = {
  pdf: 'bg-red-50 dark:bg-red-900/20',
  image: 'bg-green-50 dark:bg-green-900/20',
  text: 'bg-blue-50 dark:bg-blue-900/20',
  unsupported: 'bg-gray-50 dark:bg-gray-900/20',
};

export function FileIcon({
  mimeType,
  fileName,
  size = 'md',
  className = '',
}: FileIconProps) {
  const fileType = getFileType(mimeType, fileName);
  const iconSize = sizes[size];
  const iconColor = iconColors[fileType];

  const getIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className={`${iconSize} ${iconColor}`} />;
      case 'image':
        return <Image className={`${iconSize} ${iconColor}`} />;
      case 'text':
        if (fileName.endsWith('.json') || fileName.endsWith('.xml')) {
          return <FileCode className={`${iconSize} ${iconColor}`} />;
        }
        if (fileName.endsWith('.csv')) {
          return <FileSpreadsheet className={`${iconSize} ${iconColor}`} />;
        }
        return <FileText className={`${iconSize} ${iconColor}`} />;
      default:
        return <File className={`${iconSize} ${iconColor}`} />;
    }
  };

  return (
    <div
      className={`
        flex items-center justify-center rounded-xl
        ${bgColors[fileType]}
        ${size === 'sm' ? 'p-2' : size === 'md' ? 'p-2.5' : size === 'lg' ? 'p-3' : 'p-4'}
        ${className}
      `}
    >
      {getIcon()}
    </div>
  );
}
