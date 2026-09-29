"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface ImageLightboxProps {
  images: { url: string; filename: string }[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const current = images[safeIndex];

  if (!isOpen || images.length === 0 || !current) return null;

  const hasMultiple = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm text-white/70 truncate max-w-[60%]">
          {current.filename}
          {hasMultiple && (
            <span className="ml-2 text-white/40">
              {safeIndex + 1} / {images.length}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={current.url}
            download={current.filename}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-white/60 hover:text-white transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex items-center justify-center w-full h-full p-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt={current.filename}
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
          onClick={onClose}
        />
      </div>

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Thumbnails strip */}
      {hasMultiple && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 bg-black/60 rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                idx === safeIndex
                  ? "border-blue-500 opacity-100"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={img.url}
                alt={img.filename}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
