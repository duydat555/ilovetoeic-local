export interface ImageCompressResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
}

/**
 * Compresses and scales an image file to FullHD resolution (max 1920px on largest dimension)
 * while maintaining aspect ratio and optimizing quality.
 */
export const compressImageToFullHD = (
  file: File,
  maxDimension = 1920,
  quality = 0.85,
): Promise<ImageCompressResult> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn một tệp hình ảnh hợp lệ (JPG, PNG, WEBP...).'));
      return;
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Hình ảnh bị hỏng hoặc không hỗ trợ.'));
      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;
        let { width, height } = img;

        // Scale down to maxDimension (1920px) if larger
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Khởi tạo Canvas 2D thất bại.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for optimal size, fallback to JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const base64Str = dataUrl.split(',')[1] || '';
        const compressedSize = Math.round((base64Str.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          originalWidth,
          originalHeight,
          width,
          height,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
