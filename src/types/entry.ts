/** A decrypted entry as returned from the API. */
export interface DecryptedEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  entryDate: string;
  title: string | null;
  body: string;
  mood: string | null;
  tags: { id: string; name: string }[];
}

/** Minimal entry data for list views — body is not included. */
export interface EntryStub {
  id: string;
  createdAt: string;
  updatedAt: string;
  entryDate: string;
  title: string | null;
  mood: string | null;
  tags: { id: string; name: string }[];
}

/** Payload for creating or updating an entry. */
export interface EntryPayload {
  title?: string;
  body: string;
  entryDate?: string; // ISO date string
  mood?: string;
  tags?: string[]; // tag names
}
