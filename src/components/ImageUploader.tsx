import { useEffect, useRef, useState } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { compressImage } from "../utils/imageCompressor"; // ✅ Import utility
import { useToast } from "../hooks/useToast"; // ✅ Import Toast
import { getAsyncStorageWarningLevel } from "../utils/storageMonitor";
import { ConfirmModal } from "./ConfirmModal";

interface ImageUploaderProps {
  label: string;
  value?: string;
  onChange: (base64: string | undefined) => void;
  maxHeight?: string; // e.g. "h-32" for logos, "h-16" for signatures
  onConfirmOpenChange?: (open: boolean) => void;
}

export function ImageUploader({
  label,
  value,
  onChange,
  maxHeight = "h-32",
  onConfirmOpenChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast(); // ✅ Hook
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const isPaperAsset = /signature|logo|crest/i.test(label);

  const onConfirmOpenChangeRef = useRef(onConfirmOpenChange);
  useEffect(() => {
    onConfirmOpenChangeRef.current = onConfirmOpenChange;
  });
  useEffect(() => {
    return () => {
      onConfirmOpenChangeRef.current?.(false);
    };
  }, []);

  const setRemoveConfirmOpen = (open: boolean) => {
    setShowRemoveConfirm(open);
    onConfirmOpenChangeRef.current?.(open);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 0. Check storage before allowing upload
    const storageLevel = await getAsyncStorageWarningLevel();
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
    setRemoveConfirmOpen(true);
  };

  const confirmRemove = () => {
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
        data-paper-surface={value && isPaperAsset ? "true" : undefined}
        className={`w-full ${maxHeight} group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none ${
          value
            ? isPaperAsset
              ? "border-border-strong bg-white dark:bg-slate-100"
              : "border-border-strong bg-subtle dark:bg-elevated"
            : "border-border-strong bg-background"
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

      <p className="text-muted text-xs">
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
          className="inline-flex items-center gap-1 self-start rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          <X className="h-3.5 w-3.5" /> Remove Image
        </button>
      )}

      <ConfirmModal
        isOpen={showRemoveConfirm}
        title={`Remove ${label}?`}
        message={`This will remove the uploaded ${label.toLowerCase()}. You can upload a new image at any time.`}
        confirmText="Yes, Remove"
        isDangerous={true}
        onClose={() => setRemoveConfirmOpen(false)}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
