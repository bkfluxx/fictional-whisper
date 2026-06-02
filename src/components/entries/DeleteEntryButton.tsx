"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
    router.push("/journal");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-foreground/30 hover:text-red-400 transition-colors min-h-[44px] flex items-center"
      >
        Delete
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6 animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" className="bg-card border border-foreground/15 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <p className="text-sm font-medium text-foreground mb-1">Delete this entry?</p>
            <p className="text-xs text-foreground/50 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-sm py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 text-sm py-2 bg-foreground/8 hover:bg-foreground/15 text-foreground rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
