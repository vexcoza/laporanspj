import React, { useRef, useState } from 'react';
import { Upload, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { formatTanggalDash } from '../data/initialRecords';
import { PhotoFitMode, PhotoSlotType, ReportEntry, SortMode } from '../types/report';

interface BatchUploadHubProps {
  records: ReportEntry[];
  onBatchUpload: (
    slot: PhotoSlotType,
    files: File[],
    startIndex: number,
    sortMode: SortMode,
    fitMode: PhotoFitMode
  ) => Promise<void>;
  onClearColumn: (slot: PhotoSlotType) => void;
  uploadingSlot: PhotoSlotType | null;
  uploadProgress: { current: number; total: number } | null;
}

interface SlotConfig {
  slot: PhotoSlotType;
  stepNumber: string;
  title: string;
  subtitle: string;
  defaultFit: PhotoFitMode;
}

const SLOT_CONFIGS: SlotConfig[] = [
  {
    slot: 'kegiatan',
    stepNumber: '01',
    title: 'Foto Kegiatan',
    subtitle: 'Upload banyak foto kegiatan sekaligus secara berurutan',
    defaultFit: 'cover',
  },
  {
    slot: 'kmhm',
    stepNumber: '02',
    title: 'Foto Km/Hm/Alat',
    subtitle: 'Upload banyak foto speedometer / alat sekaligus berurutan',
    defaultFit: 'contain',
  },
  {
    slot: 'struk',
    stepNumber: '03',
    title: 'Foto Struk BBM',
    subtitle: 'Upload banyak foto struk Pertamina sekaligus berurutan',
    defaultFit: 'contain',
  },
];

function getPhotoBySlot(entry: ReportEntry, slot: PhotoSlotType) {
  if (slot === 'kegiatan') return entry.fotoKegiatan;
  if (slot === 'kmhm') return entry.fotoKmHm;
  return entry.fotoStruk;
}

export const BatchUploadHub: React.FC<BatchUploadHubProps> = ({
  records,
  onBatchUpload,
  onClearColumn,
  uploadingSlot,
  uploadProgress,
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('natural');
  const [startChoices, setStartChoices] = useState<Record<PhotoSlotType, string>>({
    kegiatan: 'first-empty',
    kmhm: 'first-empty',
    struk: 'first-empty',
  });
  const [fitChoices, setFitChoices] = useState<Record<PhotoSlotType, PhotoFitMode>>({
    kegiatan: 'cover',
    kmhm: 'contain',
    struk: 'contain',
  });
  const [dragActiveSlot, setDragActiveSlot] = useState<PhotoSlotType | null>(null);

  const inputRefs = useRef<Record<PhotoSlotType, HTMLInputElement | null>>({
    kegiatan: null,
    kmhm: null,
    struk: null,
  });

  const resolveStartIndex = (slot: PhotoSlotType): number => {
    const choice = startChoices[slot];
    if (choice === 'first-empty') {
      const idx = records.findIndex((r) => !getPhotoBySlot(r, slot));
      return idx === -1 ? 0 : idx;
    }
    const parsed = parseInt(choice, 10);
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, records.length - 1));
  };

  const handleFilesSelected = async (slot: PhotoSlotType, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const startIdx = resolveStartIndex(slot);
    await onBatchUpload(slot, files, startIdx, sortMode, fitChoices[slot]);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Upload Massal Berurutan
          </h2>
          <p className="text-sm text-slate-600">
            Pilih atau tarik banyak foto sekaligus per kategori. Foto akan otomatis masuk berurutan ke baris tanggal 1 sampai {records.length}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label
            htmlFor="batch-sort-mode"
            className="text-xs font-medium text-slate-600 whitespace-nowrap"
          >
            Urutan File:
          </label>
          <select
            id="batch-sort-mode"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
          >
            <option value="natural">Nama File (1, 2, 10...)</option>
            <option value="modified">Waktu Foto (Terlama → Terbaru)</option>
            <option value="selection">Sesuai Urutan Pilihan</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SLOT_CONFIGS.map((cfg) => {
          const filledCount = records.filter((r) => Boolean(getPhotoBySlot(r, cfg.slot))).length;
          const percent = records.length > 0 ? Math.round((filledCount / records.length) * 100) : 0;
          const isUploading = uploadingSlot === cfg.slot;
          const isDragging = dragActiveSlot === cfg.slot;
          const nextStartIdx = resolveStartIndex(cfg.slot);

          return (
            <div
              key={cfg.slot}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-tabular font-semibold text-slate-700">
                        {cfg.stepNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {filledCount} / {records.length} terisi ({percent}%)
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      {cfg.title}
                    </h3>
                  </div>

                  {filledCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onClearColumn(cfg.slot)}
                      disabled={uploadingSlot !== null}
                      title={`Kosongkan semua ${cfg.title}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Kosongkan</span>
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-300 ${
                      filledCount === records.length && records.length > 0
                        ? 'bg-emerald-600'
                        : 'bg-slate-900'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActiveSlot(cfg.slot);
                  }}
                  onDragLeave={() => setDragActiveSlot(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragActiveSlot(null);
                    await handleFilesSelected(cfg.slot, e.dataTransfer.files);
                  }}
                  onClick={() => {
                    if (uploadingSlot === null) {
                      inputRefs.current[cfg.slot]?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      inputRefs.current[cfg.slot]?.click();
                    }
                  }}
                  className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${
                    isDragging
                      ? 'border-slate-900 bg-slate-100'
                      : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={(el) => {
                      inputRefs.current[cfg.slot] = el;
                    }}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      await handleFilesSelected(cfg.slot, e.target.files);
                      e.target.value = '';
                    }}
                  />

                  {isUploading && uploadProgress ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-800" />
                      <span className="text-xs font-medium text-slate-800 tabular-nums">
                        Memproses {uploadProgress.current} / {uploadProgress.total} foto...
                      </span>
                    </div>
                  ) : filledCount === records.length && records.length > 0 ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-900">
                        Semua {records.length} baris sudah terisi
                      </span>
                      <span className="text-xs text-slate-500">
                        Klik atau tarik foto lagi untuk menimpa
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-slate-600" />
                      <span className="text-xs font-medium text-slate-900">
                        Pilih banyak foto atau tarik ke sini
                      </span>
                      <span className="text-xs text-slate-500">
                        {cfg.subtitle}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Start row & Fit controls */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">
                    Mulai dari Baris
                  </label>
                  <select
                    value={startChoices[cfg.slot]}
                    onChange={(e) =>
                      setStartChoices((prev) => ({
                        ...prev,
                        [cfg.slot]: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="first-empty">
                      Kosong pertama (#{nextStartIdx + 1})
                    </option>
                    {records.map((rec, idx) => (
                      <option key={rec.id} value={String(idx)}>
                        #{rec.orderIndex} ({formatTanggalDash(rec.tanggalRaw)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500">
                    Tampilan di Kotak PDF
                  </label>
                  <select
                    value={fitChoices[cfg.slot]}
                    onChange={(e) =>
                      setFitChoices((prev) => ({
                        ...prev,
                        [cfg.slot]: e.target.value as PhotoFitMode,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="contain">Utuh (Tanpa Terpotong)</option>
                    <option value="cover">Isi Penuh (Potong Rapi)</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
