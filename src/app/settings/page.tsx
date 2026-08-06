'use client';

import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { Shield, Lock, Sliders, User, Edit3, Trash2, Plus, Upload, Save, X, Check, Key, Eye, EyeOff } from 'lucide-react';
import { MASTER_SCORES_STATIC } from '@/lib/score-calculator';
import { hasPermission } from '@/lib/rbac';
import { UserPersona, UserRole } from '@/lib/types';

export default function SettingsPage() {
  const { currentUser, allUsers, updateUser, updateUserPassword, addUser } = useUser();
  const { companySettings, updateCompanySettings } = useData();
  const { showToast } = useToast();
  const isAdmin = hasPermission(currentUser, 'EDIT_MASTER_SCORE');

  const [scores] = useState(MASTER_SCORES_STATIC);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserPersona | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [editCapacity, setEditCapacity] = useState(16000);

  // Staff Password Change modal state
  const [passwordUser, setPasswordUser] = useState<UserPersona | null>(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [confirmStaffPassword, setConfirmStaffPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // New user modal state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newRoles, setNewRoles] = useState<UserRole[]>(['Editor']);
  const [newPassword, setNewPassword] = useState('');

  const ALL_ROLES: UserRole[] = ['Admin', 'Owner', 'Strategist', 'Production Assistant', 'Editor', 'Scheduler'];

  const openEditModal = (u: UserPersona) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditAvatar(u.avatar || '');
    setEditRoles(u.roles);
    setEditCapacity(u.monthlyCapacity || 16000);
  };

  const openPasswordModal = (u: UserPersona) => {
    setPasswordUser(u);
    setNewStaffPassword('');
    setConfirmStaffPassword('');
    setShowPasswordText(false);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUser(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      avatar: editAvatar.trim(),
      roles: editRoles,
      monthlyCapacity: Number(editCapacity) || 16000,
    });

    showToast(`Profil & Foto Profil ${editName} berhasil diperbarui!`, 'success');
    setEditingUser(null);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;

    if (newStaffPassword.trim().length < 3) {
      showToast('Password minimal 3 karakter!', 'error');
      return;
    }

    if (newStaffPassword !== confirmStaffPassword) {
      showToast('Password dan Konfirmasi Password tidak cocok!', 'error');
      return;
    }

    updateUserPassword(passwordUser.id, newStaffPassword.trim());
    showToast(`Password baru untuk ${passwordUser.name} berhasil disimpan!`, 'success');
    setPasswordUser(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newU: UserPersona = {
      id: `u-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim() || `${newName.toLowerCase()}@personaos.com`,
      avatar: newAvatar.trim(),
      password: newPassword.trim() || newName.trim().toLowerCase(),
      roles: newRoles,
      monthlyCapacity: 16000,
      hourlyPoint: 100,
      costPerPoint: 250,
      active: true,
    };

    addUser(newU);
    if (newPassword.trim()) {
      updateUserPassword(newU.id, newPassword.trim());
    }

    showToast(`Anggota tim ${newName} berhasil ditambahkan!`, 'success');
    setNewName('');
    setNewEmail('');
    setNewAvatar('');
    setNewPassword('');
    setIsAddUserModalOpen(false);
  };

  const toggleRoleInEdit = (role: UserRole) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleRoleInNew = (role: UserRole) => {
    setNewRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        if (isEdit) {
          setEditAvatar(resultStr);
        } else {
          setNewAvatar(resultStr);
        }
        showToast('Foto berhasil diunggah! Klik Save untuk menyimpan.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn text-neutral-900 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Company Settings & Team Profiles <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full border border-neutral-200">Admin Controls</span>
          </h1>
          <p className="text-xs text-neutral-500">Manage user profiles, upload profile pictures, update staff passwords, company parameters, and RBAC permissions.</p>
        </div>

        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Add Team Member
        </button>
      </div>

      {/* User Profile & Team Management Section */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <User className="w-4 h-4 text-neutral-700" /> User Profile & Team Member Management ({allUsers.length})
            </h3>
            <p className="text-xs text-neutral-500">Kelola foto profil, peran (roles), dan ganti kata sandi (password) staff.</p>
          </div>
        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allUsers.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 space-y-3 relative group hover:border-neutral-300 transition shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover border border-neutral-200 shrink-0 shadow-2xs" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-neutral-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">{u.name}</h4>
                    <p className="text-[11px] text-neutral-500 font-mono truncate">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openPasswordModal(u)}
                    className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-amber-50 hover:border-amber-200 text-amber-700 transition flex items-center gap-1 text-[11px] font-semibold"
                    title="Ganti Password Staff"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Pass</span>
                  </button>
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition flex items-center gap-1 text-[11px] font-semibold"
                    title="Edit Profil & Foto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {u.roles.map((r) => (
                  <span
                    key={r}
                    className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white text-neutral-700 border border-neutral-200"
                  >
                    {r}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-200/60 font-mono">
                <span>Capacity: {u.monthlyCapacity.toLocaleString()} pts</span>
                <span className="text-emerald-700 font-semibold">{u.avatar ? 'Foto Profil Active' : 'Initial Avatar'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company Parameters Card */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neutral-700" /> Operational Capacity Settings
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1 col-span-2">
            <span className="text-neutral-550 font-bold block mb-1">Archive Frequency Rule (Admin-Configurable):</span>
            <select
              value={companySettings?.archiveRule || 'END_OF_MONTH'}
              onChange={(e) => updateCompanySettings({ archiveRule: e.target.value })}
              className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800 font-bold focus:outline-hidden text-xs w-full"
            >
              <option value="IMMEDIATE">Archive Immediately (When Posted / Completed)</option>
              <option value="END_OF_MONTH">End of Period Month (Default)</option>
              <option value="SEVEN_DAYS">Posted + 7 Days Rolling Archive</option>
            </select>
            <p className="text-[10px] text-neutral-400 mt-1">Defines the permanent database rules for automatic archiving of finished/posted contents.</p>
          </div>
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
            <span className="text-neutral-500">Effective Hours / Day:</span>
            <p className="font-bold text-neutral-900 text-sm">6 Hours</p>
          </div>
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
            <span className="text-neutral-500">Workdays / Month:</span>
            <p className="font-bold text-neutral-900 text-sm">20 Days (Mon - Fri)</p>
          </div>
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
            <span className="text-neutral-500">Points / Hour:</span>
            <p className="font-bold text-neutral-900 text-sm">100 Points</p>
          </div>
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
            <span className="text-neutral-500">Monthly Capacity / Employee:</span>
            <p className="font-bold text-emerald-800 text-sm">12,000 Points</p>
          </div>
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
            <span className="text-neutral-500">Cost Per Point (COGS):</span>
            <p className="font-bold text-emerald-800 text-sm">Rp250</p>
          </div>
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-1">
            <span className="text-neutral-500">Default Auto Deadline Offset:</span>
            <p className="font-bold text-neutral-900 text-sm">-3 Days from Posting</p>
          </div>
        </div>
      </div>

      {/* Master Score Reference Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs space-y-3">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-700" /> Company Master Score Reference Matrix
            </h3>
            <p className="text-xs text-neutral-500">Users are not allowed to edit scores unless they hold Admin or Owner roles.</p>
          </div>
          {!isAdmin && (
            <span className="text-[10px] font-mono text-neutral-600 bg-neutral-100 px-2 py-1 rounded border border-neutral-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read Only (Requires Admin)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Task Type</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3 text-right">Standard Score</th>
                <th className="px-4 py-3 text-right">COGS Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {scores.map((ms, idx) => (
                <tr key={idx} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 font-semibold text-neutral-900">{ms.category}</td>
                  <td className="px-4 py-3">{ms.taskType}</td>
                  <td className="px-4 py-3 font-mono text-neutral-700">{ms.format}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900">{ms.score} pts</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                    Rp{(ms.score * 250).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit User Profile */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveUser}
            className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-neutral-700" /> Edit Profile: {editingUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Profile Avatar Control */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <label className="block text-neutral-700 font-bold">Foto Profil User</label>
                <div className="flex items-center gap-4">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Preview" className="w-14 h-14 rounded-full object-cover border border-neutral-200 shrink-0 shadow-2xs" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-neutral-900 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-2xs">
                      {editName ? editName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="bg-white hover:bg-neutral-100 text-neutral-800 font-semibold px-3 py-1.5 rounded-lg border border-neutral-200 cursor-pointer flex items-center gap-1.5 transition">
                        <Upload className="w-3.5 h-3.5 text-neutral-600" /> Upload Foto Baru
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, true)}
                          className="hidden"
                        />
                      </label>

                      {editAvatar && (
                        <button
                          type="button"
                          onClick={() => setEditAvatar('')}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus Foto
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400">Pilih file gambar dari komputer atau klik Hapus Foto untuk reset ke inisial nama.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-500 mb-1 font-medium">Atau URL Foto Image Link:</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono"
                  />
                </div>
              </div>

              {/* Name & Email Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              {/* Capacity Input */}
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Monthly Capacity (Points)</label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono"
                />
              </div>

              {/* Roles Checkboxes */}
              <div>
                <label className="block text-neutral-600 font-semibold mb-1.5">User Roles</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => toggleRoleInEdit(r)}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition ${
                        editRoles.includes(r)
                          ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <span>{r}</span>
                      {editRoles.includes(r) && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save User Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Change Staff Password */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSavePassword}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Ganti Password Staff</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{passwordUser.name} ({passwordUser.email})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">Staff Detail</span>
                <p className="font-semibold text-neutral-800">{passwordUser.name} — <span className="font-mono text-neutral-500">{passwordUser.roles.join(', ')}</span></p>
                <p className="text-[10px] text-neutral-500">Default password awal: <code className="bg-neutral-200/80 px-1 py-0.5 rounded font-mono text-neutral-800">{passwordUser.name.toLowerCase()}</code></p>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Password Baru Staff</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    placeholder="Masukkan password baru..."
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 pr-9"
                    required
                    minLength={3}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Konfirmasi Password Baru</label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  placeholder="Ketik ulang password baru..."
                  value={confirmStaffPassword}
                  onChange={(e) => setConfirmStaffPassword(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900"
                  required
                  minLength={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 active:scale-98 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Password Baru</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add New Team Member */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-neutral-700" /> Add New Team Member
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  placeholder="budi@personaos.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Initial Password (Opsional)</label>
                <input
                  type="text"
                  placeholder="Password awal (default: nama depan)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1.5">User Roles</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => toggleRoleInNew(r)}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition ${
                        newRoles.includes(r)
                          ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <span>{r}</span>
                      {newRoles.includes(r) && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save New Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
