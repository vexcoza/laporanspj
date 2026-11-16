import React, { useEffect, useMemo, useState } from 'react';
import {
  FileArchive,
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TableProperties,
} from 'lucide-react';
import { A4ReportPreview } from './components/A4ReportPreview';
import { BatchUploadHub } from './components/BatchUploadHub';
import { ReportTable } from './components/ReportTable';
import { SettingsPanel } from './components/SettingsPanel';
import {
  ParsedSpreadsheetResult,
  SpreadsheetImportPanel,
} from './components/SpreadsheetImportPanel';
import {
  createInitialRecords,
  DEFAULT_SETTINGS,
  getMonthKey,
} from './data/initialRecords';
import {
  ExportProgress,
  PhotoAsset,
  PhotoFitMode,
  PhotoSlotType,
  ReportEntry,
  ReportSettings,
  SortMode,
} from './types/report';
import {
  processImageFile,
  rotatePhotoAsset,
  sortFiles,
} from './utils/imageProcessor';
import {
  generateCombinedPdf,
  generateSingleReportPdf,
  generateZipOfPdfs,
} from './utils/pdfGenerator';
import {
  clearWorkspaceDb,
  loadWorkspaceFromDb,
  saveWorkspaceToDb,
} from './utils/storage';

type ActiveSection = 'workspace' | 'import' | 'upload' | 'settings';
type ExportScope = 'all' | 'checked' | 'complete';

function slotFieldKey(
  slot: PhotoSlotType
): 'fotoKegiatan' | 'fotoKmHm' | 'fotoStruk' {
  if (slot === 'kegiatan') return 'fotoKegiatan';
  if (slot === 'kmhm') return 'fotoKmHm';
  return 'fotoStruk';
}

export default function App() {
  const [records, setRecords] = useState<ReportEntry[]>(() =>
    createInitialRecords()
  );
  const [settings, setSettings] = useState<ReportSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveSection>('workspace');
  const [showInlineImport, setShowInlineImport] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string>('row-1');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'complete' | 'incomplete'
  >('all');
  const [exportScope, setExportScope] = useState<ExportScope>('all');

  const [uploadingSlot, setUploadingSlot] = useState<PhotoSlotType | null>(
    null
  );
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    active: false,
    label: '',
    current: 0,
    total: 0,
  });

  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Hydrate persisted workspace from IndexedDB
  useEffect(() => {
    let active = true;
    loadWorkspaceFromDb().then((saved) => {
      if (!active) return;
      if (saved && Array.isArray(saved.records) && saved.records.length > 0) {
        setRecords(saved.records);
        setSelectedRowId(saved.records[0].id);
      }
      if (saved && saved.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...saved.settings });
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-save to IndexedDB whenever records or settings change after hydration
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveWorkspaceToDb({
        records,
        settings,
        updatedAt: Date.now(),
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [records, settings, hydrated]);

  // Auto-dismiss transient notices
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => {
    const total = records.length;
    const kegiatan = records.filter((r) => Boolean(r.fotoKegiatan)).length;
    const kmhm = records.filter((r) => Boolean(r.fotoKmHm)).length;
    const struk = records.filter((r) => Boolean(r.fotoStruk)).length;
    const complete = records.filter(
      (r) => r.fotoKegiatan && r.fotoKmHm && r.fotoStruk
    ).length;
    return { total, kegiatan, kmhm, struk, complete };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((entry) => {
      if (monthFilter !== 'all' && getMonthKey(entry.tanggalRaw) !== monthFilter) {
        return false;
      }
      const isComplete = Boolean(
        entry.fotoKegiatan && entry.fotoKmHm && entry.fotoStruk
      );
      if (statusFilter === 'complete' && !isComplete) return false;
      if (statusFilter === 'incomplete' && isComplete) return false;
      if (q) {
        const hay = `${entry.tanggalRaw} ${entry.lokasi}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, monthFilter, statusFilter, searchQuery]);

  const selectedEntry = useMemo(() => {
    return (
      records.find((r) => r.id === selectedRowId) ??
      filteredRecords[0] ??
      records[0] ??
      null
    );
  }, [records, filteredRecords, selectedRowId]);

  const selectedIndexInFiltered = useMemo(() => {
    if (!selectedEntry) return -1;
    return filteredRecords.findIndex((r) => r.id === selectedEntry.id);
  }, [filteredRecords, selectedEntry]);

  const handleBatchUpload = async (
    slot: PhotoSlotType,
    files: File[],
    startIndex: number,
    sortMode: SortMode,
    fitMode: PhotoFitMode
  ) => {
    const sorted = sortFiles(files, sortMode);
    const maxSlots = records.length - startIndex;
    const filesToProcess = sorted.slice(0, maxSlots);

    if (filesToProcess.length === 0) return;

    setUploadingSlot(slot);
    setUploadProgress({ current: 0, total: filesToProcess.length });

    try {
      const processedAssets: PhotoAsset[] = [];
      for (let i = 0; i < filesToProcess.length; i++) {
        const asset = await processImageFile(filesToProcess[i], fitMode);
        processedAssets.push(asset);
        setUploadProgress({ current: i + 1, total: filesToProcess.length });
      }

      const key = slotFieldKey(slot);
      setRecords((prev) =>
        prev.map((row, idx) => {
          const offset = idx - startIndex;
          if (offset >= 0 && offset < processedAssets.length) {
            return { ...row, [key]: processedAssets[offset] };
          }
          return row;
        })
      );

      if (records[startIndex]) {
        setSelectedRowId(records[startIndex].id);
      }

      const skipped = sorted.length - filesToProcess.length;
      setNotice({
        type: 'success',
        text:
          skipped > 0
            ? `${processedAssets.length} foto masuk berurutan mulai baris #${startIndex + 1}. (${skipped} file sisa tidak dimuat karena melebihi jumlah baris.)`
            : `${processedAssets.length} foto berhasil dimasukkan berurutan mulai baris #${startIndex + 1}.`,
      });
    } catch {
      setNotice({
        type: 'error',
        text: 'Sebagian file gambar gagal diproses. Pastikan format file adalah JPG, PNG, atau WebP.',
      });
    } finally {
      setUploadingSlot(null);
      setUploadProgress(null);
    }
  };

  const handleSingleUpload = async (
    entryId: string,
    slot: PhotoSlotType,
    file: File
  ) => {
    try {
      const defaultFit: PhotoFitMode = slot === 'kegiatan' ? 'cover' : 'contain';
      const asset = await processImageFile(file, defaultFit);
      const key = slotFieldKey(slot);
      setRecords((prev) =>
        prev.map((r) => (r.id === entryId ? { ...r, [key]: asset } : r))
      );
      setSelectedRowId(entryId);
    } catch {
      setNotice({
        type: 'error',
        text: 'Gagal membaca foto yang dipilih.',
      });
    }
  };

  const handleRotatePhoto = async (entryId: string, slot: PhotoSlotType) => {
    const key = slotFieldKey(slot);
    const target = records.find((r) => r.id === entryId);
    const currentAsset = target?.[key];
    if (!currentAsset) return;
    try {
      const rotated = await rotatePhotoAsset(currentAsset, 90);
      setRecords((prev) =>
        prev.map((r) => (r.id === entryId ? { ...r, [key]: rotated } : r))
      );
    } catch {
      setNotice({ type: 'error', text: 'Gagal memutar foto.' });
    }
  };

  const handleToggleFit = (entryId: string, slot: PhotoSlotType) => {
    const key = slotFieldKey(slot);
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== entryId) return r;
        const asset = r[key];
        if (!asset) return r;
        const nextFit: PhotoFitMode =
          (asset.fitMode ?? 'contain') === 'cover' ? 'contain' : 'cover';
        return { ...r, [key]: { ...asset, fitMode: nextFit } };
      })
    );
  };

  const handleRemovePhoto = (entryId: string, slot: PhotoSlotType) => {
    const key = slotFieldKey(slot);
    setRecords((prev) =>
      prev.map((r) => (r.id === entryId ? { ...r, [key]: null } : r))
    );
  };

  // Shift photos down by 1 row starting at entryId (inserts blank at entryId)
  const handleShiftSlotDown = (entryId: string, slot: PhotoSlotType) => {
    const key = slotFieldKey(slot);
    setRecords((prev) => {
      const startIdx = prev.findIndex((r) => r.id === entryId);
      if (startIdx === -1) return prev;
      const next = [...prev];
      for (let i = next.length - 1; i > startIdx; i--) {
        next[i] = { ...next[i], [key]: next[i - 1][key] };
      }
      next[startIdx] = { ...next[startIdx], [key]: null };
      return next;
    });
  };

  // Remove photo at entryId and pull subsequent photos up by 1 row
  const handleShiftSlotUp = (entryId: string, slot: PhotoSlotType) => {
    const key = slotFieldKey(slot);
    setRecords((prev) => {
      const startIdx = prev.findIndex((r) => r.id === entryId);
      if (startIdx === -1) return prev;
      const next = [...prev];
      for (let i = startIdx; i < next.length - 1; i++) {
        next[i] = { ...next[i], [key]: next[i + 1][key] };
      }
      next[next.length - 1] = { ...next[next.length - 1], [key]: null };
      return next;
    });
  };

  const handleClearColumn = (slot: PhotoSlotType) => {
    const labelMap: Record<PhotoSlotType, string> = {
      kegiatan: 'Foto Kegiatan',
      kmhm: 'Foto Km/Hm/Alat',
      struk: 'Foto Struk BBM',
    };
    setConfirmAction({
      message: `Hapus semua foto pada kolom ${labelMap[slot]}?`,
      onConfirm: () => {
        const key = slotFieldKey(slot);
        setRecords((prev) => prev.map((r) => ({ ...r, [key]: null })));
        setConfirmAction(null);
        setNotice({
          type: 'success',
          text: `Semua foto di kolom ${labelMap[slot]} telah dikosongkan.`,
        });
      },
    });
  };

  const handleUpdateEntryFields = (
    entryId: string,
    updates: Partial<Pick<ReportEntry, 'tanggalRaw' | 'lokasi'>>
  ) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === entryId ? { ...r, ...updates } : r))
    );
  };

  const handleAddRow = (tanggalRaw: string, lokasi: string) => {
    const nextOrder = records.length + 1;
    const newRow: ReportEntry = {
      id: `row-${Date.now()}`,
      orderIndex: nextOrder,
      tanggalRaw,
      jamRaw: '-',
      liter: '-',
      harga: '-',
      nilai: '-',
      lokasi,
      fotoKegiatan: null,
      fotoKmHm: null,
      fotoStruk: null,
    };
    setRecords((prev) => [...prev, newRow]);
    setSelectedRowId(newRow.id);
    setNotice({
      type: 'success',
      text: `Baris #${nextOrder} (${tanggalRaw}) ditambahkan.`,
    });
  };

  const handleDeleteRow = (entryId: string) => {
    setRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== entryId);
      return filtered.map((r, i) => ({ ...r, orderIndex: i + 1 }));
    });
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
  };

  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleCheckAllVisible = () => {
    const allChecked =
      filteredRecords.length > 0 &&
      filteredRecords.every((r) => checkedIds.has(r.id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        filteredRecords.forEach((r) => next.delete(r.id));
      } else {
        filteredRecords.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const resolveExportEntries = (): ReportEntry[] => {
    if (exportScope === 'checked') {
      return records.filter((r) => checkedIds.has(r.id));
    }
    if (exportScope === 'complete') {
      return records.filter(
        (r) => r.fotoKegiatan && r.fotoKmHm && r.fotoStruk
      );
    }
    return records;
  };

  const handleExportCombinedPdf = async () => {
    const targets = resolveExportEntries();
    if (targets.length === 0) {
      setNotice({
        type: 'error',
        text: 'Tidak ada baris yang memenuhi pilihan ekspor saat ini.',
      });
      return;
    }
    setExportProgress({
      active: true,
      label: 'Membuat PDF gabungan...',
      current: 0,
      total: targets.length,
    });
    try {
      await generateCombinedPdf(targets, settings, (current, total) => {
        setExportProgress({
          active: true,
          label: 'Menyusun halaman PDF...',
          current,
          total,
        });
      });
      setNotice({
        type: 'success',
        text: `PDF gabungan (${targets.length} halaman) berhasil diunduh.`,
      });
    } catch {
      setNotice({
        type: 'error',
        text: 'Terjadi kendala saat membuat PDF gabungan.',
      });
    } finally {
      setExportProgress({ active: false, label: '', current: 0, total: 0 });
    }
  };

  const handleExportZip = async () => {
    const targets = resolveExportEntries();
    if (targets.length === 0) {
      setNotice({
        type: 'error',
        text: 'Tidak ada baris yang memenuhi pilihan ekspor saat ini.',
      });
      return;
    }
    setExportProgress({
      active: true,
      label: 'Membuat arsip ZIP PDF satuan...',
      current: 0,
      total: targets.length,
    });
    try {
      await generateZipOfPdfs(targets, settings, (current, total) => {
        setExportProgress({
          active: true,
          label: 'Mengemas file PDF satuan...',
          current,
          total,
        });
      });
      setNotice({
        type: 'success',
        text: `ZIP berisi ${targets.length} file PDF satuan berhasil diunduh.`,
      });
    } catch {
      setNotice({
        type: 'error',
        text: 'Terjadi kendala saat mengemas file ZIP.',
      });
    } finally {
      setExportProgress({ active: false, label: '', current: 0, total: 0 });
    }
  };

  const handleDownloadSinglePdf = async (entry: ReportEntry) => {
    try {
      await generateSingleReportPdf(entry, settings);
    } catch {
      setNotice({
        type: 'error',
        text: 'Gagal mengunduh PDF halaman ini.',
      });
    }
  };

  const handleResetAll = () => {
    setConfirmAction({
      message:
        'Kembalikan semua 61 baris ke data awal Foto 1 dan hapus semua foto yang sudah diunggah?',
      onConfirm: async () => {
        await clearWorkspaceDb();
        const fresh = createInitialRecords();
        setRecords(fresh);
        setSettings(DEFAULT_SETTINGS);
        setSelectedRowId(fresh[0].id);
        setCheckedIds(new Set());
        setConfirmAction(null);
        setNotice({
          type: 'success',
          text: 'Data berhasil dikembalikan ke pengaturan awal.',
        });
      },
    });
  };

  const handleApplySpreadsheetRows = (
    result: ParsedSpreadsheetResult,
    mode: 'replace' | 'append',
    updateVehicleMeta: boolean
  ) => {
    const newEntries: ReportEntry[] = result.rows.map((r, idx) => ({
      id: `row-${Date.now()}-${idx + 1}`,
      orderIndex: idx + 1,
      tanggalRaw: r.tanggalRaw,
      jamRaw: r.jamRaw || '-',
      liter: r.liter || '-',
      harga: r.harga || '-',
      nilai: r.nilai || '-',
      lokasi: r.lokasi,
      highlighted: Boolean(r.highlighted),
      fotoKegiatan: null,
      fotoKmHm: null,
      fotoStruk: null,
    }));

    if (mode === 'replace') {
      setRecords(newEntries);
      setCheckedIds(new Set());
      if (newEntries[0]) setSelectedRowId(newEntries[0].id);
    } else {
      setRecords((prev) => {
        const merged = [...prev, ...newEntries].map((item, idx) => ({
          ...item,
          orderIndex: idx + 1,
        }));
        return merged;
      });
    }

    if (updateVehicleMeta) {
      setSettings((prev) => ({
        ...prev,
        jenisKendaraan: result.jenisKendaraan || prev.jenisKendaraan,
        noIdentitas: result.noIdentitas || prev.noIdentitas,
      }));
    }

    setShowInlineImport(false);
    setActiveTab('workspace');
    setNotice({
      type: 'success',
      text: `${newEntries.length} baris dari tabel berhasil ${
        mode === 'replace' ? 'dimuat ke daftar laporan' : 'ditambahkan ke daftar'
      }.`,
    });
  };

  const exportTargetsCount = resolveExportEntries().length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('workspace');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SPJ Bina Marga
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'workspace'
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              Workspace Laporan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'import'
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              Import Tabel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'upload'
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              Upload Massal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`pb-0.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              Pengaturan Data
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCombinedPdf}
              disabled={exportProgress.active || exportTargetsCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {exportProgress.active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              <span>Unduh PDF Gabungan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        {/* Mobile Section Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 md:hidden">
          {(
            [
              { id: 'workspace', label: 'Workspace' },
              { id: 'import', label: 'Import Tabel' },
              { id: 'upload', label: 'Upload Foto' },
              { id: 'settings', label: 'Pengaturan' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Inline Confirmation Prompt (replaces window.confirm) */}
        {confirmAction && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-amber-950">
              {confirmAction.message}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={confirmAction.onConfirm}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
              >
                Ya, Lanjutkan
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Inline Feedback Notice */}
        {notice && (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
              )}
              <span>{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-medium underline underline-offset-2 shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Export Progress Bar */}
        {exportProgress.active && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-800">
              <span>{exportProgress.label}</span>
              <span className="font-mono-tabular">
                {exportProgress.current} / {exportProgress.total} halaman
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-all duration-150"
                style={{
                  width: `${
                    exportProgress.total > 0
                      ? Math.round(
                          (exportProgress.current / exportProgress.total) * 100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Workspace Summary & Batch Export Toolbar */}
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
              <span>{settings.jenisKendaraan}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-slate-700">
                {settings.noIdentitas}
              </span>
              <span aria-hidden="true">·</span>
              <span>Pengguna: {settings.penggunaNama}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Laporan Penggunaan Kendaraan Dinas ({stats.total} Tanggal)
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-slate-600 tabular-nums">
              <span>
                Kegiatan:{' '}
                <strong className="font-semibold text-slate-900">
                  {stats.kegiatan}/{stats.total}
                </strong>
              </span>
              <span>
                Km/Hm/Alat:{' '}
                <strong className="font-semibold text-slate-900">
                  {stats.kmhm}/{stats.total}
                </strong>
              </span>
              <span>
                Struk BBM:{' '}
                <strong className="font-semibold text-slate-900">
                  {stats.struk}/{stats.total}
                </strong>
              </span>
              <span>
                Lengkap 3 Foto:{' '}
                <strong className="font-semibold text-emerald-700">
                  {stats.complete}/{stats.total}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'workspace' && (
              <button
                type="button"
                onClick={() => setShowInlineImport((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  showInlineImport
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <TableProperties className="h-3.5 w-3.5" />
                <span>Import Foto Tabel / CSV</span>
              </button>
            )}

            <select
              aria-label="Pilih cakupan ekspor PDF"
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value as ExportScope)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Baris ({records.length})</option>
              <option value="complete">
                Hanya yang Lengkap 3 Foto ({stats.complete})
              </option>
              <option value="checked">
                Hanya yang Dicentang ({checkedIds.size})
              </option>
            </select>

            <button
              type="button"
              onClick={handleExportZip}
              disabled={exportProgress.active || exportTargetsCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <FileArchive className="h-3.5 w-3.5" />
              <span>Unduh ZIP Satuan ({exportTargetsCount})</span>
            </button>
          </div>
        </section>

        {activeTab === 'settings' ? (
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onResetAll={handleResetAll}
          />
        ) : activeTab === 'import' ? (
          <SpreadsheetImportPanel
            onApplyRows={handleApplySpreadsheetRows}
            onError={(msg) => setNotice({ type: 'error', text: msg })}
          />
        ) : (
          <>
            {activeTab === 'workspace' && showInlineImport && (
              <SpreadsheetImportPanel
                onApplyRows={handleApplySpreadsheetRows}
                onError={(msg) => setNotice({ type: 'error', text: msg })}
                onClose={() => setShowInlineImport(false)}
              />
            )}

            <BatchUploadHub
              records={records}
              onBatchUpload={handleBatchUpload}
              onClearColumn={handleClearColumn}
              uploadingSlot={uploadingSlot}
              uploadProgress={uploadProgress}
            />

            {activeTab === 'workspace' && (
              <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.35fr_1fr]">
                <ReportTable
                  records={records}
                  filteredRecords={filteredRecords}
                  selectedRowId={selectedEntry?.id ?? ''}
                  checkedIds={checkedIds}
                  searchQuery={searchQuery}
                  monthFilter={monthFilter}
                  statusFilter={statusFilter}
                  onSearchChange={setSearchQuery}
                  onMonthFilterChange={setMonthFilter}
                  onStatusFilterChange={setStatusFilter}
                  onSelectRow={setSelectedRowId}
                  onToggleCheck={handleToggleCheck}
                  onToggleCheckAllVisible={handleToggleCheckAllVisible}
                  onSingleUpload={handleSingleUpload}
                  onRotatePhoto={handleRotatePhoto}
                  onRemovePhoto={handleRemovePhoto}
                  onShiftSlotDown={handleShiftSlotDown}
                  onShiftSlotUp={handleShiftSlotUp}
                  onUpdateEntryFields={handleUpdateEntryFields}
                  onAddRow={handleAddRow}
                  onDeleteRow={handleDeleteRow}
                  onDownloadSinglePdf={handleDownloadSinglePdf}
                />

                <div className="xl:sticky xl:top-[76px]">
                  <A4ReportPreview
                    entry={selectedEntry}
                    settings={settings}
                    totalCount={filteredRecords.length}
                    currentPosition={
                      selectedIndexInFiltered >= 0
                        ? selectedIndexInFiltered + 1
                        : 1
                    }
                    onPrev={() => {
                      if (selectedIndexInFiltered > 0) {
                        setSelectedRowId(
                          filteredRecords[selectedIndexInFiltered - 1].id
                        );
                      }
                    }}
                    onNext={() => {
                      if (
                        selectedIndexInFiltered >= 0 &&
                        selectedIndexInFiltered < filteredRecords.length - 1
                      ) {
                        setSelectedRowId(
                          filteredRecords[selectedIndexInFiltered + 1].id
                        );
                      }
                    }}
                    onSingleUpload={handleSingleUpload}
                    onRotatePhoto={handleRotatePhoto}
                    onToggleFit={handleToggleFit}
                    onRemovePhoto={handleRemovePhoto}
                    onDownloadSinglePdf={handleDownloadSinglePdf}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
