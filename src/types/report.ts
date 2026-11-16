export type PhotoSlotType = 'kegiatan' | 'kmhm' | 'struk';

export type SortMode = 'natural' | 'modified' | 'selection';

export type PhotoFitMode = 'cover' | 'contain';

export interface PhotoAsset {
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
  fitMode?: PhotoFitMode;
}

export interface ReportEntry {
  id: string;
  orderIndex: number;
  tanggalRaw: string; // DD/MM/YYYY from spreadsheet
  jamRaw: string; // HH:mm from spreadsheet
  liter: string;
  harga: string;
  nilai: string;
  lokasi: string;
  highlighted?: boolean; // Rows highlighted yellow in source image
  fotoKegiatan: PhotoAsset | null;
  fotoKmHm: PhotoAsset | null;
  fotoStruk: PhotoAsset | null;
}

export interface ReportSettings {
  jenisKendaraan: string;
  noIdentitas: string;
  kota: string;
  penggunaNama: string;
  penggunaNip: string;
  mengetahuiBaris1: string;
  mengetahuiBaris2: string;
  mengetahuiNip: string;
  kegiatanPrefix: string;
}

export interface ExportProgress {
  active: boolean;
  label: string;
  current: number;
  total: number;
}
