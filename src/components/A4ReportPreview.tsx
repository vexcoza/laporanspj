import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  Maximize2,
  Minimize2,
  RotateCw,
  Trash2,
} from 'lucide-react';
import {
  formatHariTanggal,
  formatKegiatanLokasi,
  formatTanggalDash,
} from '../data/initialRecords';
import { PhotoAsset, PhotoSlotType, ReportEntry, ReportSettings } from '../types/report';

interface A4ReportPreviewProps {
  entry: ReportEntry | null;
  settings: ReportSettings;
  totalCount: number;
  currentPosition: number; // 1-based in current list
  onPrev: () => void;
  onNext: () => void;
  onSingleUpload: (entryId: string, slot: PhotoSlotType, file: File) => void;
  onRotatePhoto: (entryId: string, slot: PhotoSlotType) => void;
  onToggleFit: (entryId: string, slot: PhotoSlotType) => void;
  onRemovePhoto: (entryId: string, slot: PhotoSlotType) => void;
  onDownloadSinglePdf: (entry: ReportEntry) => void;
}

export const A4ReportPreview: React.FC<A4ReportPreviewProps> = ({
  entry,
  settings,
  totalCount,
  currentPosition,
  onPrev,
  onNext,
  onSingleUpload,
  onRotatePhoto,
  onToggleFit,
  onRemovePhoto,
  onDownloadSinglePdf,
}) => {
  const fileInputRefs = useRef<Record<PhotoSlotType, HTMLInputElement | null>>({
    kegiatan: null,
    kmhm: null,
    struk: null,
  });

  if (!entry) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">
          Pilih baris laporan di tabel untuk melihat pratinjau dokumen A4.
        </p>
      </div>
    );
  }

  const slots: Array<{
    slot: PhotoSlotType;
    label: string;
    asset: PhotoAsset | null;
  }> = [
    { slot: 'kegiatan', label: 'Foto Kegiatan', asset: entry.fotoKegiatan },
    { slot: 'kmhm', label: 'Foto Km/Hm/Alat', asset: entry.fotoKmHm },
    { slot: 'struk', label: 'Foto Struk BBM', asset: entry.fotoStruk },
  ];

  const tanggalDash = formatTanggalDash(entry.tanggalRaw);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentPosition <= 1}
            aria-label="Laporan sebelumnya"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono-tabular text-xs font-medium text-slate-700 whitespace-nowrap">
            Baris {currentPosition} / {totalCount}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={currentPosition >= totalCount}
            aria-label="Laporan berikutnya"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onDownloadSinglePdf(entry)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Unduh PDF Halaman Ini</span>
        </button>
      </div>

      {/* A4 Paper Canvas */}
      <div className="bg-slate-100 p-4 sm:p-6">
        <div
          className="mx-auto w-full max-w-[595px] bg-white shadow-sm ring-1 ring-slate-200"
          style={{ aspectRatio: '210 / 297' }}
        >
          <div className="flex h-full flex-col justify-between px-[5.7%] py-[4.2%] text-[#191919] select-none">
            <div>
              {/* Yellow Header Banner */}
              <div className="bg-[#FFFF00] px-3 py-[1.6%] text-center leading-snug text-black">
                <p className="text-[11px] sm:text-[13px] font-bold tracking-tight">
                  UNIT PERALATAN DAN PERBEKALAN BINA MARGA
                </p>
                <p className="text-[11px] sm:text-[13px] font-bold tracking-tight">
                  DINAS BINA MARGA PROVINSI DKI JAKARTA
                </p>
                <p className="text-[11px] sm:text-[13px] font-bold tracking-tight">
                  Laporan Penggunaan Kendaraan Dinas dan Peralatan
                </p>
              </div>

              {/* Metadata Block */}
              <div className="mt-[4%] space-y-[2.2%] px-[1.5%] text-[10px] sm:text-[11.5px]">
                <div className="grid grid-cols-[50%_1fr] items-baseline gap-1">
                  <span>Hari / Tanggal Kegiatan</span>
                  <span className="font-normal">
                    : {formatHariTanggal(entry.tanggalRaw)}
                  </span>
                </div>
                <div className="grid grid-cols-[50%_1fr] items-baseline gap-1">
                  <span>Jenis Kendaraan / Peralatan</span>
                  <span className="font-normal">: {settings.jenisKendaraan}</span>
                </div>
                <div className="grid grid-cols-[50%_1fr] items-baseline gap-1">
                  <span>Kegiatan dan Lokasi</span>
                  <span className="font-normal">
                    : {formatKegiatanLokasi(entry, settings)}
                  </span>
                </div>
                <div className="grid grid-cols-[50%_1fr] items-baseline gap-1">
                  <span>No Identitas Kendaraan / Peralatan</span>
                  <span className="font-normal">: {settings.noIdentitas}</span>
                </div>
              </div>

              {/* 3 Photo Columns */}
              <div className="mt-[5%] grid grid-cols-3 gap-[4.5%]">
                {slots.map(({ slot, label, asset }) => {
                  const fit = asset?.fitMode ?? 'contain';
                  return (
                    <div key={slot} className="flex flex-col">
                      <input
                        ref={(el) => {
                          fileInputRefs.current[slot] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onSingleUpload(entry.id, slot, f);
                          e.target.value = '';
                        }}
                      />

                      <div
                        className="group relative w-full overflow-hidden border border-slate-200 bg-slate-50"
                        style={{ aspectRatio: '55 / 81' }}
                      >
                        {asset ? (
                          <>
                            <img
                              src={asset.dataUrl}
                              alt={label}
                              className={`h-full w-full ${
                                fit === 'cover' ? 'object-cover' : 'object-contain bg-white'
                              }`}
                            />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-900/75 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[slot]?.click()}
                                title="Ganti foto"
                                className="rounded p-1 text-white hover:bg-white/20"
                              >
                                <ImagePlus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRotatePhoto(entry.id, slot)}
                                title="Putar 90°"
                                className="rounded p-1 text-white hover:bg-white/20"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleFit(entry.id, slot)}
                                title={
                                  fit === 'cover'
                                    ? 'Ubah ke Utuh (Contain)'
                                    : 'Ubah ke Isi Penuh (Cover)'
                                }
                                className="rounded p-1 text-white hover:bg-white/20"
                              >
                                {fit === 'cover' ? (
                                  <Minimize2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Maximize2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemovePhoto(entry.id, slot)}
                                title="Hapus foto"
                                className="rounded p-1 text-red-300 hover:bg-red-500/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[slot]?.click()}
                            className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          >
                            <ImagePlus className="h-5 w-5" />
                            <span className="text-[10px]">Upload</span>
                          </button>
                        )}
                      </div>

                      {/* Gray Label Bar */}
                      <div className="mt-[8%] bg-[#D3D3D3] py-[5%] text-center text-[10px] sm:text-[11px] font-normal text-[#191919]">
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signature Area */}
            <div className="mb-[8%] mt-[5%] grid grid-cols-3 gap-[4.5%] text-center text-[10px] sm:text-[11.5px]">
              <div className="flex flex-col items-center">
                <p>Mengetahui,</p>
                <div className="h-10 sm:h-14" />
                <p className="font-bold leading-tight">{settings.mengetahuiBaris1}</p>
                <p className="font-bold leading-tight">{settings.mengetahuiBaris2}</p>
                <p className="leading-tight">{settings.mengetahuiNip}</p>
              </div>

              <div />

              <div className="flex flex-col items-center">
                <p>
                  {settings.kota}, {tanggalDash}
                </p>
                <p className="mt-0.5">Pengguna</p>
                <div className="h-8 sm:h-11" />
                <p className="leading-tight">{settings.penggunaNama}</p>
                <p className="leading-tight">{settings.penggunaNip || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
