"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import styles from "./page.module.css";

export default function HomePage() {
  const [name, setName] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [existingFolders, setExistingFolders] = useState<any[]>([]);

  const router = useRouter();
  const createFolder = useMutation(api.folders.create);
  const checkName = useQuery(
    api.folders.checkName,
    name.trim().length > 0 ? { name: name.trim() } : "skip"
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

      const folderId = await createFolder({ name: name.trim() });
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
      const folderId = await createFolder({ name: name.trim() });
      router.push(`/upload/${folderId}`);
    } catch (error) {
      console.error("Error:", error);
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
              placeholder="Enter your name..."
              autoComplete="off"
              autoFocus
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
