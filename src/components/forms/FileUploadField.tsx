"use client";

import { useState, useRef } from "react";
import { FiUploadCloud, FiX, FiFile } from "react-icons/fi";
import { extractFilenameFromUrl } from "@/lib/utils";

interface FileUploadFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  files: File[];
  existingFiles?: string[];
  onFilesChange: (files: File[]) => void;
  onExistingFileRemove?: (url: string) => void;
  className?: string;
  containerClassName?: string;
}

export default function FileUploadField({
  label,
  error,
  required = false,
  accept = "*/*",
  multiple = true,
  files,
  existingFiles = [],
  onFilesChange,
  onExistingFileRemove,
  className = "",
  containerClassName = "",
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const fileArray = Array.from(newFiles);
    if (multiple) {
      onFilesChange([...files, ...fileArray]);
    } else {
      onFilesChange(fileArray.slice(0, 1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (fileName: string) => {
    onFilesChange(files.filter(file => file.name !== fileName));
  };

  const removeExistingFile = (url: string) => {
    onExistingFileRemove?.(url);
  };

  return (
    <div className={containerClassName}>
      <label className="block font-medium text-gray-700 mb-1 text-sm sm:text-base">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* File Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center">
          <FiUploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            Click to upload or drag and drop files here
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {multiple ? "Multiple files allowed" : "Single file only"}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* File Lists */}
      {(files.length > 0 || existingFiles.length > 0) && (
        <div className="mt-3 space-y-2">
          {/* Existing Files */}
          {existingFiles.map((url, index) => (
            <div key={`existing-${index}`} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <FiFile className="text-blue-500" />
                <span className="text-sm text-blue-700">
                  {extractFilenameFromUrl(url)}
                </span>
                <span className="text-xs text-blue-500">(existing)</span>
              </div>
              {onExistingFileRemove && (
                <button
                  type="button"
                  onClick={() => removeExistingFile(url)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          ))}

          {/* New Files */}
          {files.map((file, index) => (
            <div key={`new-${index}`} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <FiFile className="text-gray-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({Math.round(file.size / 1024)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.name)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs sm:text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
