import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';

/**
 * Halaman untuk menampilkan semua grup yang ada
 */
export function MyGroups() {
  const navigate = useNavigate();
  const { getGroupsWithPlayerCount, deleteGroup, loading } = useGroup();
  const [allGroups, setAllGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      const groups = await getGroupsWithPlayerCount();
      setAllGroups(groups);
    };
    loadGroups();
  }, []);

  const filteredGroups = allGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (e, group) => {
    e.stopPropagation();
    setDeleteConfirm(group);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    const success = await deleteGroup(deleteConfirm.id);
    setIsDeleting(false);

    if (success) {
      // Refresh groups list
      const groups = await getGroupsWithPlayerCount();
      setAllGroups(groups);
      setDeleteConfirm(null);
    } else {
      alert('Gagal menghapus grup. Coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 font-semibold mb-2"
          >
            ← Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Grup Saya</h1>
          <p className="text-xs text-gray-500">Total: {allGroups.length} grup</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari nama atau kode grup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Groups List */}
        {loading ? (
          <div className="text-center py-8 text-gray-600">
            <p>Memuat grup...</p>
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden"
              >
                <button
                  onClick={() => navigate(`/game/${group.code}`)}
                  className="w-full p-4 hover:bg-blue-50 transition-all text-left flex-grow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{group.name}</h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                      {group.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>👥 {group.players?.length || 0} pemain</span>
                    <span>📊 Batas: {group.minus_limit}</span>
                    <span>📅 {new Date(group.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </button>

                {/* Delete Button */}
                <div className="px-4 pb-3 border-t border-gray-100">
                  <button
                    onClick={(e) => handleDeleteClick(e, group)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold text-sm px-3 py-2 rounded transition-all"
                  >
                    🗑️ Hapus Grup
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 text-center text-gray-600">
            <p className="mb-4">
              {searchQuery ? 'Tidak ada grup yang cocok' : 'Belum ada grup'}
            </p>
            <button
              onClick={() => navigate('/create')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Buat grup baru →
            </button>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Hapus Grup?</h2>
            <p className="text-lg font-semibold text-gray-800 mb-4">
              "{deleteConfirm.name}"
            </p>

            {/* Warning Box */}
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-900 font-semibold mb-2">
                ⚠️ Perhatian!
              </p>
              <ul className="text-xs text-red-800 space-y-1">
                <li>• Semua ronde akan dihapus</li>
                <li>• Semua skor akan hilang</li>
                <li>• Data tidak bisa dikembalikan</li>
                <li>• Aksi ini PERMANEN</li>
              </ul>
            </div>

            {/* Group Info */}
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-600 mb-1">Kode Grup:</p>
              <p className="font-mono font-bold text-gray-900 mb-3">
                {deleteConfirm.code}
              </p>
              <p className="text-xs text-gray-600 mb-1">Jumlah Pemain:</p>
              <p className="font-bold text-gray-900">
                {deleteConfirm.players?.length || 0}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-300 text-gray-900 font-bold py-3 rounded-lg transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-all"
              >
                {isDeleting ? '🗑️ Menghapus...' : '🗑️ Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
