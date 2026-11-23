import { useRef } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { compressImage } from "../utils/imageCompressor"; // ✅ Import utility
import { useToast } from "../hooks/useToast"; // ✅ Import Toast
import { getStorageWarningLevel } from "../utils/storageMonitor";

interface ImageUploaderProps {
  label: string;
  value?: string;
  onChange: (base64: string | undefined) => void;
  maxHeight?: string; // e.g. "h-32" for logos, "h-16" for signatures
}

export function ImageUploader({ label, value, onChange, maxHeight = "h-32" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast(); // ✅ Hook

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 0. Check storage before allowing upload
    const storageLevel = getStorageWarningLevel();
    if (storageLevel === "critical") {
      showToast(
        "Storage full! Please export data and clear old students before uploading images.",
        "error",
      );
      return;
    }

    // 1. Type Validation (Must be an image)
    if (!file.type.startsWith("image/")) {
      showToast("Please upload a valid image file (PNG or JPEG).", "error");
      return;
    }

    // 2. Compression & Processing
    try {
      // ✅ Compresses 5MB -> 15KB instantly
      const compressedBase64 = await compressImage(file);
      onChange(compressedBase64);
      showToast("Image uploaded successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to process image. Please try another.", "error");
    }
  };

  // Helper to remove image
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the file picker
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = ""; // Reset input
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted text-xs font-bold uppercase">{label}</span>

      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`w-full ${maxHeight} group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none ${
          value ? "border-border-strong bg-white" : "border-border-strong bg-background"
        }`}
      >
        {value ? (
          // ✅ SHOW IMAGE
          <img src={value} alt={label} className="h-full w-full object-contain p-2" />
        ) : (
          // ✅ SHOW EMPTY STATE (Using ImageIcon here)
          <div className="p-4 text-center">
            <ImageIcon className="text-muted mx-auto mb-1 h-6 w-6 opacity-60" />
            <span className="text-muted text-xs font-medium">Click to Upload</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Upload className="h-6 w-6 text-white" />
        </div>
      </div>

      <p className="text-muted text-[10px]">
        {label.includes("Signature")
          ? "Tip: Sign on plain white paper and crop closely."
          : "Tip: Auto-compressed for performance."}
      </p>

      {/* Hidden Input */}
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleUpload}
      />

      {/* Remove Button */}
      {value && (
        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 self-start text-[10px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          <X className="h-3 w-3" /> Remove Image
        </button>
      )}
    </div>
  );
}
