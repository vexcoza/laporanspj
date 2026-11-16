import { ReportEntry, ReportSettings } from '../types/report';

export const DEFAULT_SETTINGS: ReportSettings = {
  jenisKendaraan: 'Toyota Kijang',
  noIdentitas: 'B 2610 SQ',
  kota: 'Jakarta',
  penggunaNama: 'Ahmad Rozali',
  penggunaNip: '-',
  mengetahuiBaris1: 'M. Kurnia Syahrul',
  mengetahuiBaris2: 'Romadhon, S.ST',
  mengetahuiNip: '198906132014031006',
  kegiatanPrefix: '',
};

const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  "Jum'at",
  'Sabtu',
];

/**
 * Converts DD/MM/YYYY -> "DD-MM-YYYY"
 */
export function formatTanggalDash(tanggalRaw: string): string {
  const parts = tanggalRaw.trim().split('/');
  if (parts.length !== 3) return tanggalRaw;
  const [dd, mm, yyyy] = parts;
  return `${dd.padStart(2, '0')}-${mm.padStart(2, '0')}-${yyyy}`;
}

/**
 * Converts DD/MM/YYYY -> "Senin, 11-05-2026" (matching sample PDF style, including "Jum'at")
 */
export function formatHariTanggal(tanggalRaw: string): string {
  const parts = tanggalRaw.trim().split('/');
  if (parts.length !== 3) return tanggalRaw;
  const dd = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  const yyyy = parseInt(parts[2], 10);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return tanggalRaw;
  const dateObj = new Date(yyyy, mm - 1, dd);
  const dayName = HARI_INDONESIA[dateObj.getDay()] ?? '';
  return `${dayName}, ${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;
}

export function getMonthKey(tanggalRaw: string): string {
  const parts = tanggalRaw.trim().split('/');
  if (parts.length !== 3) return '';
  return `${parts[1].padStart(2, '0')}-${parts[2]}`;
}

export function formatKegiatanLokasi(entry: ReportEntry, settings: ReportSettings): string {
  const prefix = settings.kegiatanPrefix.trim();
  if (!prefix) return entry.lokasi;
  return `${prefix} ${entry.lokasi}`;
}

interface RawSpreadsheetRow {
  tanggalRaw: string;
  jamRaw: string;
  liter: string;
  harga: string;
  nilai: string;
  lokasi: string;
  highlighted?: boolean;
}

// Transcribed faithfully row-by-row (61 entries) from IMG-20261113-WA0105_b41c1682.jpg
const RAW_SPREADSHEET_ROWS: RawSpreadsheetRow[] = [
  { tanggalRaw: '11/05/2026', jamRaw: '12:29', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Samsat Jakarta Pusat' },
  { tanggalRaw: '12/05/2026', jamRaw: '11:37', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Pluit Karang Raya, Jakarta Utara' },
  { tanggalRaw: '13/05/2026', jamRaw: '14:46', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Samsat Jakarta Pusat', highlighted: true },
  { tanggalRaw: '18/05/2026', jamRaw: '10:19', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Gudang Cempaka Putih Jakarta Pusat' },
  { tanggalRaw: '19/05/2026', jamRaw: '10:59', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Jl. Gatot Soebroto-Jend. Sudirman, Jakarta Selatan' },
  { tanggalRaw: '21/05/2026', jamRaw: '23:05', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Jl. MT. Haryono, Jakarta Selatan' },
  { tanggalRaw: '23/05/2026', jamRaw: '01:37', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Jl. Gatot Soebroto-Jend. Sudirman, Jakarta Selatan' },
  { tanggalRaw: '25/05/2026', jamRaw: '10:20', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Jl. Mampang Prapatan Raya, Jakarta Selatan' },
  { tanggalRaw: '26/05/2026', jamRaw: '13:56', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Balaikota, Kebon Sirih, Jakarta Pusat' },
  { tanggalRaw: '29/05/2026', jamRaw: '14:24', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Palmerah, Jakarta Barat' },
  { tanggalRaw: '02/06/2026', jamRaw: '14:49', liter: '14.96', harga: 'Rp 12,300', nilai: 'Rp 184,000', lokasi: 'Jl. Gunung Sahari, Jakarta Pusat' },
  { tanggalRaw: '04/06/2026', jamRaw: '12:41', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Grogol Petamburan, Jakarta Barat' },
  { tanggalRaw: '05/06/2026', jamRaw: '15:57', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Taman Ismail Marzuki, Jakarta Pusat' },
  { tanggalRaw: '09/06/2026', jamRaw: '10:10', liter: '15.00', harga: 'Rp 12,300', nilai: 'Rp 184,500', lokasi: 'Gerbang Pemuda, Jakarta Pusat' },
  { tanggalRaw: '12/06/2026', jamRaw: '08:19', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'GOR Otista, Jakarta Timur' },
  { tanggalRaw: '18/06/2026', jamRaw: '12:48', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Bengkel Maju Lancar, Srengseng, Jakarta Barat' },
  { tanggalRaw: '19/06/2026', jamRaw: '14:25', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Bengkel Maju Lancar, Srengseng, Jakarta Barat' },
  { tanggalRaw: '23/06/2026', jamRaw: '14:51', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Jl. Gatot Soebroto, Jakarta Selatan' },
  { tanggalRaw: '24/06/2026', jamRaw: '11:33', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Halte CSW, Jakarta Selatan' },
  { tanggalRaw: '26/06/2026', jamRaw: '10:59', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'GOR Bulungan, Jakarta Selatan' },
  { tanggalRaw: '29/06/2026', jamRaw: '14:11', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Bengkel Madi, H. Nawi, Jakarta Selatan' },
  { tanggalRaw: '30/06/2026', jamRaw: '11:16', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Gandaria, Jakarta Selatan' },
  { tanggalRaw: '06/07/2026', jamRaw: '10:06', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Outer Ring Road, Jakarta Selatan' },
  { tanggalRaw: '07/07/2026', jamRaw: '14:31', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Lenteng Agung, Jakarta Selatan' },
  { tanggalRaw: '08/07/2026', jamRaw: '09:52', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Gudang Pulogebang Jakarta Timur' },
  { tanggalRaw: '13/07/2026', jamRaw: '14:52', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Jl. Industri, Jakarta Utara' },
  { tanggalRaw: '14/07/2026', jamRaw: '11:08', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Jl. Kapten Tendean, Jakarta Selatan' },
  { tanggalRaw: '15/07/2026', jamRaw: '09:32', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Kantor Dinas Jatibaru, Jakarta Pusat' },
  { tanggalRaw: '16/07/2026', jamRaw: '14:14', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Jl. MT. Haryono, Jakarta Selatan' },
  { tanggalRaw: '20/07/2026', jamRaw: '12:25', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Pesing, Jakarta Barat' },
  { tanggalRaw: '22/07/2026', jamRaw: '11:04', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Jl. Jend. Sudirman, Jakarta Selatan' },
  { tanggalRaw: '24/07/2026', jamRaw: '11:22', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,700', lokasi: 'GOR Kramatjati, Jakarta Timur' },
  { tanggalRaw: '28/07/2026', jamRaw: '09:54', liter: '20.00', harga: 'Rp 16,250', nilai: 'Rp 325,000', lokasi: 'Jl. Perintis Kemerdekaan, Jakarta Timur' },
  { tanggalRaw: '29/07/2026', jamRaw: '10:02', liter: '20.00', harga: 'Rp 16,250', nilai: 'Rp 325,000', lokasi: 'Jl. Yos Sudarso, Jakarta Utara' },
  { tanggalRaw: '31/07/2026', jamRaw: '10:02', liter: '15.00', harga: 'Rp 16,250', nilai: 'Rp 243,750', lokasi: 'Gudang Pulogebang Jakarta Timur' },
  { tanggalRaw: '04/08/2026', jamRaw: '11:39', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Outer Ring Road, Jakarta Selatan' },
  { tanggalRaw: '07/08/2026', jamRaw: '09:23', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Kembangan, Jakarta Barat' },
  { tanggalRaw: '10/08/2026', jamRaw: '10:29', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Marunda, Jakarta Utara' },
  { tanggalRaw: '13/08/2026', jamRaw: '09:43', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Gudang Pulogebang Jakarta Timur' },
  { tanggalRaw: '14/08/2026', jamRaw: '08:38', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Gudang Pulogebang Jakarta Timur' },
  { tanggalRaw: '18/08/2026', jamRaw: '10:45', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Jl. Raya Bogor, Jakarta Timur' },
  { tanggalRaw: '20/08/2026', jamRaw: '15:58', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Jl. Gatot Soebroto, Jakarta Selatan' },
  { tanggalRaw: '28/08/2026', jamRaw: '09:11', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Gudang Pulogebang Jakarta Timur' },
  { tanggalRaw: '31/08/2026', jamRaw: '10:11', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Bengkel Madi, H. Nawi, Jakarta Selatan' },
  { tanggalRaw: '17/09/2026', jamRaw: '12:01', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Bengkel Madi, H. Nawi, Jakarta Selatan' },
  { tanggalRaw: '21/09/2026', jamRaw: '11:59', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Monas, Jakarta Pusat' },
  { tanggalRaw: '23/09/2026', jamRaw: '09:59', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Jl. Daan Mogot, Jakarta Barat' },
  { tanggalRaw: '28/09/2026', jamRaw: '10:43', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Kebayoran Lama, Jakarta Selatan' },
  { tanggalRaw: '01/10/2026', jamRaw: '12:32', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Jl. Prapanca, Jakarta Selatan' },
  { tanggalRaw: '05/10/2026', jamRaw: '14:19', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Gudang Pulogebang Jakarta Timur', highlighted: true },
  { tanggalRaw: '07/10/2026', jamRaw: '09:59', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Cakung, Jakarta Timur' },
  { tanggalRaw: '09/10/2026', jamRaw: '15:12', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Kantor Dinas Jatibaru, Jakarta Pusat' },
  { tanggalRaw: '12/10/2026', jamRaw: '13:00', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Jl. Gatot Subroto, Jakarta Selatan' },
  { tanggalRaw: '16/10/2026', jamRaw: '17:01', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Gudang Pulogebang Jakarta Timur' },
  { tanggalRaw: '17/10/2026', jamRaw: '13:58', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Gudang Cilincing, Jakarta Utara' },
  { tanggalRaw: '19/10/2026', jamRaw: '10:57', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Semanggi-Monas, Jakarta Pusat' },
  { tanggalRaw: '27/10/2026', jamRaw: '17:24', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'JIS, Sunter, Jakarta Utara' },
  { tanggalRaw: '02/11/2026', jamRaw: '11:11', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Fly Over MOI, Jakarta Pusat' },
  { tanggalRaw: '03/11/2026', jamRaw: '12:07', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Teluk Gong, Jakarta Utara' },
  { tanggalRaw: '05/11/2026', jamRaw: '14:24', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Jl. Adityawarman, Jakarta Selatan' },
  { tanggalRaw: '09/11/2026', jamRaw: '09:20', liter: '15.00', harga: 'Rp 15,950', nilai: 'Rp 239,250', lokasi: 'Jl. Ciledug Raya, Jakarta Selatan' },
];

export function createInitialRecords(): ReportEntry[] {
  return RAW_SPREADSHEET_ROWS.map((row, idx) => ({
    id: `row-${idx + 1}`,
    orderIndex: idx + 1,
    tanggalRaw: row.tanggalRaw,
    jamRaw: row.jamRaw,
    liter: row.liter,
    harga: row.harga,
    nilai: row.nilai,
    lokasi: row.lokasi,
    highlighted: row.highlighted,
    fotoKegiatan: null,
    fotoKmHm: null,
    fotoStruk: null,
  }));
}

export const MONTH_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: '05-2026', label: 'Mei' },
  { key: '06-2026', label: 'Jun' },
  { key: '07-2026', label: 'Jul' },
  { key: '08-2026', label: 'Agu' },
  { key: '09-2026', label: 'Sep' },
  { key: '10-2026', label: 'Okt' },
  { key: '11-2026', label: 'Nov' },
];
