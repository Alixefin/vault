"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import styles from "./page.module.css";

export default function AdminPage() {
    const [search, setSearch] = useState("");
    const folders = useQuery(api.folders.list);

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
                <Link href="/" className={styles.homeBtn}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path
                            d="M2 7l7-5 7 5v8a1 1 0 01-1 1h-4v-5H7v5H3a1 1 0 01-1-1V7z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </svg>
                </Link>
            </header>

            {/* Search */}
            <div className={styles.searchWrap}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.searchIcon}>
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                        <Link
                            key={folder._id}
                            href={`/admin/${folder._id}`}
                            className={styles.folderCard}
                            style={{ animationDelay: `${index * 0.04}s` }}
                        >
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
                                <h3 className={styles.folderName}>{folder.name}</h3>
                                <span className={styles.folderStats}>
                                    {folder.mediaCount} file{folder.mediaCount !== 1 ? "s" : ""}{" "}
                                    · {formatDate(folder.createdAt)}
                                </span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.arrow}>
                                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
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
        </div>
    );
}
