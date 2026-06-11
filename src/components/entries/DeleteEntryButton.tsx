"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPortal,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

export default function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
    router.push("/journal");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-foreground/30 hover:text-red-400 transition-colors min-h-[44px] flex items-center"
      >
        Delete
      </button>

      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="bg-card border border-foreground/15 rounded-2xl p-6 shadow-2xl">
            <DialogTitle className="mb-1">Delete this entry?</DialogTitle>
            <DialogDescription className="mb-5">This action cannot be undone.</DialogDescription>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 text-sm py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <DialogClose className="flex-1 text-sm py-2 bg-foreground/8 hover:bg-foreground/15 text-foreground rounded-xl transition-colors">
                Cancel
              </DialogClose>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
