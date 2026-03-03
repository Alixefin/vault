"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import styles from "./page.module.css";

export default function SharePage() {
    const params = useParams();
    const token = params.token as string;

    const shareData = useQuery(api.sharing.getShareData, { token });

    const isViewOnly = shareData?.permission === "view";

    // Screenshot/right-click prevention for view-only
    useEffect(() => {
        if (!isViewOnly) return;

        const preventContext = (e: MouseEvent) => e.preventDefault();
        const preventKeys = (e: KeyboardEvent) => {
            // Prevent PrintScreen, Ctrl+P, Ctrl+S, Ctrl+Shift+S
            if (
                e.key === "PrintScreen" ||
                (e.ctrlKey && e.key === "p") ||
                (e.ctrlKey && e.key === "s") ||
                (e.ctrlKey && e.shiftKey && e.key === "s")
            ) {
                e.preventDefault();
            }
        };

        document.addEventListener("contextmenu", preventContext);
        document.addEventListener("keydown", preventKeys);

        return () => {
            document.removeEventListener("contextmenu", preventContext);
            document.removeEventListener("keydown", preventKeys);
        };
    }, [isViewOnly]);

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

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    if (shareData === undefined) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading shared content...</p>
                </div>
            </div>
        );
    }

    if (shareData === null) {
        return (
            <div className={styles.page}>
                <div className={styles.notFound}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="20" stroke="#ccc" strokeWidth="2" />
                        <path d="M16 16l16 16m0-16L16 32" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <h2>Link Not Found</h2>
                    <p>This share link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.page} ${isViewOnly ? styles.viewOnly : ""}`}>
            {/* View-only overlay for screenshot prevention */}
            {isViewOnly && <div className={styles.screenshotGuard} />}

            {/* Header */}
            <header className={styles.header}>
                <div>
                    <div className={styles.shareLabel}>
                        {isViewOnly ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="7" cy="7" r="5.5" stroke="#666" strokeWidth="1.2" />
                                    <circle cx="7" cy="7" r="2" fill="#666" />
                                </svg>
                                View Only
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M7 1v8m0 0L4 6m3 3l3-3M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                View &amp; Save
                            </>
                        )}
                    </div>
                    <h1 className={styles.folderName}>{shareData.folder.name}</h1>
                    <p className={styles.mediaCount}>
                        {shareData.media.length} file{shareData.media.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </header>

            {/* Media Grid */}
            <div className={styles.mediaGrid}>
                {shareData.media.map((item: any, index: number) => (
                    <div
                        key={item._id}
                        className={styles.mediaCard}
                        style={{ animationDelay: `${index * 0.04}s` }}
                    >
                        <div className={styles.mediaThumb}>
                            {item.type === "image" && item.url ? (
                                <img
                                    src={item.url}
                                    alt={item.fileName}
                                    loading="lazy"
                                    draggable={!isViewOnly ? undefined : false}
                                />
                            ) : (
                                <div className={styles.videoPlaceholder}>
                                    {item.url && (
                                        <video
                                            src={item.url}
                                            controls={!isViewOnly}
                                            controlsList={isViewOnly ? "nodownload" : undefined}
                                            preload="metadata"
                                        />
                                    )}
                                    {!isViewOnly || !item.url ? (
                                        <div className={styles.playIcon}>
                                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                                <circle cx="14" cy="14" r="12" fill="rgba(0,0,0,0.5)" />
                                                <polygon points="11,9 11,19 20,14" fill="white" />
                                            </svg>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div className={styles.mediaMeta}>
                            <div className={styles.mediaInfo}>
                                <p className={styles.mediaName}>{item.fileName}</p>
                                <p className={styles.mediaSize}>{formatSize(item.size)}</p>
                            </div>
                            {!isViewOnly && item.url && (
                                <button
                                    className={styles.downloadBtn}
                                    onClick={() => handleDownload(item.url, item.fileName)}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Branding */}
            <div className={styles.branding}>
                <span>Shared via Media Vault</span>
            </div>
        </div>
    );
}
