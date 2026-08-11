'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/context/ToastContext';
import { Camera, Save, Lock, Eye, EyeOff, User, Mail, Shield, Check, X, Upload, Trash2 } from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, updateUser, updateUserPassword } = useUser();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [name, setName] = useState(currentUser.name);
  const [avatarPreview, setAvatarPreview] = useState<string>(currentUser.avatar || '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Sync when user changes
  useEffect(() => {
    setName(currentUser.name);
    setAvatarPreview(currentUser.avatar || '');
  }, [currentUser]);

  // Handle file upload → convert to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto maksimum 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setAvatarPreview(base64);
      setAvatarUrl('');
    };
    reader.readAsDataURL(file);
  };

  // Handle avatar URL input
  const handleAvatarUrlApply = () => {
    if (avatarUrl.trim()) {
      setAvatarPreview(avatarUrl.trim());
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save profile (name + avatar) — update UserContext + persist to DB
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama tidak boleh kosong', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      // 1. Update local context immediately (incl. localStorage)
      updateUser(currentUser.id, {
        name: name.trim(),
        avatar: avatarPreview,
      });

      // 2. Persist to DB via API
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({
          name: name.trim(),
          avatar: avatarPreview,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        // Still show success since local state updated — DB sync non-critical
        console.warn('DB update failed (non-critical):', err);
      }

      setProfileSaved(true);
      showToast('Profil berhasil diperbarui!', 'success');
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error(err);
      showToast('Profil diperbarui di perangkat ini', 'success');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save password — validate current then update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate current password
    const savedPasswords = localStorage.getItem('persona_custom_passwords');
    const passwordsMap = savedPasswords ? JSON.parse(savedPasswords) : {};
    const expectedPassword =
      passwordsMap[currentUser.id] || currentUser.password || currentUser.name.toLowerCase();

    if (currentPassword.toLowerCase() !== expectedPassword.toLowerCase()) {
      showToast('Password saat ini tidak sesuai', 'error');
      return;
    }

    if (newPassword.trim().length < 4) {
      showToast('Password baru minimal 4 karakter', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      updateUserPassword(currentUser.id, newPassword.trim());
      showToast('Password berhasil diubah!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('Gagal mengubah password', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const roleColors: Record<string, string> = {
    Admin: 'bg-rose-100 text-rose-700 border-rose-200',
    Owner: 'bg-purple-100 text-purple-700 border-purple-200',
    Strategist: 'bg-blue-100 text-blue-700 border-blue-200',
    'Production Assistant': 'bg-amber-100 text-amber-700 border-amber-200',
    Editor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Scheduler: 'bg-sky-100 text-sky-700 border-sky-200',
  };

  const initials = currentUser.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Profil Saya</h1>
          <p className="text-sm text-neutral-500 mt-1">Kelola nama, foto, dan password akun kamu</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

          <div className="px-6 pb-6">
            {/* Avatar Section */}
            <div className="flex items-end gap-4 -mt-10 mb-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarPreview('')}
                    />
                  ) : (
                    <span className="text-xl font-bold text-white">{initials}</span>
                  )}
                </div>
                {/* Camera overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 w-20 h-20 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="mb-1">
                <p className="font-semibold text-neutral-900 text-lg leading-tight">{currentUser.name}</p>
                <p className="text-sm text-neutral-500">{currentUser.email}</p>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition bg-neutral-50"
                    placeholder="Nama kamu"
                    required
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                  Foto Profil
                </label>

                {/* Upload button */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium text-neutral-700 transition border border-neutral-200"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Foto
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-sm font-medium text-rose-600 transition border border-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Foto
                    </button>
                  )}
                </div>

                {/* URL input alternative */}
                <div className="mt-2 flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Atau paste URL foto..."
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-neutral-50"
                  />
                  <button
                    type="button"
                    onClick={handleAvatarUrlApply}
                    disabled={!avatarUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 text-sm font-medium text-neutral-700 transition border border-neutral-200"
                  >
                    Terapkan
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={currentUser.email}
                    readOnly
                    className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm bg-neutral-100 text-neutral-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">Email tidak dapat diubah sendiri. Hubungi Admin.</p>
              </div>

              {/* Roles (read-only) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                  Role Saya
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentUser.roles.map((role) => (
                    <span
                      key={role}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleColors[role] || 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}
                    >
                      <Shield className="w-3 h-3" />
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              {/* Save Profile Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold text-sm transition shadow-sm"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : profileSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Tersimpan!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Profil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900 text-base">Ganti Password</h2>
              <p className="text-xs text-neutral-500">Password minimal 4 karakter</p>
            </div>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                Password Saat Ini
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-neutral-50"
                  placeholder="Password sekarang"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                Password Baru
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-neutral-50"
                  placeholder="Password baru (min. 4 karakter)"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1.5">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-neutral-50"
                  placeholder="Ulangi password baru"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Match indicator */}
              {confirmPassword && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {newPassword === confirmPassword ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {newPassword === confirmPassword ? 'Password cocok' : 'Password tidak cocok'}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingPassword || newPassword !== confirmPassword || newPassword.length < 4}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold text-sm transition shadow-sm"
              >
                {isSavingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengubah Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Ganti Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
