"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import styles from "./page.module.css";

function AdminLoginGate({ onAuth }: { onAuth: () => void }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const verifyPassword = useMutation(api.admin.verifyPassword);
    const initPassword = useMutation(api.admin.initPassword);

    useEffect(() => {
        initPassword();
    }, [initPassword]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;
        setLoading(true);
        setError("");
        try {
            const valid = await verifyPassword({ password: password.trim() });
            if (valid) {
                sessionStorage.setItem("vault_admin_auth", "true");
                onAuth();
            } else {
                setError("Incorrect password");
            }
        } catch {
            setError("Something went wrong");
        }
        setLoading(false);
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginCard}>
                <div className={styles.lockIcon}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="6" y="14" width="20" height="14" rx="3" stroke="#111" strokeWidth="2" />
                        <path d="M10 14V10a6 6 0 1112 0v4" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <h1 className={styles.loginTitle}>Admin Access</h1>
                <p className={styles.loginDesc}>Enter admin password to continue</p>
                <form onSubmit={handleSubmit} className={styles.loginForm}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password..."
                        className={styles.loginInput}
                        autoFocus
                    />
                    {error && <p className={styles.loginError}>{error}</p>}
                    <button type="submit" className={styles.loginBtn} disabled={loading || !password.trim()}>
                        {loading ? "Verifying..." : "Unlock"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [search, setSearch] = useState("");
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState<string | null>(null);
    const [oldPw, setOldPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [pwMsg, setPwMsg] = useState("");
    const [resetPw, setResetPw] = useState("");
    const [resetMsg, setResetMsg] = useState("");
    const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);

    const folders = useQuery(api.folders.list);
    const changePassword = useMutation(api.admin.changePassword);
    const resetFolderPassword = useMutation(api.folders.resetFolderPassword);
    const deleteFolderMutation = useMutation(api.folders.deleteFolder);

    useEffect(() => {
        if (sessionStorage.getItem("vault_admin_auth") === "true") {
            setIsAuthed(true);
        }
    }, []);

    if (!isAuthed) {
        return <AdminLoginGate onAuth={() => setIsAuthed(true)} />;
    }

    const filteredFolders = folders?.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwMsg("");
        const result = await changePassword({
            oldPassword: oldPw,
            newPassword: newPw,
        });
        if (result.success) {
            setPwMsg("Password changed successfully!");
            setOldPw("");
            setNewPw("");
            setTimeout(() => setShowChangePassword(false), 1500);
        } else {
            setPwMsg(result.error || "Failed to change password");
        }
    };

    const handleResetFolderPassword = async (folderId: string) => {
        setResetMsg("");
        await resetFolderPassword({
            folderId: folderId as any,
            newPassword: resetPw.trim() || undefined,
        });
        setResetMsg(resetPw.trim() ? "Password updated!" : "Password removed!");
        setResetPw("");
        setTimeout(() => {
            setShowResetModal(null);
            setResetMsg("");
        }, 1500);
    };

    const handleLogout = () => {
        sessionStorage.removeItem("vault_admin_auth");
        setIsAuthed(false);
    };

    const handleDeleteFolder = async (folderId: string) => {
        try {
            await deleteFolderMutation({ folderId: folderId as any });
            setConfirmDeleteFolder(null);
        } catch (error) {
            console.error("Delete folder error:", error);
        }
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <span className={styles.adminLabel}>Admin Panel</span>
                    <h1 className={styles.title}>Media Vault</h1>
                    <p className={styles.subtitle}>
                        {folders
                            ? `${folders.length} folder${folders.length !== 1 ? "s" : ""}`
                            : "Loading..."}
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.iconBtn} onClick={() => setShowChangePassword(true)} title="Change Password">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <rect x="3" y="8" width="12" height="8" rx="2" stroke="#111" strokeWidth="1.5" />
                            <path d="M6 8V6a3 3 0 116 0v2" stroke="#111" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button className={styles.iconBtn} onClick={handleLogout} title="Logout">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M6 15H4a1 1 0 01-1-1V4a1 1 0 011-1h2M12 12l3-3-3-3M7 9h8" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <Link href="/" className={styles.homeBtn}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path
                                d="M2 7l7-5 7 5v8a1 1 0 01-1 1h-4v-5H7v5H3a1 1 0 01-1-1V7z"
                                stroke="#111"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                </div>
            </header>

            {/* Search */}
            <div className={styles.searchWrap}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.searchIcon}>
                    <circle cx="7" cy="7" r="5" stroke="#666" strokeWidth="1.5" />
                    <path d="M11 11l3.5 3.5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                    id="search-input"
                    type="text"
                    placeholder="Search folders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* Grid */}
            {!folders ? (
                <div className={styles.loadingGrid}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={styles.skeleton} />
                    ))}
                </div>
            ) : filteredFolders && filteredFolders.length > 0 ? (
                <div className={styles.folderGrid}>
                    {filteredFolders.map((folder, index) => (
                        <div
                            key={folder._id}
                            className={styles.folderCard}
                            style={{ animationDelay: `${index * 0.04}s` }}
                        >
                            <Link href={`/admin/${folder._id}`} className={styles.folderLink}>
                                <div className={styles.folderIcon}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"
                                            stroke="#111"
                                            strokeWidth="1.5"
                                        />
                                    </svg>
                                </div>
                                <div className={styles.folderMeta}>
                                    <h3 className={styles.folderName}>
                                        {folder.name}
                                        {folder.hasPassword && (
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={styles.lockBadge}>
                                                <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="#111" strokeWidth="1.2" />
                                                <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#111" strokeWidth="1.2" strokeLinecap="round" />
                                            </svg>
                                        )}
                                    </h3>
                                    <span className={styles.folderStats}>
                                        {folder.mediaCount} file{folder.mediaCount !== 1 ? "s" : ""}{" "}
                                        · {formatDate(folder.createdAt)}
                                    </span>
                                </div>
                            </Link>
                            {folder.hasPassword && (
                                <button
                                    className={styles.resetPwBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowResetModal(folder._id);
                                        setResetPw("");
                                        setResetMsg("");
                                    }}
                                    title="Reset Folder Password"
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M1.5 7.5a5.5 5.5 0 019.37-3.9M12.5 6.5a5.5 5.5 0 01-9.37 3.9" stroke="#666" strokeWidth="1.2" strokeLinecap="round" />
                                        <path d="M11 1v3h-3M3 13v-3h3" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            )}
                            <button
                                className={styles.deleteFolderBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteFolder(folder._id);
                                }}
                                title="Delete Folder"
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M4 4v7.5a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                </svg>
                            </button>
                            <Link href={`/admin/${folder._id}`} className={styles.arrowLink}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.arrow}>
                                    <path d="M6 3l5 5-5 5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <path
                            d="M6 12a4 4 0 014-4h8l4 4h16a4 4 0 014 4v20a4 4 0 01-4 4H10a4 4 0 01-4-4V12z"
                            stroke="#ccc"
                            strokeWidth="2"
                        />
                    </svg>
                    <h3>No folders found</h3>
                    <p>{search ? "Try a different search" : "No media uploaded yet"}</p>
                </div>
            )}

            {/* Change Password Modal */}
            {showChangePassword && (
                <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Change Admin Password</h2>
                        <form onSubmit={handleChangePassword} className={styles.modalForm}>
                            <input
                                type="password"
                                placeholder="Current password"
                                value={oldPw}
                                onChange={(e) => setOldPw(e.target.value)}
                                className={styles.modalInput}
                            />
                            <input
                                type="password"
                                placeholder="New password"
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                className={styles.modalInput}
                            />
                            {pwMsg && (
                                <p className={pwMsg.includes("success") ? styles.successMsg : styles.errorMsg}>{pwMsg}</p>
                            )}
                            <div className={styles.modalBtns}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowChangePassword(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={!oldPw || !newPw}>
                                    Change Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Folder Password Modal */}
            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Reset Folder Password</h2>
                        <p className={styles.modalDesc}>Enter a new password or leave empty to remove password protection.</p>
                        <div className={styles.modalForm}>
                            <input
                                type="text"
                                placeholder="New password (leave empty to remove)"
                                value={resetPw}
                                onChange={(e) => setResetPw(e.target.value)}
                                className={styles.modalInput}
                            />
                            {resetMsg && (
                                <p className={styles.successMsg}>{resetMsg}</p>
                            )}
                            <div className={styles.modalBtns}>
                                <button className="btn btn-ghost" onClick={() => setShowResetModal(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleResetFolderPassword(showResetModal)}
                                >
                                    {resetPw.trim() ? "Set Password" : "Remove Password"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Folder Confirmation */}
            {confirmDeleteFolder && (
                <div className="modal-overlay" onClick={() => setConfirmDeleteFolder(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Delete Folder?</h2>
                        <p className={styles.modalDesc}>
                            This will permanently delete this folder and all files inside it. This cannot be undone.
                        </p>
                        <div className={styles.modalBtns}>
                            <button className="btn btn-ghost" onClick={() => setConfirmDeleteFolder(null)}>Cancel</button>
                            <button className={styles.dangerBtn} onClick={() => handleDeleteFolder(confirmDeleteFolder)}>Delete Everything</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
