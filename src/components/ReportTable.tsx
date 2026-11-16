import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Eye,
  ImagePlus,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatHariTanggal,
  formatTanggalDash,
  getMonthKey,
  MONTH_FILTERS,
} from '../data/initialRecords';
import { PhotoAsset, PhotoSlotType, ReportEntry } from '../types/report';

interface ReportTableProps {
  records: ReportEntry[];
  filteredRecords: ReportEntry[];
  selectedRowId: string;
  checkedIds: Set<string>;
  searchQuery: string;
  monthFilter: string;
  statusFilter: 'all' | 'complete' | 'incomplete';
  onSearchChange: (q: string) => void;
  onMonthFilterChange: (month: string) => void;
  onStatusFilterChange: (status: 'all' | 'complete' | 'incomplete') => void;
  onSelectRow: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleCheckAllVisible: () => void;
  onSingleUpload: (entryId: string, slot: PhotoSlotType, file: File) => void;
  onRotatePhoto: (entryId: string, slot: PhotoSlotType) => void;
  onRemovePhoto: (entryId: string, slot: PhotoSlotType) => void;
  onShiftSlotDown: (entryId: string, slot: PhotoSlotType) => void;
  onShiftSlotUp: (entryId: string, slot: PhotoSlotType) => void;
  onUpdateEntryFields: (
    entryId: string,
    updates: Partial<Pick<ReportEntry, 'tanggalRaw' | 'lokasi'>>
  ) => void;
  onAddRow: (tanggalRaw: string, lokasi: string) => void;
  onDeleteRow: (entryId: string) => void;
  onDownloadSinglePdf: (entry: ReportEntry) => void;
}

function getSlotAsset(entry: ReportEntry, slot: PhotoSlotType): PhotoAsset | null {
  if (slot === 'kegiatan') return entry.fotoKegiatan;
  if (slot === 'kmhm') return entry.fotoKmHm;
  return entry.fotoStruk;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  records,
  filteredRecords,
  selectedRowId,
  checkedIds,
  searchQuery,
  monthFilter,
  statusFilter,
  onSearchChange,
  onMonthFilterChange,
  onStatusFilterChange,
  onSelectRow,
  onToggleCheck,
  onToggleCheckAllVisible,
  onSingleUpload,
  onRotatePhoto,
  onRemovePhoto,
  onShiftSlotDown,
  onShiftSlotUp,
  onUpdateEntryFields,
  onAddRow,
  onDeleteRow,
  onDownloadSinglePdf,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editLokasi, setEditLokasi] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTanggal, setNewTanggal] = useState('');
  const [newLokasi, setNewLokasi] = useState('');

  const hiddenPickerRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadTargetRef = useRef<{
    entryId: string;
    slot: PhotoSlotType;
  } | null>(null);

  const triggerSingleFilePicker = (entryId: string, slot: PhotoSlotType) => {
    pendingUploadTargetRef.current = { entryId, slot };
    hiddenPickerRef.current?.click();
  };

  const allVisibleChecked =
    filteredRecords.length > 0 &&
    filteredRecords.every((r) => checkedIds.has(r.id));

  const startEditing = (entry: ReportEntry) => {
    setEditingId(entry.id);
    setEditTanggal(entry.tanggalRaw);
    setEditLokasi(entry.lokasi);
  };

  const saveEditing = (entryId: string) => {
    if (editTanggal.trim() && editLokasi.trim()) {
      onUpdateEntryFields(entryId, {
        tanggalRaw: editTanggal.trim(),
        lokasi: editLokasi.trim(),
      });
    }
    setEditingId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTanggal.trim() || !newLokasi.trim()) return;
    onAddRow(newTanggal.trim(), newLokasi.trim());
    setNewTanggal('');
    setNewLokasi('');
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      <input
        ref={hiddenPickerRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const target = pendingUploadTargetRef.current;
          if (file && target) {
            onSingleUpload(target.entryId, target.slot, file);
          }
          e.target.value = '';
        }}
      />

      {/* Filter & Search Bar */}
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari tanggal atau lokasi kegiatan..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Completion Filter */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'complete', label: 'Lengkap' },
                  { id: 'incomplete', label: 'Belum Lengkap' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Baris</span>
            </button>
          </div>
        </div>

        {/* Month Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {MONTH_FILTERS.map((m) => {
            const count =
              m.key === 'all'
                ? records.length
                : records.filter((r) => getMonthKey(r.tanggalRaw) === m.key).length;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onMonthFilterChange(m.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  monthFilter === m.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {m.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Optional Add New Row Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end"
          >
            <div className="w-full sm:w-40">
              <label className="block text-xs font-medium text-slate-700">
                Tanggal (DD/MM/YYYY)
              </label>
              <input
                type="text"
                required
                placeholder="10/11/2026"
                value={newTanggal}
                onChange={(e) => setNewTanggal(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700">
                Kegiatan dan Lokasi
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Gudang Pulogebang Jakarta Timur"
                value={newLokasi}
                onChange={(e) => setNewLokasi(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                Simpan Baris
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-600">
              <th className="w-10 px-3 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleChecked}
                  onChange={onToggleCheckAllVisible}
                  aria-label="Pilih semua baris yang tampil"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </th>
              <th className="w-10 px-2 py-2.5 text-right">#</th>
              <th className="min-w-[165px] px-3 py-2.5">Hari / Tanggal</th>
              <th className="min-w-[210px] px-3 py-2.5">Kegiatan &amp; Lokasi</th>
              <th className="w-[104px] px-2 py-2.5 text-center">Kegiatan</th>
              <th className="w-[104px] px-2 py-2.5 text-center">Km/Hm/Alat</th>
              <th className="w-[104px] px-2 py-2.5 text-center">Struk BBM</th>
              <th className="w-24 px-3 py-2.5 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  Tidak ada baris laporan yang sesuai filter saat ini.
                </td>
              </tr>
            ) : (
              filteredRecords.map((entry) => {
                const isSelected = entry.id === selectedRowId;
                const isChecked = checkedIds.has(entry.id);
                const isEditing = editingId === entry.id;

                return (
                  <tr
                    key={entry.id}
                    onClick={() => onSelectRow(entry.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/70'
                        : entry.highlighted
                          ? 'bg-yellow-50/40 hover:bg-slate-50'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <td
                      className="px-3 py-2.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleCheck(entry.id)}
                        aria-label={`Pilih baris ${entry.orderIndex}`}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </td>

                    <td className="px-2 py-2.5 text-right font-mono-tabular text-xs font-medium text-slate-500">
                      {entry.orderIndex}
                    </td>

                    <td className="px-3 py-2.5 align-top">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTanggal}
                          onChange={(e) => setEditTanggal(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono-tabular text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                        />
                      ) : (
                        <div>
                          <div className="text-xs font-medium text-slate-900 tabular-nums">
                            {formatHariTanggal(entry.tanggalRaw)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                            {entry.jamRaw} · {entry.liter} L · {entry.nilai}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 align-top">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editLokasi}
                            onChange={(e) => setEditLokasi(e.target.value)}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => saveEditing(entry.id)}
                            title="Simpan"
                            className="rounded bg-slate-900 p-1 text-white hover:bg-slate-800"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            title="Batal"
                            className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="group/loc flex items-start justify-between gap-1.5">
                          <span className="text-xs leading-relaxed text-slate-800">
                            {entry.lokasi}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(entry);
                            }}
                            title="Edit tanggal atau lokasi"
                            className="shrink-0 rounded p-1 text-slate-400 opacity-0 hover:bg-slate-200/70 hover:text-slate-700 group-hover/loc:opacity-100"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 3 Photo Slot Cells */}
                    {(['kegiatan', 'kmhm', 'struk'] as PhotoSlotType[]).map(
                      (slot) => {
                        const asset = getSlotAsset(entry, slot);
                        return (
                          <td
                            key={slot}
                            className="px-2 py-2 text-center align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {asset ? (
                              <div className="group/thumb relative mx-auto h-14 w-12 overflow-hidden rounded border border-slate-200 bg-white">
                                <img
                                  src={asset.dataUrl}
                                  alt={`${slot} ${formatTanggalDash(entry.tanggalRaw)}`}
                                  className="h-full w-full object-cover"
                                  onClick={() => onSelectRow(entry.id)}
                                />
                                <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 bg-slate-900/75 p-0.5 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => onRotatePhoto(entry.id, slot)}
                                    title="Putar 90°"
                                    className="rounded p-0.5 text-white hover:bg-white/20"
                                  >
                                    <RotateCw className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onShiftSlotDown(entry.id, slot)}
                                    title="Sisipkan kosong & geser foto ini ke baris bawah (+1)"
                                    className="rounded p-0.5 text-white hover:bg-white/20"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onShiftSlotUp(entry.id, slot)}
                                    title="Hapus & tarik foto di bawah naik (-1)"
                                    className="rounded p-0.5 text-amber-300 hover:bg-white/20"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRemovePhoto(entry.id, slot)}
                                    title="Hapus foto ini saja"
                                    className="rounded p-0.5 text-red-300 hover:bg-red-500/30"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => triggerSingleFilePicker(entry.id, slot)}
                                title="Upload foto satuan"
                                className="mx-auto flex h-14 w-12 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50/70 text-slate-400 hover:border-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              >
                                <ImagePlus className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        );
                      }
                    )}

                    <td
                      className="px-3 py-2.5 text-right align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectRow(entry.id)}
                          title="Lihat pratinjau A4"
                          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownloadSinglePdf(entry)}
                          title="Unduh PDF baris ini"
                          className="rounded-md p-1.5 text-slate-700 hover:bg-slate-900 hover:text-white transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {records.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteRow(entry.id)}
                            title="Hapus baris"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
