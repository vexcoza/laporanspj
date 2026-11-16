import { PhotoAsset, PhotoFitMode, SortMode } from '../types/report';

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export function sortFiles(files: File[], mode: SortMode): File[] {
  const copy = [...files];
  if (mode === 'natural') {
    copy.sort((a, b) => naturalCollator.compare(a.name, b.name));
  } else if (mode === 'modified') {
    copy.sort((a, b) => a.lastModified - b.lastModified || naturalCollator.compare(a.name, b.name));
  }
  return copy;
}

/**
 * Loads an image File, automatically respects browser EXIF orientation via createImageBitmap/Image,
 * scales down if larger than maxDim (1100px) so 180+ photos fit comfortably in memory & PDFs,
 * and returns a crisp JPEG dataUrl with dimensions.
 */
export async function processImageFile(
  file: File,
  defaultFitMode: PhotoFitMode = 'contain',
  maxDim = 1100,
  quality = 0.84
): Promise<PhotoAsset> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;

    if (targetW > maxDim || targetH > maxDim) {
      const ratio = Math.min(maxDim / targetW, maxDim / targetH);
      targetW = Math.max(1, Math.round(targetW * ratio));
      targetH = Math.max(1, Math.round(targetH * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context tidak tersedia.');
    }

    // Fill white background before drawing so PNGs with transparency render cleanly in PDF
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return {
      dataUrl,
      fileName: file.name,
      width: targetW,
      height: targetH,
      fitMode: defaultFitMode,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function rotatePhotoAsset(
  asset: PhotoAsset,
  degrees: 90 | -90 = 90
): Promise<PhotoAsset> {
  const img = await loadImage(asset.dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.height;
  canvas.height = img.width;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return {
    ...asset,
    dataUrl: canvas.toDataURL('image/jpeg', 0.88),
    width: canvas.width,
    height: canvas.height,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    img.src = src;
  });
}

/**
 * Produces a pre-cropped JPEG dataUrl if fitMode === 'cover' for a target box aspect ratio,
 * so jsPDF renders exact object-cover framing cleanly without overflowing the frame.
 */
export async function renderPhotoForBox(
  asset: PhotoAsset,
  boxWidthMm: number,
  boxHeightMm: number
): Promise<{ dataUrl: string; drawW: number; drawH: number; offsetX: number; offsetY: number }> {
  const fit = asset.fitMode ?? 'contain';
  const imgW = asset.width || 3;
  const imgH = asset.height || 4;
  const imgRatio = imgW / imgH;
  const boxRatio = boxWidthMm / boxHeightMm;

  if (fit === 'contain') {
    let drawW = boxWidthMm;
    let drawH = boxHeightMm;
    if (imgRatio > boxRatio) {
      drawH = boxWidthMm / imgRatio;
    } else {
      drawW = boxHeightMm * imgRatio;
    }
    const offsetX = (boxWidthMm - drawW) / 2;
    const offsetY = (boxHeightMm - drawH) / 2;
    return { dataUrl: asset.dataUrl, drawW, drawH, offsetX, offsetY };
  }

  // Cover mode: crop image cleanly on canvas to match boxRatio
  const img = await loadImage(asset.dataUrl);
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > boxRatio) {
    sw = Math.round(img.height * boxRatio);
    sx = Math.round((img.width - sw) / 2);
  } else if (imgRatio < boxRatio) {
    sh = Math.round(img.width / boxRatio);
    sy = Math.round((img.height - sh) / 2);
  }

  const targetCanvasW = 700;
  const targetCanvasH = Math.round(targetCanvasW / boxRatio);
  const canvas = document.createElement('canvas');
  canvas.width = targetCanvasW;
  canvas.height = targetCanvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: asset.dataUrl, drawW: boxWidthMm, drawH: boxHeightMm, offsetX: 0, offsetY: 0 };
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetCanvasW, targetCanvasH);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetCanvasW, targetCanvasH);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.88),
    drawW: boxWidthMm,
    drawH: boxHeightMm,
    offsetX: 0,
    offsetY: 0,
  };
}
