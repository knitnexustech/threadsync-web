
import React, { useState, useRef, useEffect } from 'react';
import { Channel, AttachedFile, User } from '../types';
import { api } from '../supabaseAPI';
import { compressImage } from '../imageUtils';

interface SpecDrawerProps {
    channel: Channel;
    currentUser: User;
}

export const SpecDrawer: React.FC<SpecDrawerProps> = ({ channel, currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'SPECS' | 'FILES'>('SPECS');

    // FIX: Initialize with a copy of the array to prevent reference pollution and duplication
    const [files, setFiles] = useState<AttachedFile[]>([...(channel.files || [])]);
    const [specs, setSpecs] = useState(channel.specs || []);
    const [newSpecContent, setNewSpecContent] = useState('');
    const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ROLE-BASED PERMISSIONS (UI Control)
    // Based on new permission model from ROLE_PERMISSIONS_UPDATE.md
    const canEditChannel = ['ADMIN', 'SENIOR_MERCHANDISER', 'SENIOR_MANAGER'].includes(currentUser.role);

    // Sync files and specs from props if channel changes
    useEffect(() => {
        setFiles([...(channel.files || [])]);
        setSpecs(channel.specs || []);
    }, [channel.files, channel.specs]);

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            setIsUploading(true);

            try {
                (window as any).isKramizUploading = true;
                for (const file of selectedFiles) {
                    // Compress if image
                    const fileToUpload = await compressImage(file);

                    // 1. Upload to Supabase Storage
                    const publicUrl = await api.uploadFile(fileToUpload as File);

                    // 2. Save reference to Database
                    const newFile = await api.addFileToChannel(currentUser, channel.id, file.name, publicUrl);
                    setFiles(prev => [...prev, newFile]);
                }
            } catch (err: any) {
                console.error(err);
                alert("Failed to upload: " + err.message);
            } finally {
                setIsUploading(false);
                (window as any).isKramizUploading = false;
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (window.confirm("Are you sure you want to remove this file?")) {
            await api.deleteFileFromChannel(channel.id, fileId);
            // Force update local state
            setFiles(prev => prev.filter(f => f.id !== fileId));
        }
    };

    const handleRenameFile = async (file: AttachedFile) => {
        const newName = window.prompt("Enter new name for the file:", file.name);
        if (newName && newName !== file.name) {
            try {
                await api.renameFile(file.id, newName);
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: newName } : f));
            } catch (err: any) {
                alert(err.message || "Failed to rename file");
            }
        }
    };

    const handleAddSpec = async () => {
        if (!newSpecContent.trim()) return;
        try {
            const newSpec = await api.addSpecToChannel(currentUser, channel.id, newSpecContent);
            setSpecs(prev => [newSpec, ...prev]); // Add to beginning since we order by created_at DESC
            setNewSpecContent('');
        } catch (err) {
            console.error(err);
            alert("Failed to add spec");
        }
    };

    const handleDeleteSpec = async (specId: string) => {
        if (window.confirm("Are you sure you want to remove this spec?")) {
            try {
                await api.deleteSpecFromChannel(channel.id, specId);
                setSpecs(prev => prev.filter(s => s.id !== specId));
            } catch (err) {
                console.error(err);
                alert("Failed to delete spec");
            }
        }
    };

    const handleViewFile = (file: AttachedFile) => {
        if (file.url && file.url !== '#') {
            setPreviewFile(file);
        } else {
            alert(`Document View Simulation: ${file.name}\n\n(In a real app, this would open the file viewer)`);
        }
    };

    return (
        <div className="bg-white border-b border-gray-200 shadow-sm z-20 relative">
            <div
                id="tour-specs-drawer"
                className="flex justify-between items-center px-4 py-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Channel Specs & Files</span>
                    <span className="font-semibold text-gray-900">{channel.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{specs.length} Specs</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{files.length} Files</span>
                    <button className="text-gray-500 hover:text-gray-700">
                        {isOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="p-4 bg-white animate-fade-in-down border-t border-gray-100 max-h-[28vh] md:max-h-[500px] overflow-y-auto border-b-2 border-slate-100">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('SPECS')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SPECS'
                                ? 'border-[#008069] text-[#008069]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📋 Specs ({specs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('FILES')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'FILES'
                                ? 'border-[#008069] text-[#008069]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📎 Files ({files.length})
                        </button>
                    </div>

                    {/* Specs Tab */}
                    {activeTab === 'SPECS' && (
                        <div className="space-y-3">
                            {specs.length === 0 && (
                                <div className="text-center text-gray-400 text-sm py-4 italic">No specs added yet.</div>
                            )}
                            {specs.map(spec => (
                                <div key={spec.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 relative group">
                                    <div className="text-sm text-gray-800 whitespace-pre-wrap mb-2">{spec.content}</div>
                                    <div className="text-[10px] text-gray-400">
                                        Added {spec.created_at ? new Date(spec.created_at).toLocaleDateString() : 'recently'}
                                    </div>
                                    {canEditChannel && (
                                        <button
                                            onClick={() => handleDeleteSpec(spec.id)}
                                            className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Spec"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Add Spec Form */}
                            {canEditChannel ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={newSpecContent}
                                        onChange={(e) => setNewSpecContent(e.target.value)}
                                        placeholder="Add production spec or note...&#10;Example: GSM: 180 g/m² - Premium quality cotton&#10;Diameter: 30 inches circular knit"
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#008069] focus:ring-1 focus:ring-[#008069] resize-none"
                                        rows={3}
                                    />
                                    <button
                                        onClick={handleAddSpec}
                                        disabled={!newSpecContent.trim()}
                                        className="w-full bg-[#008069] hover:bg-[#006a57] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Spec
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-xs text-gray-400 italic">
                                    Only Admins and Senior members can add specs.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Files Tab */}
                    {activeTab === 'FILES' && (
                        <>
                            {/* File List - Vertical list on most screens, grid only on large desktop */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 mb-4">
                                {files.length === 0 && (
                                    <div className="col-span-full text-center text-gray-400 text-sm py-4 italic">No documents attached yet.</div>
                                )}
                                {files.map(file => (
                                    <div key={file.id} className="flex items-center p-2 border border-gray-100 rounded-lg hover:border-blue-200 transition-all group relative bg-white shadow-sm min-w-0">
                                        {/* Clickable Area for Viewing */}
                                        <div
                                            className="flex-1 flex items-center cursor-pointer min-w-0"
                                            onClick={() => handleViewFile(file)}
                                        >
                                            <div className="h-10 w-10 bg-slate-50 rounded-md flex items-center justify-center mr-3 group-hover:bg-blue-50 flex-shrink-0 overflow-hidden border border-gray-100">
                                                {file.type === 'PDF' ? (
                                                    <div className="flex flex-col items-center">
                                                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                                                            <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                                                        </svg>
                                                        <span className="text-[8px] font-bold text-red-600 -mt-1">PDF</span>
                                                    </div>
                                                ) : file.type === 'IMAGE' ? (
                                                    <img
                                                        src={file.url}
                                                        alt="preview"
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            // If real image fails, hide image and show placeholder
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            const parent = (e.target as HTMLImageElement).parentElement;
                                                            if (parent) {
                                                                const span = document.createElement('span');
                                                                span.className = 'text-blue-500 text-[10px] font-bold';
                                                                span.innerText = 'IMG';
                                                                parent.appendChild(span);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-blue-500 text-[10px] font-bold uppercase px-0.5">
                                                        {file.name.includes('.') ? file.name.split('.').pop() : 'FILE'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[12px] font-bold text-gray-800 leading-snug line-clamp-2 break-words" title={file.name}>{file.name}</div>
                                                <div className="text-[9px] text-gray-400 mt-0.5">
                                                    {file.uploadedBy} • {new Date(file.uploadedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions - Positioned to the right - RESTRICTED */}
                                        {canEditChannel && (
                                            <div className="flex items-center gap-1 ml-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRenameFile(file);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors focus:outline-none z-10"
                                                    title="Rename File"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Stop click from triggering view
                                                        handleDeleteFile(file.id);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors focus:outline-none z-10"
                                                    title="Remove File"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Upload Action - RESTRICTED */}
                            {canEditChannel ? (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        multiple
                                    />
                                    <button
                                        onClick={() => {
                                            (window as any).isKramizUploading = true;
                                            fileInputRef.current?.click();
                                            // Safety timeout
                                            setTimeout(() => {
                                                if (!(fileInputRef.current?.files?.length) && (window as any).isKramizUploading) {
                                                    (window as any).isKramizUploading = false;
                                                }
                                            }, 60000);
                                        }}
                                        disabled={isUploading}
                                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-[#008069] hover:text-[#008069] transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                                    >
                                        <svg className={`w-5 h-5 ${isUploading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {isUploading ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            )}
                                        </svg>
                                        {isUploading ? 'Uploading Please Wait...' : 'Upload Document / Spec Sheet'}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center text-xs text-gray-400 italic">
                                    Only Admins and Senior members can upload production files.
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
            {/* Premium Full-Screen File Preview */}
            {previewFile && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300"
                    onClick={() => setPreviewFile(null)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setPreviewFile(null)}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[110] border border-white/20"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Content Container */}
                    <div className="relative w-full h-full p-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {previewFile.type === 'IMAGE' ? (
                            <img
                                src={previewFile.url}
                                alt="Full Screen Preview"
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-300"
                            />
                        ) : previewFile.type === 'PDF' ? (
                            <iframe
                                src={previewFile.url}
                                className="w-full h-full max-w-5xl bg-white rounded-lg shadow-2xl"
                                title="PDF Preview"
                            />
                        ) : (
                            <div className="bg-white p-8 rounded-xl text-center max-w-md">
                                <div className="text-4xl mb-4">📄</div>
                                <h3 className="text-xl font-bold mb-2">{previewFile.name}</h3>
                                <p className="text-gray-500 mb-6">Preview not available for this file type.</p>
                                <a
                                    href={previewFile.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block bg-[#008069] text-white px-6 py-2 rounded-lg font-medium"
                                >
                                    Open in New Tab
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
