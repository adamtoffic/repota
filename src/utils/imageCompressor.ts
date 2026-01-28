/**
 * Compress images using WebP format (30% smaller than JPEG)
 * Falls back to JPEG for older browsers
 * Handles high-end phone cameras (12MP+) down to ~30-100KB
 */
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // 1. Create a Canvas
        const canvas = document.createElement("canvas");

        // 2. Set "Passport Size" dimensions (Max 200px)
        const MAX_WIDTH = 200;
        const scaleSize = MAX_WIDTH / img.width;
        const width = MAX_WIDTH;
        const height = img.height * scaleSize;

        canvas.width = width;
        canvas.height = height;

        // 3. Draw image onto canvas
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // 4. Try WebP first (better compression), fallback to JPEG
        // WebP gives ~30% smaller files with better quality
        let dataUrl = canvas.toDataURL("image/webp", 0.75);

        // Check if WebP is supported (some old browsers return image/png)
        if (!dataUrl.startsWith("data:image/webp")) {
          // Fallback to JPEG for older browsers
          dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        }

        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};
