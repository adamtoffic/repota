// src/components/ImageUploader.tsx
import { useRef } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";

interface ImageUploaderProps {
  label: string;
  value?: string;
  onChange: (base64: string | undefined) => void;
  maxHeight?: string; // e.g. "h-32" for logos, "h-16" for signatures
}

export function ImageUploader({ label, value, onChange, maxHeight = "h-32" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Size Check (Limit to 500KB)
    if (file.size > 500000) {
      alert("File is too large! Please use an image under 500KB.");
      return;
    }

    // 2. Convert to Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>

      <div
        onClick={() => inputRef.current?.click()}
        className={`w-full ${maxHeight} group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-400`}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain p-2" />
        ) : (
          <div className="p-4 text-center">
            <ImageIcon className="mx-auto mb-1 h-6 w-6 text-gray-300" />
            <span className="text-xs font-medium text-gray-400">Click to Upload</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Upload className="h-6 w-6 text-white" />
        </div>
      </div>

      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/png, image/jpeg"
        onChange={handleUpload}
      />

      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(undefined);
          }}
          className="flex items-center gap-1 self-start text-[10px] font-bold text-red-500 hover:text-red-700"
        >
          <X className="h-3 w-3" /> Remove Image
        </button>
      )}
    </div>
  );
}
