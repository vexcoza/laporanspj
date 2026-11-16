import React from 'react';
import { RotateCcw } from 'lucide-react';
import { ReportSettings } from '../types/report';

interface SettingsPanelProps {
  settings: ReportSettings;
  onChange: (updated: ReportSettings) => void;
  onResetAll: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  onResetAll,
}) => {
  const updateField = (field: keyof ReportSettings, value: string) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Pengaturan Identitas Laporan &amp; Pejabat
          </h2>
          <p className="text-sm text-slate-600">
            Nilai di bawah diterapkan otomatis ke seluruh halaman laporan PDF dan pratinjau A4.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Semua ke Awal</span>
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Jenis Kendaraan / Peralatan
          </label>
          <input
            type="text"
            value={settings.jenisKendaraan}
            onChange={(e) => updateField('jenisKendaraan', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            No Identitas Kendaraan / Peralatan
          </label>
          <input
            type="text"
            value={settings.noIdentitas}
            onChange={(e) => updateField('noIdentitas', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Nama Pengguna (Tanda Tangan Kanan)
          </label>
          <input
            type="text"
            value={settings.penggunaNama}
            onChange={(e) => updateField('penggunaNama', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            NIP / Keterangan Pengguna
          </label>
          <input
            type="text"
            value={settings.penggunaNip}
            onChange={(e) => updateField('penggunaNip', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Kota Penandatanganan
          </label>
          <input
            type="text"
            value={settings.kota}
            onChange={(e) => updateField('kota', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Prefiks Kegiatan dan Lokasi (Opsional)
          </label>
          <input
            type="text"
            value={settings.kegiatanPrefix}
            onChange={(e) => updateField('kegiatanPrefix', e.target.value)}
            placeholder="Kosongkan agar sama persis dengan Lokasi Foto 1"
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Mengetahui — Nama Baris 1
          </label>
          <input
            type="text"
            value={settings.mengetahuiBaris1}
            onChange={(e) => updateField('mengetahuiBaris1', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Mengetahui — Nama Baris 2
          </label>
          <input
            type="text"
            value={settings.mengetahuiBaris2}
            onChange={(e) => updateField('mengetahuiBaris2', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700">
            Mengetahui — NIP
          </label>
          <input
            type="text"
            value={settings.mengetahuiNip}
            onChange={(e) => updateField('mengetahuiNip', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono-tabular text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
