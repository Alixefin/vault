"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import styles from "./page.module.css";

export default function SharePage() {
    const params = useParams();
    const token = params.token as string;

    const shareData = useQuery(api.sharing.getShareData, { token });
    const verifySharePassword = useMutation(api.sharing.verifySharePassword);
    const markShareViewed = useMutation(api.sharing.markShareViewed);

    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [unlockedData, setUnlockedData] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [hasMarkedViewed, setHasMarkedViewed] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Determine what data to display
    const displayData = unlockedData || shareData;
    const isViewOnly = displayData?.permission === "view";
    const isExpired = shareData?.isExpired;
    const requiresPassword = shareData?.requiresPassword && !unlockedData;

    // Mark view-once as viewed for non-password-protected links
    useEffect(() => {
        if (
            shareData &&
            !shareData.isExpired &&
            !shareData.requiresPassword &&
            shareData.viewOnce &&
            !hasMarkedViewed
        ) {
            markShareViewed({ token });
            setHasMarkedViewed(true);
        }
    }, [shareData, token, hasMarkedViewed, markShareViewed]);

    // Screenshot/right-click prevention for view-only
    useEffect(() => {
        if (!isViewOnly) return;

        const preventContext = (e: MouseEvent) => e.preventDefault();
        const preventKeys = (e: KeyboardEvent) => {
            if (
                e.key === "PrintScreen" ||
                (e.ctrlKey && e.key === "p") ||
                (e.ctrlKey && e.key === "s") ||
                (e.ctrlKey && e.shiftKey && e.key === "s") ||
                (e.ctrlKey && e.shiftKey && e.key === "i")
            ) {
                e.preventDefault();
            }
        };

        // Blur content when tab loses focus (deters screenshot tools)
        const handleVisibility = () => {
            if (document.hidden) {
                setIsBlurred(true);
            } else {
                // Slight delay before unblurring
                setTimeout(() => setIsBlurred(false), 300);
            }
        };

        const handleBlur = () => setIsBlurred(true);
        const handleFocus = () => setTimeout(() => setIsBlurred(false), 300);

        document.addEventListener("contextmenu", preventContext);
        document.addEventListener("keydown", preventKeys);
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("contextmenu", preventContext);
            document.removeEventListener("keydown", preventKeys);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("focus", handleFocus);
        };
    }, [isViewOnly]);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;
        setPasswordError("");
        setIsVerifying(true);

        try {
            const result = await verifySharePassword({
                token,
                password: password.trim(),
            });
            if (result.success && result.data) {
                setUnlockedData(result.data);
            } else {
                setPasswordError(result.error || "Incorrect password");
            }
        } catch {
            setPasswordError("Something went wrong");
        }
        setIsVerifying(false);
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

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    // Loading state
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

    // Not found
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

    // Expired (view-once already viewed)
    if (isExpired) {
        return (
            <div className={styles.page}>
                <div className={styles.notFound}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="20" stroke="#ccc" strokeWidth="2" />
                        <path d="M24 14v12" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="24" cy="32" r="1.5" fill="#ccc" />
                    </svg>
                    <h2>Link Expired</h2>
                    <p>This was a view-once link and has already been viewed.</p>
                </div>
            </div>
        );
    }

    // Password gate
    if (requiresPassword) {
        return (
            <div className={styles.page}>
                <div className={styles.passwordGate}>
                    <div className={styles.passwordIcon}>
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                            <rect x="6" y="18" width="28" height="18" rx="4" stroke="#111" strokeWidth="2.5" />
                            <path d="M12 18V14a8 8 0 1116 0v4" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="20" cy="28" r="2.5" fill="#111" />
                        </svg>
                    </div>
                    <h2>Password Protected</h2>
                    <p>This shared content requires a password to view.</p>
                    {shareData.viewOnce && (
                        <div className={styles.viewOnceBadge}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                                <path d="M6 3v4l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            </svg>
                            View Once — link expires after viewing
                        </div>
                    )}
                    <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
                        <input
                            type="password"
                            className={styles.passwordInput}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            autoComplete="off"
                            autoFocus
                        />
                        {passwordError && (
                            <p className={styles.passwordError}>{passwordError}</p>
                        )}
                        <button
                            type="submit"
                            className={styles.passwordSubmitBtn}
                            disabled={!password.trim() || isVerifying}
                        >
                            {isVerifying ? "Verifying..." : "Unlock"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // If we still don't have media data, show loading
    if (!displayData?.media) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading shared content...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.page} ${isViewOnly ? styles.viewOnly : ""} ${isBlurred ? styles.blurred : ""}`} ref={contentRef}>
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
                    <h1 className={styles.folderName}>{displayData.folder.name}</h1>
                    <p className={styles.mediaCount}>
                        {displayData.media.length} file{displayData.media.length !== 1 ? "s" : ""}
                        {displayData.viewOnce && (
                            <span className={styles.viewOnceTag}> · View Once</span>
                        )}
                    </p>
                </div>
            </header>

            {/* Media Grid */}
            <div className={styles.mediaGrid}>
                {displayData.media.map((item: any, index: number) => (
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
