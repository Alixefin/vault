"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
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

    const [previewItem, setPreviewItem] = useState<any>(null);

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
                    {media && media.length > 0 && (
                        <button id="download-all-btn" className={styles.downloadAllBtn} onClick={handleDownloadAll}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Save All
                        </button>
                    )}
                </div>
                <div className={styles.folderHeader}>
                    <h1 className={styles.folderName}>{folder?.name || "..."}</h1>
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
                            onClick={() => setPreviewItem(item)}
                        >
                            <div className={styles.mediaThumb}>
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
                                <p className={styles.mediaName}>{item.fileName}</p>
                                <p className={styles.mediaSize}>{formatSize(item.size)}</p>
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
        </div>
    );
}
