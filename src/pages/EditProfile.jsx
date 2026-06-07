import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function EditProfile() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form with user profile data
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.display_name || '');
      setProfilePictureUrl(userProfile.profile_picture_url || '');
      setPreviewUrl(userProfile.profile_picture_url || '');
    }
  }, [userProfile]);

  // Handle file upload to Supabase Storage
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diizinkan');
      return;
    }

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      // Delete old picture if exists
      if (profilePictureUrl) {
        try {
          const oldFileName = profilePictureUrl.split('/').pop();
          await supabase.storage
            .from('profile-pictures')
            .remove([`${user.id}/${oldFileName}`]);
        } catch (err) {
          console.warn('Error deleting old picture:', err);
        }
      }

      // Upload new picture
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      setProfilePictureUrl(publicUrlData.publicUrl);
      toast.success('Foto berhasil diupload');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Gagal upload foto');
      setPreviewUrl(profilePictureUrl);
    } finally {
      setUploading(false);
    }
  };

  // Save profile changes
  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Nama pemain tidak boleh kosong');
      return;
    }

    if (displayName.trim().length < 2) {
      toast.error('Nama pemain minimal 2 karakter');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName.trim(),
          profile_picture_url: profilePictureUrl
        })
        .eq('auth_id', user.id);

      if (error) throw error;

      toast.success('Profil berhasil disimpan!');
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/home')}
          className="mb-6 text-white font-bold text-lg flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← Kembali
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">✏️ Edit Profil</h1>

          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-4">
                📸 Foto Profil
              </label>
              <div className="flex flex-col items-center gap-4">
                {/* Avatar Preview */}
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-300 bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">📸</span>
                  )}
                </div>

                {/* Upload Button */}
                <label className="cursor-pointer w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all text-center cursor-pointer">
                    {uploading ? '📤 Uploading...' : '📸 Pilih Foto'}
                  </div>
                </label>

                <div className="text-xs text-slate-500 text-center">
                  Format: JPG, PNG, GIF (Max 5MB)
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-200"></div>

            {/* Display Name Section */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                👤 Nama Pemain
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Masukkan nama pemain"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                maxLength="50"
              />
              <div className="text-xs text-slate-500 mt-1">
                {displayName.length}/50 karakter
              </div>
            </div>

            {/* Email Display (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📧 Email
              </label>
              <div className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-300 rounded-lg text-slate-600">
                {user?.email}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Email tidak bisa diubah
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all"
              >
                {saving ? '💾 Menyimpan...' : '✓ Simpan Profil'}
              </button>
              <button
                onClick={() => navigate('/home')}
                className="w-full bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all"
              >
                ✕ Batal
              </button>
            </div>

            {/* Info Box */}
            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-sm text-blue-800">
              <div className="font-semibold">💡 Tips:</div>
              <div className="mt-1">Gunakan foto yang jelas agar teman bisa mengenali Anda saat bermain online</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
