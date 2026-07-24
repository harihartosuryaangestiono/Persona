'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useUser } from '@/context/UserContext';
import { Plus, Edit2, ShieldAlert, CheckCircle, Trash2, Ban, Folder } from 'lucide-react';

const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#EF4444', '#14B8A6'];

export default function ClientsPage() {
  const { clients, tasks, refreshData } = useData();
  const { currentWorkspace, workspaces } = useWorkspace();
  const { currentUser } = useUser();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [monthlyPointBudget, setMonthlyPointBudget] = useState(5000);
  const [workspaceId, setWorkspaceId] = useState('');
  const [status, setStatus] = useState('Active');
  const [notes, setNotes] = useState('');
  const [clientColor, setClientColor] = useState(PRESET_COLORS[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter state
  const [showAllWorkspaces, setShowAllWorkspaces] = useState(false);

  // Check if Admin/Owner
  const isAdmin = currentUser?.roles.includes('Admin') || currentUser?.roles.includes('Owner');

  // Filter clients based on current workspace (or all workspaces if toggled and user is Admin)
  const filteredClients = clients.filter((c) => {
    if (showAllWorkspaces && isAdmin) return true;
    return c.workspaceId === currentWorkspace.id;
  });

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setCode('');
    setMonthlyPointBudget(5000);
    setWorkspaceId(currentWorkspace.id);
    setStatus('Active');
    setNotes('');
    setClientColor(PRESET_COLORS[0]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setName(client.name);
    setCode(client.code);
    setMonthlyPointBudget(client.monthlyPointBudget);
    setWorkspaceId(client.workspaceId || '');
    setStatus(client.status || (client.active ? 'Active' : 'Inactive'));
    setNotes(client.notes || '');
    setClientColor(client.clientColor || PRESET_COLORS[0]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setErrorMsg('Name and Code are required.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        name,
        code,
        monthlyPointBudget: Number(monthlyPointBudget),
        workspaceId: workspaceId || null,
        status,
        notes,
        clientColor,
      };

      const url = editingClient ? `/api/clients?id=${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to save client');
      }

      await refreshData();
      setIsModalOpen(false);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error occurred while saving client.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (client: any, newStatus: string) => {
    try {
      const res = await fetch(`/api/clients?id=${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await refreshData();
    } catch (e) {
      console.error(e);
      alert('Error updating status');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Client Management
            <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200">
              {filteredClients.length} Accounts
            </span>
          </h1>
          <p className="text-xs text-neutral-500">
            Define point budgets and assign clients to workspaces. 1 Pt = Rp1.500 for client budgets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllWorkspaces}
                onChange={(e) => setShowAllWorkspaces(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
              />
              Show All Workspaces' Clients
            </label>
          )}

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Add Client
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((cli) => {
          const clientTasks = tasks.filter((t) => t.clientId === cli.id);
          const burnPercent = cli.monthlyPointBudget > 0 ? Math.round((cli.usedPoint / cli.monthlyPointBudget) * 100) : 0;
          const isExceeded = cli.usedPoint > cli.monthlyPointBudget;
          const exceededPoints = cli.usedPoint - cli.monthlyPointBudget;
          const exceededPercent = cli.monthlyPointBudget > 0 ? Math.round((exceededPoints / cli.monthlyPointBudget) * 100) : 0;

          // Status & Badge styles
          let statusText = cli.status || (cli.active ? 'Active' : 'Inactive');
          if (isExceeded && statusText === 'Active') {
            statusText = 'Over Budget';
          }

          let statusBadgeClass = 'badge-draft';
          if (statusText === 'Active') statusBadgeClass = 'badge-approved';
          if (statusText === 'Inactive') statusBadgeClass = 'badge-draft';
          if (statusText === 'Archived') statusBadgeClass = 'badge-posted';
          if (statusText === 'Over Budget') statusBadgeClass = 'badge-waiting bg-red-50 text-red-700 border-red-200';

          const wsName = workspaces.find((w) => w.id === cli.workspaceId)?.name || 'Unassigned';

          return (
            <div key={cli.id} className="bg-white border border-neutral-200/80 rounded-2xl p-6 space-y-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: cli.clientColor }}
              />

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">{cli.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {cli.code}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${statusBadgeClass}`}>
                        {statusText}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-neutral-900">
                      {cli.monthlyPointBudget} pts
                    </span>
                    <p className="text-[10px] text-neutral-400">Budget</p>
                  </div>
                </div>

                {/* Point Usage Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-500">Used: {cli.usedPoint} pts</span>
                    {isExceeded ? (
                      <span className="font-bold text-red-600">
                        Rem: {cli.remainingPoint} pts ({burnPercent}%)
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-700">
                        Rem: {cli.remainingPoint} pts ({burnPercent}%)
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, burnPercent)}%`,
                        backgroundColor: isExceeded ? '#EF4444' : cli.clientColor,
                      }}
                    />
                  </div>
                </div>

                {/* Workspace Info */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <Folder className="w-3.5 h-3.5" />
                  <span>Workspace: <strong className="text-neutral-700">{wsName}</strong></span>
                </div>

                {/* Status Warning Banner */}
                {isExceeded && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs flex flex-col gap-0.5 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>Over Budget!</span>
                    </div>
                    <span className="pl-5 text-[10px] font-normal text-red-600">
                      Exceeded by {exceededPoints} Points ({exceededPercent}%)
                    </span>
                  </div>
                )}

                {cli.notes && (
                  <p className="text-xs text-neutral-500 italic bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                    "{cli.notes}"
                  </p>
                )}
              </div>

              {/* Action buttons (only for Admin/Owner) */}
              {isAdmin && (
                <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-neutral-100 text-xs">
                  <button
                    onClick={() => openEditModal(cli)}
                    className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 font-semibold transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>

                  <div className="flex items-center gap-3">
                    {statusText !== 'Active' && (
                      <button
                        onClick={() => handleUpdateStatus(cli, 'Active')}
                        className="flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 font-semibold transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Activate
                      </button>
                    )}
                    {statusText === 'Active' && (
                      <button
                        onClick={() => handleUpdateStatus(cli, 'Inactive')}
                        className="flex items-center gap-0.5 text-amber-600 hover:text-amber-700 font-semibold transition"
                      >
                        <Ban className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    )}
                    {statusText !== 'Archived' && (
                      <button
                        onClick={() => handleUpdateStatus(cli, 'Archived')}
                        className="flex items-center gap-0.5 text-neutral-500 hover:text-neutral-700 font-semibold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Archive
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-filter backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">
                {editingClient ? 'Edit Client Details' : 'Register New Client'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-semibold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Client Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Baking Empire Serpong"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden focus:border-neutral-400"
                />
              </div>

              {/* Code */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Client Code</label>
                <input
                  type="text"
                  required
                  disabled={!!editingClient}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. BEGS"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden focus:border-neutral-400 disabled:opacity-50 disabled:bg-neutral-100"
                />
              </div>

              {/* Monthly Points */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Monthly Points Budget</label>
                <input
                  type="number"
                  required
                  value={monthlyPointBudget}
                  onChange={(e) => setMonthlyPointBudget(Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden focus:border-neutral-400"
                />
              </div>

              {/* Workspace */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Assigned Workspace</label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden focus:border-neutral-400"
                >
                  <option value="">Unassigned</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden focus:border-neutral-400"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">Notes / Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add custom notes..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-hidden focus:border-neutral-400 h-16 resize-none"
                />
              </div>

              {/* Preset Color Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">Client Visual Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setClientColor(c)}
                      className={`w-6 h-6 rounded-full border transition flex-shrink-0 ${
                        clientColor === c ? 'border-neutral-900 scale-110 shadow-xs' : 'border-neutral-200 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
