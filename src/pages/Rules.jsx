import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Halaman aturan permainan BOX
 */
export function Rules() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 font-semibold mb-4"
          >
            ← Kembali
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📖 Aturan BOX Score</h1>
          <p className="text-gray-600">Cara bermain dan menghitung skor</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg p-6 shadow-md space-y-6">
          {/* Section 1 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">🎮 Tentang Permainan BOX</h2>
            <p className="text-gray-700 leading-relaxed">
              BOX adalah permainan kartu lokal yang dimainkan oleh 4-5 orang menggunakan 108 kartu (2 set remi standar + 4 Joker). Tujuan permainan adalah menjadi pemain pertama yang mengeluarkan semua kartu di tangan (menjadi CATE).
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">🏆 Konsep CATE</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-gray-700 leading-relaxed">
                <strong>CATE</strong> adalah pemain yang berhasil mengeluarkan semua kartunya terlebih dahulu dan memenangkan ronde. Pemain CATE mendapat bonus <strong>+50 poin</strong>, ditambah bonus joker jika menggunakan joker dalam permainan.
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">📊 Sistem Penilaian</h2>
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded">
                <div className="font-semibold text-blue-900 mb-1">Jika CATE:</div>
                <div className="text-sm text-blue-800">
                  • +50 (bonus CATE)<br/>
                  • +100 per joker yang digunakan
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="font-semibold text-red-900 mb-1">Jika Tidak CATE:</div>
                <div className="text-sm text-red-800">
                  • Minus nilai kartu sisa yang masih di tangan<br/>
                  • -100 per joker yang dipegang
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="font-semibold text-orange-900 mb-1">Jika Gagal Sun:</div>
                <div className="text-sm text-orange-800">
                  • -50 poin (keluar dari ronde)
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">♠️ Nilai Kartu</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>A = 15</div>
              <div>2-9 = Sesuai angka</div>
              <div>10, J, Q, K = 10</div>
              <div>JOKER = 100</div>
            </div>
          </div>

          {/* Section 5 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">☀️ Logika Sun Gagal</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="bg-gray-100 p-3 rounded">
                <strong>1 pemain gagal Sun:</strong><br/>
                Pemain tersebut dapat -50, keluar dari ronde, permainan lanjut dengan pemain lain
              </div>
              <div className="bg-red-100 p-3 rounded border border-red-300">
                <strong>2 pemain atau lebih gagal Sun:</strong><br/>
                Ronde diulang (tidak disimpan), kartu dikocok ulang
              </div>
            </div>
          </div>

          {/* Section 6 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">🔄 Reset Skor</h2>
            <p className="text-gray-700 leading-relaxed">
              Setelah setiap ronde, sistem secara otomatis memeriksa apakah ada pemain yang total skornya mencapai atau melampaui <strong>batas minus yang disepakati</strong> (biasanya -300, -400, atau -500). Jika ada, skor pemain tersebut direset ke 0 dan permainan lanjut dengan skor yang sudah direset.
            </p>
          </div>

          {/* Section 7 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">🎯 Contoh Perhitungan</h2>
            <div className="space-y-2 text-sm bg-gray-100 p-4 rounded font-mono">
              <div className="border-b pb-2 mb-2">
                <strong>Ronde 1:</strong>
              </div>
              <div>• Andi (CATE): +50</div>
              <div>• Budi (kartu sisa A+K+5): -30</div>
              <div>• Citra (kartu sisa 9+9+2): -20</div>
              <div>• Dedi (kartu sisa 10+J+Q+5): -35</div>
            </div>
          </div>

          {/* Section 8 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">💾 Fitur Aplikasi</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <div>✓ Input kartu sisa secara interaktif dengan tap per kartu</div>
              <div>✓ Perhitungan skor otomatis</div>
              <div>✓ Tracking riwayat semua ronde</div>
              <div>✓ Statistik pemain (rata-rata skor, jumlah CATE, dll)</div>
              <div>✓ Notifikasi reset skor otomatis</div>
              <div>✓ Shared group dengan kode unik</div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-blue-900">
              💡 <strong>Tips:</strong> Bagikan kode grup ke semua pemain sehingga semua bisa lihat papan skor real-time dari smartphone mereka masing-masing!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

