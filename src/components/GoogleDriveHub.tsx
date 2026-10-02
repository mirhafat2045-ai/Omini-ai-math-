import React, { useState, useEffect } from 'react';
import {
  listDriveFiles,
  saveWorkspaceToDrive,
  getDriveFileContent,
  deleteDriveFile,
  getDriveAbout,
  DriveFileItem,
  DriveQuota,
  DriveUserInfo,
} from '../services/googleDriveService';
import {
  HardDrive,
  CloudUpload,
  FolderOpen,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  X,
  FileJson,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface GoogleDriveHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace: {
    mode: string;
    surfaceExpr?: string;
    calcExpr?: string;
    matrixA?: any;
    matrixB?: any;
    vectorB?: any;
    calcHistory?: any[];
  };
  onLoadProject: (projectData: any) => void;
  onCaptureScreenshot?: () => string | null;
}

export const GoogleDriveHub: React.FC<GoogleDriveHubProps> = ({
  isOpen,
  onClose,
  currentWorkspace,
  onLoadProject,
  onCaptureScreenshot,
}) => {
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'save'>('files');
  const [quota, setQuota] = useState<DriveQuota | null>(null);
  const [userInfo, setUserInfo] = useState<DriveUserInfo | null>(null);

  // Save form state
  const [projectTitle, setProjectTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Destructive Action: Confirmation Modal State (MANDATORY per Workspace Skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [fileList, about] = await Promise.all([
        listDriveFiles(),
        getDriveAbout().catch(() => ({ user: undefined, quota: undefined })),
      ]);
      setFiles(fileList);
      if (about.quota) setQuota(about.quota);
      if (about.user) setUserInfo(about.user);
    } catch (err: any) {
      console.error('Failed to fetch Drive files', err);
      setErrorMsg(err.message || 'Could not load files from Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setProjectTitle(`Math Workspace - ${new Date().toLocaleDateString()}`);
    }
  }, [isOpen]);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setSaveStatus(null);
      setErrorMsg(null);

      await saveWorkspaceToDrive(projectTitle, currentWorkspace);
      setSaveStatus('Project saved successfully to Google Drive!');
      await fetchFiles();
      setTimeout(() => {
        setSaveStatus(null);
        setActiveTab('files');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save workspace to Drive.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadProject = async (file: DriveFileItem) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const content = await getDriveFileContent(file.id);
      onLoadProject(content);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load project from Drive.');
    } finally {
      setLoading(false);
    }
  };

  // Explicit Confirmation before calling deleteDriveFile (MANDATORY)
  const handleConfirmDelete = async () => {
    if (!fileToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await deleteDriveFile(fileToDelete.id);
      setFileToDelete(null);
      await fetchFiles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format bytes
  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '0 B';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-600/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Google Drive Project Hub
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium">
                  OmniMath Cloud
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sync, load, and organize your mathematical models and 3D surface graphs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
              title="Refresh Drive Files"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch bar */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'files'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Saved Drive Files ({files.length})
            </button>
            <button
              onClick={() => setActiveTab('save')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'save'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Save Current Workspace
            </button>
          </div>

          {/* Drive Quota Display */}
          {quota && quota.usage && quota.limit && (
            <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-2">
              <span>Drive Storage:</span>
              <span className="text-indigo-300 font-semibold">
                {formatBytes(quota.usage)} / {formatBytes(quota.limit)}
              </span>
            </div>
          )}
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Browse & Load Drive Files */}
        {activeTab === 'files' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search calculation projects in Drive..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-sans"
              />
            </div>

            {/* File List */}
            {loading && files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs font-mono">Syncing with Google Drive...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 space-y-3 text-center">
                <FolderOpen className="w-10 h-10 text-slate-600" />
                <div>
                  <div className="text-sm font-semibold text-slate-300">No project files found</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Save your active mathematical workspace to Google Drive to access it here anytime!
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('save')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Save Workspace Now
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredFiles.map(file => {
                  const isJson = file.name.endsWith('.json') || file.mimeType.includes('json');
                  const isPng = file.name.endsWith('.png') || file.mimeType.includes('image');

                  return (
                    <div
                      key={file.id}
                      className="p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3 transition group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 text-indigo-400">
                          {isPng ? (
                            <ImageIcon className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <FileJson className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>

                        <div className="overflow-hidden">
                          <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition">
                            {file.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(file.modifiedTime).toLocaleDateString()}
                            </span>
                            {file.size && <span>• {formatBytes(file.size)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isJson && (
                          <button
                            onClick={() => handleLoadProject(file)}
                            className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-medium flex items-center gap-1 shadow-sm transition"
                            title="Load into active workspace"
                          >
                            <span>Load</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => setFileToDelete(file)}
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-950/30 transition"
                          title="Delete from Google Drive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Save Active Workspace */}
        {activeTab === 'save' && (
          <div className="flex-1 overflow-y-auto p-5">
            <form onSubmit={handleSaveWorkspace} className="space-y-4 max-w-xl mx-auto">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-400 font-bold block">
                  Active Workspace Summary
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">Active Mode:</span>
                    <span className="text-slate-200 capitalize font-semibold">
                      {currentWorkspace.mode === 'graph3d'
                        ? '3D Surface Grapher'
                        : currentWorkspace.mode === 'linalg'
                        ? 'Linear Algebra Engine'
                        : 'Scientific Calculator'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">3D Formula:</span>
                    <span className="text-indigo-300 truncate block">
                      z = {currentWorkspace.surfaceExpr || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Project Title in Google Drive
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={e => setProjectTitle(e.target.value)}
                  placeholder="e.g. Quantum Wave Surface & 3x3 Matrices"
                  required
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition font-sans"
                />
                <span className="text-[11px] text-slate-500 font-mono block mt-1">
                  Will be saved into the dedicated &quot;OmniMath AI Projects&quot; cloud folder.
                </span>
              </div>

              {saveStatus && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !projectTitle.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Drive...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>Save Workspace to Drive</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono px-4">
          <span>Connected as {userInfo?.emailAddress || 'Authorized User'}</span>
          <span>Google Drive API v3</span>
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG FOR DESTRUCTIVE ACTIONS */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete file from Google Drive?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                Target File to Delete:
              </div>
              <div className="font-semibold text-rose-300 truncate">{fileToDelete.name}</div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this file from your Google Drive? It will be
              removed from your cloud project library.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
