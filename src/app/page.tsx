"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styles from "./page.module.css";

export default function HomePage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [existingFolders, setExistingFolders] = useState<any[]>([]);
  const [mode, setMode] = useState<"create" | "access">("create");

  // Access mode state
  const [accessName, setAccessName] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessFolders, setAccessFolders] = useState<any[]>([]);
  const [accessError, setAccessError] = useState("");
  const [accessStep, setAccessStep] = useState<"search" | "password">("search");
  const [selectedFolder, setSelectedFolder] = useState<any>(null);

  const router = useRouter();
  const createFolder = useMutation(api.folders.create);
  const verifyFolderPassword = useMutation(api.folders.verifyFolderPassword);
  const checkName = useQuery(
    api.folders.checkName,
    name.trim().length > 0 ? { name: name.trim() } : "skip"
  );
  const searchFolders = useQuery(
    api.folders.searchByName,
    accessName.trim().length > 0 ? { name: accessName.trim() } : "skip"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsChecking(true);

    try {
      if (checkName && checkName.length > 0) {
        setExistingFolders(checkName);
        setShowConflict(true);
        setIsChecking(false);
        return;
      }

      const folderId = await createFolder({
        name: name.trim(),
        password: password.trim() || undefined,
      });
      router.push(`/upload/${folderId}`);
    } catch (error) {
      console.error("Error:", error);
      setIsChecking(false);
    }
  };

  const handleUseExisting = (folderId: string) => {
    router.push(`/upload/${folderId}`);
  };

  const handleCreateNew = async () => {
    try {
      const folderId = await createFolder({
        name: name.trim(),
        password: password.trim() || undefined,
      });
      router.push(`/upload/${folderId}`);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSearchFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessName.trim()) return;
    setAccessError("");

    if (searchFolders && searchFolders.length > 0) {
      if (searchFolders.length === 1) {
        const folder = searchFolders[0];
        if (folder.hasPassword) {
          setSelectedFolder(folder);
          setAccessStep("password");
        } else {
          router.push(`/upload/${folder._id}`);
        }
      } else {
        setAccessFolders(searchFolders);
      }
    } else {
      setAccessError("No folder found with that name");
    }
  };

  const handleAccessFolder = async (folder: any) => {
    if (folder.hasPassword) {
      setSelectedFolder(folder);
      setAccessStep("password");
      setAccessPassword("");
    } else {
      router.push(`/upload/${folder._id}`);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder || !accessPassword.trim()) return;
    setAccessError("");

    try {
      const valid = await verifyFolderPassword({
        folderId: selectedFolder._id,
        password: accessPassword.trim(),
      });
      if (valid) {
        router.push(`/upload/${selectedFolder._id}`);
      } else {
        setAccessError("Incorrect password");
      }
    } catch {
      setAccessError("Something went wrong");
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero section with dark background */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.brand}>Media Vault.</h1>

          {/* Decorative waves */}
          <div className={styles.waves}>
            <div className={`${styles.wave} ${styles.wave1}`} />
            <div className={`${styles.wave} ${styles.wave2}`} />
            <div className={`${styles.wave} ${styles.wave3}`} />
            <div className={`${styles.wave} ${styles.wave4}`} />
          </div>
        </div>

        {/* Bottom card */}
        <div className={styles.bottomCard}>
          {/* Mode Toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === "create" ? styles.modeBtnActive : ""}`}
              onClick={() => {
                setMode("create");
                setAccessError("");
                setAccessStep("search");
                setAccessFolders([]);
              }}
            >
              Create Folder
            </button>
            <button
              className={`${styles.modeBtn} ${mode === "access" ? styles.modeBtnActive : ""}`}
              onClick={() => {
                setMode("access");
                setAccessError("");
                setAccessStep("search");
                setAccessFolders([]);
              }}
            >
              Access Folder
            </button>
          </div>

          {mode === "create" ? (
            <>
              <h2 className={styles.cardTitle}>
                The easiest way to
                <br />
                store your media
              </h2>
              <p className={styles.cardSubtitle}>
                Secure media vault to upload and organize your files
              </p>

              <form className={styles.form} onSubmit={handleSubmit}>
                <input
                  id="name-input"
                  type="text"
                  className={styles.nameInput}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter folder name..."
                  autoComplete="off"
                  autoFocus
                />

                <input
                  id="password-input"
                  type="password"
                  className={styles.nameInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set password (optional)"
                  autoComplete="off"
                />

                <button
                  id="continue-btn"
                  type="submit"
                  className={styles.getStartedBtn}
                  disabled={!name.trim() || isChecking}
                >
                  {isChecking ? (
                    <>
                      <span className={styles.spinner} />
                      Checking...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className={styles.cardTitle}>
                Access your
                <br />
                media folder
              </h2>
              <p className={styles.cardSubtitle}>
                Search for your folder by name
              </p>

              {accessStep === "search" ? (
                <form className={styles.form} onSubmit={handleSearchFolder}>
                  <input
                    type="text"
                    className={styles.nameInput}
                    value={accessName}
                    onChange={(e) => setAccessName(e.target.value)}
                    placeholder="Enter folder name..."
                    autoComplete="off"
                    autoFocus
                  />
                  {accessError && (
                    <p className={styles.accessError}>{accessError}</p>
                  )}

                  {accessFolders.length > 0 && (
                    <div className={styles.accessFolderList}>
                      {accessFolders.map((folder) => (
                        <button
                          key={folder._id}
                          className={styles.accessFolderItem}
                          onClick={() => handleAccessFolder(folder)}
                          type="button"
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M2 4a2 2 0 012-2h3l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="#111" strokeWidth="1.5" />
                          </svg>
                          <span>{folder.name}</span>
                          {folder.hasPassword && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="#999" strokeWidth="1.2" />
                              <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#999" strokeWidth="1.2" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.getStartedBtn}
                    disabled={!accessName.trim()}
                  >
                    Search
                  </button>
                </form>
              ) : (
                <form className={styles.form} onSubmit={handleVerifyPassword}>
                  <div className={styles.accessingFolder}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="3" y="8" width="12" height="8" rx="2" stroke="#111" strokeWidth="1.5" />
                      <path d="M6 8V6a3 3 0 116 0v2" stroke="#111" strokeWidth="1.5" />
                    </svg>
                    <span>{selectedFolder?.name}</span>
                  </div>
                  <input
                    type="password"
                    className={styles.nameInput}
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    placeholder="Enter folder password..."
                    autoComplete="off"
                    autoFocus
                  />
                  {accessError && (
                    <p className={styles.accessError}>{accessError}</p>
                  )}
                  <button
                    type="submit"
                    className={styles.getStartedBtn}
                    disabled={!accessPassword.trim()}
                  >
                    Unlock Folder
                  </button>
                  <button
                    type="button"
                    className={styles.backToSearchBtn}
                    onClick={() => {
                      setAccessStep("search");
                      setAccessError("");
                      setAccessPassword("");
                    }}
                  >
                    Back to search
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Conflict Modal */}
      {showConflict && (
        <div className="modal-overlay" onClick={() => setShowConflict(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="12" stroke="#111" strokeWidth="2" />
                  <path d="M14 8v8" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="14" cy="20" r="1.2" fill="#111" />
                </svg>
              </div>
              <h2>Name Already Exists</h2>
              <p className={styles.modalDesc}>
                A folder with the name <strong>&quot;{name}&quot;</strong>{" "}
                already exists. What would you like to do?
              </p>
            </div>

            <div className={styles.modalActions}>
              {existingFolders.map((folder) => (
                <button
                  key={folder._id}
                  id={`use-existing-${folder._id}`}
                  className={`btn btn-secondary ${styles.modalBtn}`}
                  onClick={() => handleUseExisting(folder._id)}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M2 4a2 2 0 012-2h3.5l2 2H14a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  Use Existing Folder
                </button>
              ))}

              <button
                id="create-new-btn"
                className={`btn btn-primary ${styles.modalBtn}`}
                onClick={handleCreateNew}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M9 3v12m-6-6h12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Create New Folder
              </button>
            </div>

            <button
              className={`btn btn-ghost ${styles.cancelBtn}`}
              onClick={() => setShowConflict(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
