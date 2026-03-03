"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import styles from "./page.module.css";

interface FileItem {
    file: File;
    id: string;
    preview: string;
    type: "image" | "video";
    progress: number;
    status: "pending" | "uploading" | "done" | "error";
}

type UploadPhase = "select" | "uploading" | "notification" | "processing" | "done";

export default function UploadPage() {
    const params = useParams();
    const router = useRouter();
    const folderId = params.folderId as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<FileItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [phase, setPhase] = useState<UploadPhase>("select");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showNotification, setShowNotification] = useState(false);

    const folder = useQuery(api.folders.get, {
        folderId: folderId as Id<"folders">,
    });
    const generateUploadUrl = useMutation(api.media.generateUploadUrl);
    const saveFile = useMutation(api.media.saveFile);

    // Auto-redirect after done
    useEffect(() => {
        if (phase === "done") {
            const timer = setTimeout(() => router.push("/"), 3500);
            return () => clearTimeout(timer);
        }
    }, [phase, router]);

    const getFileType = (file: File): "image" | "video" => {
        return file.type.startsWith("video/") ? "video" : "image";
    };

    const addFiles = useCallback((newFiles: File[]) => {
        const validFiles = newFiles.filter(
            (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
        );

        const fileItems: FileItem[] = validFiles.map((file) => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            preview: URL.createObjectURL(file),
            type: getFileType(file),
            progress: 0,
            status: "pending" as const,
        }));

        setFiles((prev) => [...prev, ...fileItems]);
    }, []);

    const removeFile = (id: string) => {
        setFiles((prev) => {
            const file = prev.find((f) => f.id === id);
            if (file) URL.revokeObjectURL(file.preview);
            return prev.filter((f) => f.id !== id);
        });
    };

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(Array.from(e.dataTransfer.files));
        },
        [addFiles]
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setPhase("uploading");
        const total = files.length;
        let completed = 0;

        for (const fileItem of files) {
            try {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileItem.id ? { ...f, status: "uploading" as const } : f
                    )
                );

                const uploadUrl = await generateUploadUrl();

                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": fileItem.file.type },
                    body: fileItem.file,
                });

                const { storageId } = await result.json();

                await saveFile({
                    folderId: folderId as Id<"folders">,
                    storageId,
                    fileName: fileItem.file.name,
                    type: fileItem.type,
                    size: fileItem.file.size,
                });

                completed++;
                setUploadProgress(Math.round((completed / total) * 100));

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileItem.id
                            ? { ...f, status: "done" as const, progress: 100 }
                            : f
                    )
                );
            } catch (error) {
                console.error("Upload error:", error);
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === fileItem.id ? { ...f, status: "error" as const } : f
                    )
                );
                completed++;
                setUploadProgress(Math.round((completed / total) * 100));
            }
        }

        // Show notification that upload is complete
        setPhase("notification");
        setShowNotification(true);

        // After showing notification, move to processing
        setTimeout(() => {
            setShowNotification(false);
            setPhase("processing");
        }, 2500);

        // After processing, show done
        setTimeout(() => {
            setPhase("done");
        }, 5500);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    // === Processing / Done Screens ===
    if (phase === "notification" || phase === "processing" || phase === "done") {
        return (
            <div className={styles.fullScreen}>
                {/* Notification toast */}
                {showNotification && (
                    <div className={styles.toast}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="1.5" />
                            <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Upload complete! Processing started...
                    </div>
                )}

                <div className={styles.phaseContent}>
                    {phase === "notification" && (
                        <>
                            <div className={styles.successIcon}>
                                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                    <circle cx="32" cy="32" r="28" stroke="#111" strokeWidth="2.5" />
                                    <path d="M20 32l8 8 16-16" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.checkDraw} />
                                </svg>
                            </div>
                            <h2 className={styles.phaseTitle}>Upload Complete!</h2>
                            <p className={styles.phaseDesc}>
                                {files.length} file{files.length !== 1 ? "s" : ""} uploaded
                                successfully. Starting processing...
                            </p>
                        </>
                    )}

                    {phase === "processing" && (
                        <>
                            <div className={styles.processingRings}>
                                <div className={styles.ring1} />
                                <div className={styles.ring2} />
                                <div className={styles.ring3} />
                                <div className={styles.ringCenter}>
                                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                        <path d="M14 4v8l4 4" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className={styles.phaseTitle}>Processing Media</h2>
                            <p className={styles.phaseDesc}>
                                Training algorithm on your uploaded content...
                            </p>
                            <div className={styles.progressTrack}>
                                <div className={styles.progressFill} />
                            </div>
                        </>
                    )}

                    {phase === "done" && (
                        <>
                            <div className={styles.doneIcon}>
                                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                                    <circle cx="36" cy="36" r="32" stroke="#2ecc71" strokeWidth="2.5" />
                                    <path d="M22 36l10 10 18-18" stroke="#2ecc71" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={styles.checkDraw} />
                                </svg>
                            </div>
                            <h2 className={styles.phaseTitle}>All Done!</h2>
                            <p className={styles.phaseDesc}>
                                {files.length} file{files.length !== 1 ? "s" : ""} processed
                                and saved
                            </p>
                            <p className={styles.redirectText}>Redirecting to homepage...</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // === Uploading Screen ===
    if (phase === "uploading") {
        return (
            <div className={styles.fullScreen}>
                <div className={styles.phaseContent}>
                    <div className={styles.uploadCircle}>
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="44" stroke="#eee" strokeWidth="4" fill="none" />
                            <circle
                                cx="50"
                                cy="50"
                                r="44"
                                stroke="#111"
                                strokeWidth="4"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${uploadProgress * 2.76} 276`}
                                transform="rotate(-90 50 50)"
                                className={styles.progressRing}
                            />
                        </svg>
                        <span className={styles.progressPercent}>{uploadProgress}%</span>
                    </div>
                    <h2 className={styles.phaseTitle}>Uploading</h2>
                    <p className={styles.phaseDesc}>
                        {files.length} file{files.length !== 1 ? "s" : ""}...
                    </p>
                </div>
            </div>
        );
    }

    // === Upload Selection Screen ===
    return (
        <div className={styles.page}>
            {/* Dark header area */}
            <div className={styles.darkHeader}>
                <div className={styles.headerRow}>
                    <button className={styles.backBtn} onClick={() => router.push("/")}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M16 10H4m0 0l5-5m-5 5l5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span className={styles.headerTitle}>Tap, Upload, Share</span>
                    <div style={{ width: 36 }} />
                </div>
                <p className={styles.headerSub}>Your Gateway to Easy Sharing</p>

                {/* Concentric circles with upload icon */}
                <div
                    className={styles.uploadOrb}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className={styles.orbRing3} />
                    <div className={styles.orbRing2} />
                    <div className={styles.orbRing1} />
                    <div className={styles.orbCenter}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <path d="M14 22V6m0 0l-5 5m5-5l5 5" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                />
            </div>

            {/* Drop zone overlay */}
            <div
                className={`${styles.dropOverlay} ${isDragging ? styles.dropActive : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className={styles.dropLabel}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M16 24V8m0 0l-6 6m6-6l6 6" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Drop files here</span>
                    </div>
                )}
            </div>

            {/* Bottom section — white */}
            <div className={styles.bottomSection}>
                {files.length === 0 ? (
                    <div className={styles.categoryGrid}>
                        <h3 className={styles.categoryTitle}>Upload New</h3>
                        <div className={styles.categories}>
                            <button
                                className={styles.catBtn}
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.accept = "image/*";
                                        fileInputRef.current.click();
                                    }
                                }}
                            >
                                <div className={styles.catIcon}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#111" strokeWidth="1.5" />
                                        <circle cx="8.5" cy="8.5" r="2" stroke="#111" strokeWidth="1.5" />
                                        <path d="M3 16l5-5 4 4 3-3 6 6" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span>Image</span>
                            </button>

                            <button
                                className={styles.catBtn}
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.accept = "video/*";
                                        fileInputRef.current.click();
                                    }
                                }}
                            >
                                <div className={styles.catIcon}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <rect x="2" y="4" width="20" height="16" rx="3" stroke="#111" strokeWidth="1.5" />
                                        <polygon points="10,8 10,16 16,12" stroke="#111" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span>Video</span>
                            </button>

                            <button
                                className={styles.catBtn}
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.accept = "image/*,video/*";
                                        fileInputRef.current.click();
                                    }
                                }}
                            >
                                <div className={styles.catIcon}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M4 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" stroke="#111" strokeWidth="1.5" />
                                    </svg>
                                </div>
                                <span>All Files</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.fileSection}>
                        <div className={styles.fileSectionHeader}>
                            <h3>
                                {files.length} file{files.length !== 1 ? "s" : ""} selected
                            </h3>
                            <span className={styles.totalSize}>
                                {formatSize(files.reduce((sum, f) => sum + f.file.size, 0))}
                            </span>
                        </div>

                        <div className={styles.fileList}>
                            {files.map((fileItem) => (
                                <div key={fileItem.id} className={styles.fileCard}>
                                    <div className={styles.filePreview}>
                                        {fileItem.type === "image" ? (
                                            <img src={fileItem.preview} alt={fileItem.file.name} />
                                        ) : (
                                            <div className={styles.videoThumb}>
                                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                    <polygon points="6,3 6,17 17,10" fill="#999" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.fileMeta}>
                                        <p className={styles.fileName}>{fileItem.file.name}</p>
                                        <p className={styles.fileSize}>
                                            {formatSize(fileItem.file.size)} · {fileItem.type}
                                        </p>
                                    </div>
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => removeFile(fileItem.id)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            id="upload-btn"
                            className={styles.uploadActionBtn}
                            onClick={handleUpload}
                        >
                            Upload {files.length} File{files.length !== 1 ? "s" : ""}
                        </button>
                    </div>
                )}

                {/* Folder info */}
                <div className={styles.folderTag}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4a1 1 0 011-1h2.5l1.5 1.5H11a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="#999" strokeWidth="1" />
                    </svg>
                    Saving to: <strong>{folder?.name || "..."}</strong>
                </div>
            </div>
        </div>
    );
}
