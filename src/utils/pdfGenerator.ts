import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  formatHariTanggal,
  formatKegiatanLokasi,
  formatTanggalDash,
} from '../data/initialRecords';
import { PhotoAsset, ReportEntry, ReportSettings } from '../types/report';
import { renderPhotoForBox } from './imageProcessor';

/**
 * Draws a single report page onto an active jsPDF A4 portrait document,
 * replicating the exact layout of the sample SPJ Bina Marga PDF.
 */
async function drawReportPage(
  doc: jsPDF,
  entry: ReportEntry,
  settings: ReportSettings
): Promise<void> {
  const pageW = 210;
  const marginX = 12;
  const contentW = pageW - marginX * 2; // 186mm

  // 1. Yellow Banner Header (#FFFF00)
  const bannerY = 12;
  const bannerH = 22;
  doc.setFillColor(255, 255, 0);
  doc.rect(marginX, bannerY, contentW, bannerH, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('UNIT PERALATAN DAN PERBEKALAN BINA MARGA', pageW / 2, bannerY + 6.5, {
    align: 'center',
  });
  doc.text('DINAS BINA MARGA PROVINSI DKI JAKARTA', pageW / 2, bannerY + 12.8, {
    align: 'center',
  });
  doc.text(
    'Laporan Penggunaan Kendaraan Dinas dan Peralatan',
    pageW / 2,
    bannerY + 19.1,
    { align: 'center' }
  );

  // 2. Metadata Block
  const metaStartY = bannerY + bannerH + 10.5;
  const labelX = 16;
  const colonX = 113;
  const valueX = 116.5;
  const maxValueW = pageW - marginX - valueX - 2;
  const rowStep = 10.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(25, 25, 25);

  const metaRows: Array<[string, string]> = [
    ['Hari / Tanggal Kegiatan', formatHariTanggal(entry.tanggalRaw)],
    ['Jenis Kendaraan / Peralatan', settings.jenisKendaraan],
    ['Kegiatan dan Lokasi', formatKegiatanLokasi(entry, settings)],
    ['No Identitas Kendaraan / Peralatan', settings.noIdentitas],
  ];

  let currentY = metaStartY;
  for (const [label, value] of metaRows) {
    doc.text(label, labelX, currentY);
    doc.text(':', colonX, currentY);
    const wrapped = doc.splitTextToSize(value || '-', maxValueW);
    doc.text(wrapped, valueX, currentY);
    const extraLines = Math.max(0, wrapped.length - 1);
    currentY += rowStep + extraLines * 5;
  }

  // 3. Three Photo Columns + Gray Label Bars
  const photosY = Math.max(currentY + 4, 88);
  const colGap = 10;
  const colW = (contentW - colGap * 2) / 3; // 55.33mm each
  const photoH = 81;

  const slots: Array<{ asset: PhotoAsset | null; label: string }> = [
    { asset: entry.fotoKegiatan, label: 'Foto Kegiatan' },
    { asset: entry.fotoKmHm, label: 'Foto Km/Hm/Alat' },
    { asset: entry.fotoStruk, label: 'Foto Struk BBM' },
  ];

  for (let i = 0; i < slots.length; i++) {
    const colX = marginX + i * (colW + colGap);
    const slot = slots[i];

    // Photo frame
    if (slot.asset) {
      const rendered = await renderPhotoForBox(slot.asset, colW, photoH);
      doc.addImage(
        rendered.dataUrl,
        'JPEG',
        colX + rendered.offsetX,
        photosY + rendered.offsetY,
        rendered.drawW,
        rendered.drawH,
        undefined,
        'MEDIUM'
      );
    } else {
      doc.setDrawColor(215, 215, 215);
      doc.setFillColor(250, 250, 250);
      doc.rect(colX, photosY, colW, photoH, 'FD');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('Belum ada foto', colX + colW / 2, photosY + photoH / 2, {
        align: 'center',
      });
    }

    // Gray label bar below each photo (#D3D3D3)
    const barY = photosY + photoH + 6;
    const barH = 9.5;
    doc.setFillColor(211, 211, 211);
    doc.rect(colX, barY, colW, barH, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(25, 25, 25);
    doc.text(slot.label, colX + colW / 2, barY + 6.3, { align: 'center' });
  }

  // 4. Signature Block
  const sigTopY = photosY + photoH + 6 + 9.5 + 16;
  const leftCenterX = marginX + colW / 2;
  const rightCenterX = marginX + 2 * (colW + colGap) + colW / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(25, 25, 25);

  // Left: Mengetahui
  doc.text('Mengetahui,', leftCenterX, sigTopY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(settings.mengetahuiBaris1, leftCenterX, sigTopY + 34, { align: 'center' });
  doc.text(settings.mengetahuiBaris2, leftCenterX, sigTopY + 40, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(settings.mengetahuiNip, leftCenterX, sigTopY + 46, { align: 'center' });

  // Right: Jakarta, DD-MM-YYYY + Pengguna
  const tanggalDash = formatTanggalDash(entry.tanggalRaw);
  doc.text(`${settings.kota}, ${tanggalDash}`, rightCenterX, sigTopY, {
    align: 'center',
  });
  doc.text('Pengguna', rightCenterX, sigTopY + 6.5, { align: 'center' });
  doc.text(settings.penggunaNama, rightCenterX, sigTopY + 34, { align: 'center' });
  doc.text(settings.penggunaNip || '-', rightCenterX, sigTopY + 40, {
    align: 'center',
  });
}

function sanitizeFileSegment(text: string): string {
  return text.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

export function buildPdfFileName(entry: ReportEntry, settings: ReportSettings): string {
  const num = String(entry.orderIndex).padStart(2, '0');
  const jenis = sanitizeFileSegment(settings.jenisKendaraan);
  const plat = sanitizeFileSegment(settings.noIdentitas);
  const tgl = formatTanggalDash(entry.tanggalRaw);
  return `${num}_Laporan_SPJ_${jenis}_${plat}_${tgl}.pdf`;
}

export async function generateSingleReportPdf(
  entry: ReportEntry,
  settings: ReportSettings
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await drawReportPage(doc, entry, settings);
  doc.save(buildPdfFileName(entry, settings));
}

export async function generateCombinedPdf(
  entries: ReportEntry[],
  settings: ReportSettings,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (entries.length === 0) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < entries.length; i++) {
    if (i > 0) doc.addPage();
    await drawReportPage(doc, entries[i], settings);
    onProgress?.(i + 1, entries.length);
  }

  const plat = sanitizeFileSegment(settings.noIdentitas);
  const jenis = sanitizeFileSegment(settings.jenisKendaraan);
  doc.save(`Laporan_SPJ_${jenis}_${plat}_Gabungan_${entries.length}_Halaman.pdf`);
}

export async function generateZipOfPdfs(
  entries: ReportEntry[],
  settings: ReportSettings,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (entries.length === 0) return;
  const zip = new JSZip();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await drawReportPage(doc, entry, settings);
    const pdfArrayBuffer = doc.output('arraybuffer');
    zip.file(buildPdfFileName(entry, settings), pdfArrayBuffer);
    onProgress?.(i + 1, entries.length);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const plat = sanitizeFileSegment(settings.noIdentitas);
  const jenis = sanitizeFileSegment(settings.jenisKendaraan);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Laporan_SPJ_${jenis}_${plat}_Satuan_${entries.length}_File.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
