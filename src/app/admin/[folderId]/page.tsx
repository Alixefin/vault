"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import styles from "./page.module.css";

export default function FolderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const folderId = params.folderId as string;

    const folder = useQuery(api.folders.get, {
        folderId: folderId as Id<"folders">,
    });
    const media = useQuery(api.media.getByFolder, {
        folderId: folderId as Id<"folders">,
    });

    const createShareLink = useMutation(api.sharing.createShareLink);
    const deleteFileMutation = useMutation(api.media.deleteFile);
    const deleteFolderMutation = useMutation(api.folders.deleteFolder);

    const [previewItem, setPreviewItem] = useState<any>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharePermission, setSharePermission] = useState<"view" | "save">("view");
    const [shareLink, setShareLink] = useState("");
    const [shareCopied, setShareCopied] = useState(false);
    const [shareMediaId, setShareMediaId] = useState<string | null>(null);
    const [confirmDeleteMedia, setConfirmDeleteMedia] = useState<string | null>(null);
    const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const handleDownload = async (url: string, fileName: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Download error:", error);
        }
    };

    const handleDownloadAll = async () => {
        if (!media) return;
        for (const item of media) {
            if (item.url) {
                await handleDownload(item.url, item.fileName);
                await new Promise((r) => setTimeout(r, 300));
            }
        }
    };

    const handleShare = async () => {
        try {
            const args: any = {
                folderId: folderId as Id<"folders">,
                permission: sharePermission,
            };
            if (shareMediaId) {
                args.mediaId = shareMediaId as Id<"media">;
            }
            const token = await createShareLink(args);
            const url = `${window.location.origin}/share/${token}`;
            setShareLink(url);
        } catch (error) {
            console.error("Share error:", error);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch {
            const input = document.createElement("input");
            input.value = shareLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        }
    };

    const openShareModal = (mediaId?: string) => {
        setShowShareModal(true);
        setShareLink("");
        setShareCopied(false);
        setShareMediaId(mediaId || null);
    };

    const handleDeleteMedia = async (mediaId: string) => {
        try {
            await deleteFileMutation({ mediaId: mediaId as Id<"media"> });
            setConfirmDeleteMedia(null);
            if (previewItem?._id === mediaId) setPreviewItem(null);
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const handleDeleteFolder = async () => {
        try {
            await deleteFolderMutation({ folderId: folderId as Id<"folders"> });
            router.push("/admin");
        } catch (error) {
            console.error("Delete folder error:", error);
        }
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <button className={styles.backBtn} onClick={() => router.push("/admin")}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M14 9H4m0 0l4-4m-4 4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back
                    </button>
                    <div className={styles.headerActions}>
                        <button className={styles.shareAllBtn} onClick={() => openShareModal()}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="12" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                                <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                                <circle cx="12" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                                <path d="M5.8 7l4.4-2.5M5.8 9l4.4 2.5" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                            Share
                        </button>
                        <button className={styles.deleteAllBtn} onClick={() => setConfirmDeleteFolder(true)}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2.5 5h11M6 5V3.5a1 1 0 011-1h2a1 1 0 011 1V5M5 5v8a1 1 0 001 1h4a1 1 0 001-1V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                            Delete
                        </button>
                        {media && media.length > 0 && (
                            <button id="download-all-btn" className={styles.downloadAllBtn} onClick={handleDownloadAll}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Save All
                            </button>
                        )}
                    </div>
                </div>
                <div className={styles.folderHeader}>
                    <h1 className={styles.folderName}>
                        {folder?.name || "..."}
                        {folder?.hasPassword && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "6px" }}>
                                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#111" strokeWidth="1.3" />
                                <path d="M5 7V5a3 3 0 016 0v2" stroke="#111" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                        )}
                    </h1>
                    <div className={styles.folderInfo}>
                        <span>{media?.length || 0} files</span>
                        {folder && <span>· {formatDate(folder.createdAt)}</span>}
                    </div>
                </div>
            </header>

            {/* Grid */}
            {!media ? (
                <div className={styles.loadingGrid}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={styles.skeleton} />
                    ))}
                </div>
            ) : media.length > 0 ? (
                <div className={styles.mediaGrid}>
                    {media.map((item, index) => (
                        <div
                            key={item._id}
                            className={styles.mediaCard}
                            style={{ animationDelay: `${index * 0.04}s` }}
                        >
                            <div className={styles.mediaThumb} onClick={() => setPreviewItem(item)}>
                                {item.type === "image" && item.url ? (
                                    <img src={item.url} alt={item.fileName} loading="lazy" />
                                ) : (
                                    <div className={styles.videoPlaceholder}>
                                        {item.url && <video src={item.url} preload="metadata" />}
                                        <div className={styles.playIcon}>
                                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                                <circle cx="14" cy="14" r="12" fill="rgba(0,0,0,0.5)" />
                                                <polygon points="11,9 11,19 20,14" fill="white" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={styles.mediaMeta}>
                                <div className={styles.mediaInfo}>
                                    <p className={styles.mediaName}>{item.fileName}</p>
                                    <p className={styles.mediaSize}>{formatSize(item.size)}</p>
                                </div>
                                <button
                                    className={styles.mediaShareBtn}
                                    onClick={() => openShareModal(item._id)}
                                    title="Share this file"
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <circle cx="9.5" cy="2.5" r="1.5" stroke="#666" strokeWidth="1" />
                                        <circle cx="2.5" cy="6" r="1.5" stroke="#666" strokeWidth="1" />
                                        <circle cx="9.5" cy="9.5" r="1.5" stroke="#666" strokeWidth="1" />
                                        <path d="M3.8 5.2l4.4-1.9M3.8 6.8l4.4 1.9" stroke="#666" strokeWidth="1" />
                                    </svg>
                                </button>
                                <button
                                    className={styles.mediaDeleteBtn}
                                    onClick={() => setConfirmDeleteMedia(item._id)}
                                    title="Delete this file"
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M3 3l6 6m0-6l-6 6" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    <p>This folder is empty</p>
                </div>
            )}

            {/* Preview Modal */}
            {previewItem && (
                <div className="modal-overlay" onClick={() => setPreviewItem(null)}>
                    <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.previewHeader}>
                            <div>
                                <h3 className={styles.previewName}>{previewItem.fileName}</h3>
                                <p className={styles.previewInfo}>
                                    {previewItem.type} · {formatSize(previewItem.size)}
                                </p>
                            </div>
                            <div className={styles.previewActions}>
                                <button
                                    className={styles.previewShareBtn}
                                    onClick={() => {
                                        setPreviewItem(null);
                                        openShareModal(previewItem._id);
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle cx="12" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                                        <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                                        <circle cx="12" cy="12.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                                        <path d="M5.8 7l4.4-2.5M5.8 9l4.4 2.5" stroke="currentColor" strokeWidth="1.2" />
                                    </svg>
                                    Share
                                </button>
                                <button
                                    className={styles.downloadBtn}
                                    onClick={() =>
                                        handleDownload(previewItem.url, previewItem.fileName)
                                    }
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Save
                                </button>
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setPreviewItem(null)}
                                >
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <path d="M4 4l10 10m0-10L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className={styles.previewContent}>
                            {previewItem.type === "image" ? (
                                <img
                                    src={previewItem.url}
                                    alt={previewItem.fileName}
                                    className={styles.previewImage}
                                />
                            ) : (
                                <video
                                    src={previewItem.url}
                                    controls
                                    autoPlay
                                    className={styles.previewVideo}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.shareModalTitle}>
                            {shareMediaId ? "Share File" : "Share Folder"}
                        </h2>
                        <p className={styles.shareModalDesc}>
                            {shareMediaId
                                ? "Generate a share link for this file"
                                : `Generate a share link for ${folder?.name}`}
                        </p>

                        <div className={styles.permToggle}>
                            <button
                                className={`${styles.permBtn} ${sharePermission === "view" ? styles.permBtnActive : ""}`}
                                onClick={() => { setSharePermission("view"); setShareLink(""); }}
                            >
                                View Only
                            </button>
                            <button
                                className={`${styles.permBtn} ${sharePermission === "save" ? styles.permBtnActive : ""}`}
                                onClick={() => { setSharePermission("save"); setShareLink(""); }}
                            >
                                View &amp; Save
                            </button>
                        </div>

                        {!shareLink ? (
                            <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleShare}>
                                Generate Link
                            </button>
                        ) : (
                            <div className={styles.shareLinkBox}>
                                <input
                                    type="text"
                                    value={shareLink}
                                    readOnly
                                    className={styles.shareLinkInput}
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                />
                                <button className={styles.copyBtn} onClick={handleCopyLink}>
                                    {shareCopied ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        )}

                        <button className="btn btn-ghost" style={{ width: "100%", marginTop: "var(--space-sm)" }} onClick={() => setShowShareModal(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Media Confirmation */}
            {confirmDeleteMedia && (
                <div className="modal-overlay" onClick={() => setConfirmDeleteMedia(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.shareModalTitle}>Delete File?</h2>
                        <p className={styles.shareModalDesc}>This action cannot be undone.</p>
                        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDeleteMedia(null)}>Cancel</button>
                            <button className={styles.dangerBtn} style={{ flex: 1 }} onClick={() => handleDeleteMedia(confirmDeleteMedia)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Folder Confirmation */}
            {confirmDeleteFolder && (
                <div className="modal-overlay" onClick={() => setConfirmDeleteFolder(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.shareModalTitle}>Delete Folder?</h2>
                        <p className={styles.shareModalDesc}>
                            This will permanently delete <strong>{folder?.name}</strong> and all {media?.length || 0} files inside it.
                        </p>
                        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDeleteFolder(false)}>Cancel</button>
                            <button className={styles.dangerBtn} style={{ flex: 1 }} onClick={handleDeleteFolder}>Delete Everything</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
