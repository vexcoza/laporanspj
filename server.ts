import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
app.use(express.json({ limit: '25mb' }));

interface ParseRequestBody {
  imageBase64?: string;
  mimeType?: string;
}

app.post('/api/parse-spreadsheet', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error:
          'GEMINI_API_KEY belum terkonfigurasi di environment server. Tambahkan di panel Settings > Secrets.',
      });
      return;
    }

    const body = req.body as ParseRequestBody;
    const rawBase64 = body?.imageBase64;
    const mimeType = body?.mimeType || 'image/jpeg';

    if (!rawBase64 || typeof rawBase64 !== 'string') {
      res.status(400).json({ error: 'File gambar tabel tidak ditemukan.' });
      return;
    }

    const cleanBase64 = rawBase64.includes(',')
      ? rawBase64.split(',')[1]
      : rawBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text:
              'Baca seluruh baris tabel penggunaan kendaraan / BBM dari atas sampai paling bawah secara berurutan dan teliti. ' +
              'Jangan lewati satu baris pun. ' +
              'Untuk kolom Tanggal (misalnya "11/05/2026 12:29"), pisahkan menjadi tanggalRaw ("11/05/2026" format DD/MM/YYYY) dan jamRaw ("12:29"). ' +
              'Ambil teks Lokasi persis seperti tertulis di tabel. ' +
              'Jika baris berwarna kuning/disorot, isi highlighted = true. ' +
              'Untuk jenisKendaraan dan noIdentitas, ambil nilai yang paling dominan di tabel (format plat nomor dengan spasi seperti "B 2610 SQ" jika tertulis "B2610SQ").',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jenisKendaraan: {
              type: Type.STRING,
              description: 'Nama jenis alat/kendaraan dari kolom pertama tabel.',
            },
            noIdentitas: {
              type: Type.STRING,
              description: 'Nomor seri atau plat polisi kendaraan.',
            },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tanggalRaw: {
                    type: Type.STRING,
                    description: 'Tanggal format DD/MM/YYYY',
                  },
                  jamRaw: {
                    type: Type.STRING,
                    description: 'Jam format HH:mm atau - jika tidak ada',
                  },
                  liter: {
                    type: Type.STRING,
                    description: 'Jumlah liter BBM',
                  },
                  harga: {
                    type: Type.STRING,
                    description: 'Harga per liter',
                  },
                  nilai: {
                    type: Type.STRING,
                    description: 'Total nilai rupiah',
                  },
                  lokasi: {
                    type: Type.STRING,
                    description: 'Lokasi kegiatan persis sesuai tabel',
                  },
                  highlighted: {
                    type: Type.BOOLEAN,
                    description: 'True jika baris disorot kuning',
                  },
                },
                required: ['tanggalRaw', 'lokasi'],
              },
            },
          },
          required: ['rows'],
        },
      },
    });

    const text = (response.text ?? '').trim();
    if (!text) {
      res.status(502).json({
        error: 'Model tidak mengembalikan data tabel yang valid.',
      });
      return;
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Gagal membaca gambar tabel.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
