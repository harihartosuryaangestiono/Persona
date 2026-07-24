'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { KeyRound, ShieldAlert, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const { allUsers, login } = useUser();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [lastActiveUserId, setLastActiveUserId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check localStorage for the last logged in employee to highlight them
  useEffect(() => {
    const lastUserId = localStorage.getItem('persona_last_logged_in_id');
    if (lastUserId) {
      setLastActiveUserId(lastUserId);
    }
  }, []);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setError(null);
    setPassword('');
    setLastActiveUserId(user.id);
    localStorage.setItem('persona_last_logged_in_id', user.id);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setError(null);
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const success = login(selectedUser.id, password);
    if (success) {
      setError(null);
    } else {
      setError('Incorrect password. (Tip: Use the employee\'s name in lowercase, e.g. "devi", "anggi")');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 md:px-6">
      <div className="w-full max-w-xl text-center space-y-12 py-12">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex justify-center">
            {/* Minimal Apple-inspired Company Logo */}
            <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xl tracking-tight shadow-md">
              P
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Welcome to Persona OS
          </h1>
          <p className="text-sm text-neutral-400 font-semibold tracking-wider uppercase">
            Agency Operating System
          </p>
        </div>

        {/* Phase 1: Selector Screen */}
        {!selectedUser ? (
          <div className="space-y-6">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
              Select Your Profile to Sign In
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allUsers.map((user) => {
                const isLastUsed = lastActiveUserId === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`group text-left p-4 rounded-2xl bg-white border transition duration-200 flex items-center gap-4 relative ${
                      isLastUsed
                        ? 'border-neutral-900 shadow-md ring-1 ring-neutral-900'
                        : 'border-neutral-200 hover:border-neutral-400 hover:shadow-md'
                    }`}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-11 h-11 rounded-xl object-cover border border-neutral-100 group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-neutral-900 text-white font-bold flex items-center justify-center border border-neutral-100 group-hover:scale-105 transition">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-neutral-900 truncate flex items-center gap-1.5">
                        {user.name}
                        {isLastUsed && (
                          <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono font-semibold">
                            Last active
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-500 font-medium truncate mt-0.5">
                        {user.roles.join(' • ')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Phase 2: Password Screen */
          <div className="max-w-md mx-auto p-8 rounded-3xl border border-neutral-200/80 bg-neutral-50/50 shadow-sm animate-fadeIn space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-neutral-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white font-bold text-xl flex items-center justify-center border border-neutral-200">
                  {selectedUser.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-neutral-900">{selectedUser.name}</h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  {selectedUser.roles.join(' • ')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-500 block">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 text-xs text-red-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <button
                  type="submit"
                  className="w-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm"
                >
                  Verify & Sign In
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full hover:bg-neutral-100 font-semibold py-2.5 px-4 rounded-xl text-xs text-neutral-600 transition flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Not you? Select another account
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
