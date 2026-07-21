'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import {
  FolderKanban,
  FolderPlus,
  Upload,
  Folder,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Search,
  ExternalLink,
  HardDrive,
  X,
  Sparkles,
} from 'lucide-react';

interface AssetFile {
  id: string;
  name: string;
  folder: string;
  clientId: string;
  clientName: string;
  size: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  link: string;
}

export default function AssetLibraryPage() {
  const { clients } = useData();

  const [folders, setFolders] = useState<string[]>([
    'Logo & Vector',
    'RAW Shoots',
    'Final Exports',
    'Music & Audio',
    'Brand Guidelines',
  ]);
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState<boolean>(false);
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState<boolean>(false);

  // Form states
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newAssetName, setNewAssetName] = useState<string>('');
  const [newAssetFolder, setNewAssetFolder] = useState<string>(folders[0] || 'Logo & Vector');
  const [newAssetClientId, setNewAssetClientId] = useState<string>(clients[0]?.id || '');
  const [newAssetSize, setNewAssetSize] = useState<string>('12.5 MB');
  const [newAssetType, setNewAssetType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'>('IMAGE');
  const [newAssetLink, setNewAssetLink] = useState<string>('https://drive.google.com');

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (!folders.includes(newFolderName.trim())) {
      setFolders((prev) => [...prev, newFolderName.trim()]);
    }
    setNewFolderName('');
    setIsAddFolderModalOpen(false);
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;

    const targetClient = clients.find((c) => c.id === newAssetClientId) || clients[0];
    const newAsset: AssetFile = {
      id: `asset-${Date.now()}`,
      name: newAssetName.trim(),
      folder: newAssetFolder,
      clientId: targetClient ? targetClient.id : 'c-1',
      clientName: targetClient ? targetClient.name : 'General Client',
      size: newAssetSize,
      type: newAssetType,
      link: newAssetLink || 'https://drive.google.com',
    };

    setAssets((prev) => [newAsset, ...prev]);
    setNewAssetName('');
    setIsAddAssetModalOpen(false);
  };

  const filteredAssets = assets.filter((a) => {
    const matchesFolder = selectedFolder === 'ALL' || a.folder === selectedFolder;
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn text-neutral-900">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            Digital Asset Management (DAM) <span className="text-xs font-mono bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full border border-neutral-200">{assets.length} Files Uploaded</span>
          </h1>
          <p className="text-xs text-neutral-500">
            Centralized digital asset vault organized by client, custom folder groups, media type, and Drive links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddFolderModalOpen(true)}
            className="bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4 text-neutral-500" /> New Folder / Group
          </button>
          <button
            onClick={() => setIsAddAssetModalOpen(true)}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition"
          >
            <Upload className="w-4 h-4" /> Add New Asset
          </button>
        </div>
      </div>

      {/* Cloud Storage Bar */}
      <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 rounded-xl bg-neutral-100 text-neutral-900">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900">Enterprise Asset Storage</p>
            <p className="text-[11px] text-neutral-500">Storage ready for client deliverables and raw footage uploads.</p>
          </div>
        </div>

        <div className="w-full md:w-64 bg-neutral-100 h-2 rounded-full overflow-hidden border border-neutral-200">
          <div className="bg-neutral-900 h-full w-[8%]" />
        </div>
      </div>

      {/* Folder Group Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedFolder('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
              selectedFolder === 'ALL'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            All Assets ({assets.length})
          </button>

          {folders.map((folderName) => {
            const count = assets.filter((a) => a.folder === folderName).length;
            return (
              <button
                key={folderName}
                onClick={() => setSelectedFolder(folderName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  selectedFolder === folderName
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                {folderName} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search asset files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent focus:outline-none w-48 placeholder-neutral-400"
          />
        </div>
      </div>

      {/* Asset Grid & Clean Empty State */}
      {filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-4 rounded-2xl bg-white border border-neutral-200/80 hover:border-neutral-300 shadow-xs transition space-y-3 group"
            >
              <div className="h-28 rounded-xl bg-neutral-50 flex items-center justify-center border border-neutral-200 relative overflow-hidden">
                {asset.type === 'VIDEO' ? (
                  <Video className="w-8 h-8 text-neutral-700 group-hover:scale-110 transition" />
                ) : asset.type === 'AUDIO' ? (
                  <Music className="w-8 h-8 text-neutral-700 group-hover:scale-110 transition" />
                ) : asset.type === 'DOCUMENT' ? (
                  <FileText className="w-8 h-8 text-neutral-700 group-hover:scale-110 transition" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-neutral-700 group-hover:scale-110 transition" />
                )}
                <span className="absolute top-2 right-2 bg-white text-neutral-600 text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-200">
                  {asset.size}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-neutral-900 truncate">{asset.name}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{asset.clientName}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[10px]">
                <span className="text-neutral-700 font-mono font-semibold">{asset.folder}</span>
                <a
                  href={asset.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-900 font-semibold hover:underline flex items-center gap-1"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto border border-neutral-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">Belum Ada Asset Digital</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
              Gunakan tombol <span className="text-neutral-900 font-semibold">"Add New Asset"</span> di kanan atas untuk mengunggah file asset baru atau <span className="text-neutral-900 font-semibold">"New Folder / Group"</span> untuk membuat kelompok asset baru.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => setIsAddFolderModalOpen(true)}
              className="bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold px-4 py-2 rounded-lg border border-neutral-200 shadow-xs transition"
            >
              + Create Folder Group
            </button>
            <button
              onClick={() => setIsAddAssetModalOpen(true)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
            >
              + Add First Asset
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Folder / Group */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleCreateFolder}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-neutral-700" /> Create New Asset Group / Folder
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFolderModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Group / Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g. TikTok Reels RAW, Social Media Graphics..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddFolderModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add New Asset */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleAddAsset}
            className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-neutral-700" /> Add Digital Asset File
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAssetModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Asset Title / File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Baking_Empire_Logo_4K.png"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Group / Folder</label>
                <select
                  value={newAssetFolder}
                  onChange={(e) => setNewAssetFolder(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Client</label>
                <select
                  value={newAssetClientId}
                  onChange={(e) => setNewAssetClientId(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Media Type</label>
                  <select
                    value={newAssetType}
                    onChange={(e) =>
                      setNewAssetType(e.target.value as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT')
                    }
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                  >
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="AUDIO">Audio</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">File Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 15.4 MB"
                    value={newAssetSize}
                    onChange={(e) => setNewAssetSize(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Drive / Cloud Link</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={newAssetLink}
                  onChange={(e) => setNewAssetLink(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAddAssetModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-xs"
              >
                Upload Asset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
