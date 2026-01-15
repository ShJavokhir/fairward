"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_EXTENSIONS,
} from "@/lib/types/bill-analysis";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
}

export default function UploadDropzone({
  onFileSelect,
  isUploading = false,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return `Invalid file type. Please upload a ${ACCEPTED_EXTENSIONS.join(", ")} file.`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <label
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200",
          isDragging
            ? "border-[#002125] bg-[#E9FAE7]"
            : "border-[#E5E7EB] bg-white hover:bg-[#F2FBEF] hover:border-[#002125]",
          isUploading && "pointer-events-none opacity-60"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <>
              <div className="size-12 border-3 border-[#002125] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-[#17270C]">Uploading...</p>
            </>
          ) : (
            <>
              <div className="size-16 bg-[#F2FBEF] rounded-2xl flex items-center justify-center mb-4">
                <svg
                  className="size-8 text-[#002125]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-[#17270C] mb-1">
                Drag and drop your bill here
              </p>
              <p className="text-sm text-[#6B7280] mb-3">or click to browse</p>
              <p className="text-xs text-[#6B7280]">
                PDF, PNG, or JPG (max {MAX_FILE_SIZE_MB}MB)
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          disabled={isUploading}
        />
      </label>

      {error && (
        <div className="mt-4 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
          <p className="text-sm text-[#DC2626] text-center">{error}</p>
        </div>
      )}

      <p className="mt-4 text-sm text-[#6B7280] text-center">
        Itemized bills work best. Don&apos;t have one? We&apos;ll do what we can with what
        you&apos;ve got.
      </p>
    </div>
  );
}
