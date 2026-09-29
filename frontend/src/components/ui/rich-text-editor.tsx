"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

export type UploadedAttachment = {
  url: string;
  filename: string;
  uploadedAt: string;
};

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onAttachmentAdded?: (attachment: UploadedAttachment) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  /** Altura inicial del editor en px (default 320) */
  height?: number;
  /** Altura mínima al redimensionar en px (default 250) */
  minHeight?: number;
};

const HugerteEditor = dynamic(
  () => import("@hugerte/hugerte-react").then((mod) => mod.Editor),
  { ssr: false },
);

type FilePickerCallback = (url: string, meta?: { alt?: string }) => void;
type BlobInfoLike = {
  blob: () => Blob;
  filename: () => string;
};

export function RichTextEditor({
  value,
  onChange,
  onImageUpload,
  onAttachmentAdded,
  placeholder = "Escribe una descripción...",
  readOnly,
  className,
  height = 320,
  minHeight = 250,
}: RichTextEditorProps) {
  const uploadCountRef = useRef(0);
  const [isUploading, setIsUploading] = useState(false);

  const beginUpload = () => {
    uploadCountRef.current += 1;
    setIsUploading(true);
  };

  const finishUpload = () => {
    uploadCountRef.current = Math.max(0, uploadCountRef.current - 1);
    if (uploadCountRef.current === 0) {
      setIsUploading(false);
    }
  };

  const uploadAndTrack = async (file: File): Promise<string> => {
    if (!onImageUpload) {
      throw new Error("Image upload handler is not configured");
    }

    beginUpload();
    try {
      const imageUrl = await onImageUpload(file);
      onAttachmentAdded?.({
        url: imageUrl,
        filename: file.name || `image-${Date.now()}.png`,
        uploadedAt: new Date().toISOString(),
      });
      return imageUrl;
    } finally {
      finishUpload();
    }
  };

  const initConfig = useMemo(
    () => ({
      branding: false,
      statusbar: true,
      resize: true,
      min_height: minHeight,
      height,
      elementpath: false,
      skin: "oxide-dark",
      content_css: "dark",
      // CBK-81/CBK-82: sin esto, una imagen pegada/subida con su ancho
      // natural (p.ej. una captura de 1200px) desborda el iframe de edición
      // en pantallas móviles y rompe el layout del modal. max-width:100%
      // gana sobre el atributo width= que HugeRTE inserta, así que también
      // cubre imágenes redimensionadas manualmente vía los handles nativos
      // (object_resizing). Coincide con el `[&_img]:max-w-full` que ya
      // aplica la vista de solo lectura de la descripción en TaskModal.
      content_style: "img { max-width: 100%; height: auto; }",
      plugins: [
        "autolink", "link", "lists", "image", "paste", "code",
        "autoresize", "table", "advlist", "charmap", "codesample",
        "directionality", "emoticons", "fullscreen", "searchreplace",
        "visualblocks", "wordcount", "quickbars", "anchor",
      ],
      menubar: "file edit view insert format tools table help",
      toolbar: [
        "undo redo | blocks | bold italic underline strikethrough | forecolor backcolor",
        "bullist numlist outdent indent | alignleft aligncenter alignright alignjustify | link image table | codesample blockquote | emoticons charmap | removeformat code fullscreen",
      ],
      placeholder,
      paste_data_images: true,
      automatic_uploads: true,
      images_file_types: "jpeg,jpg,jpe,jfi,jif,jfif,png,gif,bmp,webp",
      convert_urls: false,
      forced_root_block: "p",
      file_picker_types: "image",
      file_picker_callback: (callback: FilePickerCallback) => {
        if (readOnly || !onImageUpload) return;

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const url = await uploadAndTrack(file);
            callback(url, { alt: file.name });
          } catch {
            // Errores manejados por el componente padre
          }
        };
        input.click();
      },
      images_upload_handler: async (blobInfo: BlobInfoLike, progress: (percent: number) => void) => {
        if (!onImageUpload) {
          throw new Error("Image upload handler is not configured");
        }

        const blob = blobInfo.blob();
        const filename = blobInfo.filename() || `image-${Date.now()}.png`;
        const file =
          blob instanceof File
            ? blob
            : new File([blob], filename, {
                type: blob.type || "image/png",
              });

        const uploadedUrl = await uploadAndTrack(file);
        progress(100);
        return uploadedUrl;
      },
    }),
    [onAttachmentAdded, onImageUpload, placeholder, readOnly, height, minHeight],
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-700 bg-slate-900/40",
        readOnly && "opacity-70 pointer-events-none",
        className,
      )}
    >
      <div className="relative">
        <HugerteEditor
          value={value || ""}
          onEditorChange={onChange}
          disabled={readOnly}
          init={initConfig}
        />

        {isUploading && (
          <div className="absolute right-3 top-2 z-20 text-[11px] text-blue-400 bg-slate-900/90 rounded px-2 py-1 border border-slate-700">
            Subiendo imagen...
          </div>
        )}
      </div>
    </div>
  );
}
