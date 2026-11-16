import React, { useRef, useState } from 'react';
import {
  Check,
  FileSpreadsheet,
  Loader2,
  TableProperties,
  Upload,
  X,
} from 'lucide-react';
import { formatHariTanggal } from '../data/initialRecords';

export interface ParsedSpreadsheetRow {
  tanggalRaw: string;
  jamRaw: string;
  liter: string;
  harga: string;
  nilai: string;
  lokasi: string;
  highlighted?: boolean;
}

export interface ParsedSpreadsheetResult {
  jenisKendaraan?: string;
  noIdentitas?: string;
  rows: ParsedSpreadsheetRow[];
}

interface SpreadsheetImportPanelProps {
  onApplyRows: (
    result: ParsedSpreadsheetResult,
    mode: 'replace' | 'append',
    updateVehicleMeta: boolean
  ) => void;
  onError: (msg: string) => void;
  onClose?: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

function parseDelimitedText(text: string): ParsedSpreadsheetResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { rows: [] };
  }

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const splitLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headerCells = splitLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = headerCells.some(
    (h) => h.includes('tanggal') || h.includes('lokasi') || h.includes('jenis')
  );
  const startIdx = hasHeader ? 1 : 0;

  const findCol = (keywords: string[], fallbackIdx: number) => {
    if (!hasHeader) return fallbackIdx;
    const found = headerCells.findIndex((h) =>
      keywords.some((k) => h.includes(k))
    );
    return found >= 0 ? found : fallbackIdx;
  };

  const idxJenis = findCol(['jenis', 'kendaraan', 'alat'], 0);
  const idxPlat = findCol(['polisi', 'seri', 'identitas'], 1);
  const idxTanggal = findCol(['tanggal', 'tgl'], 2);
  const idxLiter = findCol(['liter'], 3);
  const idxHarga = findCol(['harga'], 4);
  const idxNilai = findCol(['nilai', 'total'], 5);
  const idxLokasi = findCol(['lokasi', 'kegiatan'], 6);

  let detectedJenis = '';
  let detectedPlat = '';
  const rows: ParsedSpreadsheetRow[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length < 2) continue;

    if (!detectedJenis && cols[idxJenis]) detectedJenis = cols[idxJenis];
    if (!detectedPlat && cols[idxPlat]) detectedPlat = cols[idxPlat];

    const rawTglCell = cols[idxTanggal] || '';
    const [datePart, timePart] = rawTglCell.split(/\s+/);
    const lokasiVal = cols[idxLokasi] || cols[cols.length - 1] || '';

    if (!datePart && !lokasiVal) continue;

    rows.push({
      tanggalRaw: datePart || rawTglCell,
      jamRaw: timePart || '-',
      liter: cols[idxLiter] || '-',
      harga: cols[idxHarga] || '-',
      nilai: cols[idxNilai] || '-',
      lokasi: lokasiVal,
    });
  }

  return {
    jenisKendaraan: detectedJenis || undefined,
    noIdentitas: detectedPlat || undefined,
    rows,
  };
}

export const SpreadsheetImportPanel: React.FC<SpreadsheetImportPanelProps> = ({
  onApplyRows,
  onError,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [parsedResult, setParsedResult] =
    useState<ParsedSpreadsheetResult | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const [updateVehicleMeta, setUpdateVehicleMeta] = useState(false);

  const handleFile = async (file: File) => {
    setSourceFileName(file.name);
    setParsedResult(null);
    setPreviewImageUrl(null);

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || file.type === 'text/csv') {
      try {
        const text = await file.text();
        const result = parseDelimitedText(text);
        if (result.rows.length === 0) {
          onError('Tidak ada baris data yang terbaca dari file CSV/TSV.');
          return;
        }
        setParsedResult(result);
      } catch {
        onError('Gagal membaca file CSV/TSV.');
      }
      return;
    }

    if (!file.type.startsWith('image/')) {
      onError('Pilih file gambar tabel (JPG/PNG/WebP) atau file CSV/TSV.');
      return;
    }

    setIsParsing(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreviewImageUrl(dataUrl);

      const response = await fetch('/api/parse-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: file.type || 'image/jpeg',
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Gagal membaca tabel dari gambar.');
      }

      if (!Array.isArray(payload?.rows) || payload.rows.length === 0) {
        throw new Error('Tidak ditemukan baris tabel pada gambar tersebut.');
      }

      setParsedResult(payload as ParsedSpreadsheetResult);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Terjadi kendala saat membaca gambar tabel.';
      onError(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;
    onApplyRows(parsedResult, applyMode, updateVehicleMeta);
    setParsedResult(null);
    setPreviewImageUrl(null);
    setSourceFileName(null);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TableProperties className="h-3.5 w-3.5 text-slate-700" />
            <span>Pembaca Tabel Otomatis</span>
            <span aria-hidden="true">·</span>
            <span>Foto Tabel Excel (JPG/PNG) atau File CSV</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Import Data Tanggal &amp; Lokasi dari Foto Tabel
          </h2>
          <p className="text-sm text-slate-600">
            Unggah screenshot tabel seperti foto rekap BBM Anda untuk membaca seluruh kolom tanggal, jam, liter, nilai, dan lokasi secara otomatis.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:self-auto whitespace-nowrap shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            <span>Tutup Panel</span>
          </button>
        )}
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => {
          if (!isParsing) fileInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isParsing) fileInputRef.current?.click();
          }
        }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
          isDragging
            ? 'border-slate-900 bg-slate-100'
            : 'border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.csv,.tsv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />

        {isParsing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
            <p className="text-sm font-medium text-slate-900">
              Sedang membaca baris tabel dari {sourceFileName}...
            </p>
            <p className="text-xs text-slate-500">
              Mohon tunggu sebentar, sistem sedang mengekstrak seluruh tanggal dan lokasi.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Klik untuk pilih foto tabel atau tarik file ke sini
            </p>
            <p className="text-xs text-slate-500">
              Mendukung screenshot/foto tabel (JPG, PNG, WebP) maupun file CSV/TSV
            </p>
          </div>
        )}
      </div>

      {/* Preview & Confirmation of Extracted Rows */}
      {parsedResult && (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                <span className="font-semibold text-slate-900 tabular-nums">
                  {parsedResult.rows.length} baris berhasil dibaca
                </span>
                {parsedResult.jenisKendaraan && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Kendaraan: {parsedResult.jenisKendaraan}</span>
                  </>
                )}
                {parsedResult.noIdentitas && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      Plat: {parsedResult.noIdentitas}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Mode penerapan data tabel"
                value={applyMode}
                onChange={(e) =>
                  setApplyMode(e.target.value as 'replace' | 'append')
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
              >
                <option value="replace">Ganti seluruh daftar baris</option>
                <option value="append">Tambahkan ke akhir daftar</option>
              </select>

              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Terapkan ke Laporan</span>
              </button>
            </div>
          </div>

          {(parsedResult.jenisKendaraan || parsedResult.noIdentitas) && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={updateVehicleMeta}
                onChange={(e) => setUpdateVehicleMeta(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>
                Ikut perbarui Jenis Kendaraan &amp; No Identitas di pengaturan laporan sesuai tabel ini
              </span>
            </label>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
            {previewImageUrl && (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img
                  src={previewImageUrl}
                  alt="Preview foto tabel yang diunggah"
                  className="max-h-72 w-full object-contain"
                />
              </div>
            )}

            <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-right">#</th>
                    <th className="px-3 py-2">Hari / Tanggal</th>
                    <th className="px-3 py-2">Jam</th>
                    <th className="px-3 py-2">Lokasi</th>
                    <th className="px-3 py-2 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedResult.rows.map((row, idx) => (
                    <tr
                      key={`${row.tanggalRaw}-${idx}`}
                      className={row.highlighted ? 'bg-yellow-50/70' : ''}
                    >
                      <td className="px-3 py-1.5 text-right font-mono-tabular text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatHariTanggal(row.tanggalRaw)}
                      </td>
                      <td className="px-3 py-1.5 font-mono-tabular text-slate-600">
                        {row.jamRaw || '-'}
                      </td>
                      <td className="px-3 py-1.5 text-slate-800">{row.lokasi}</td>
                      <td className="px-3 py-1.5 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                        {row.nilai || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
