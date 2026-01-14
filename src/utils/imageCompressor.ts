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

        // 4. Export as highly compressed JPEG (0.7 quality)
        // This converts the heavy PNG/Heic into a tiny string
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};
