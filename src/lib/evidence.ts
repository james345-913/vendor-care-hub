export const EVIDENCE_BUCKET = "complaint-evidence";
export const MAX_EVIDENCE_PHOTOS = 5;
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export type EvidenceFile = { name: string; size: number; type: string };

/** Returns an error message for a set of photos, or null when they are all acceptable. */
export function validateEvidence(files: EvidenceFile[]): string | null {
  if (files.length > MAX_EVIDENCE_PHOTOS) return `You can attach up to ${MAX_EVIDENCE_PHOTOS} photos`;
  for (const f of files) {
    if (!f.type.startsWith("image/")) return `"${f.name}" is not a photo`;
    if (f.size > MAX_EVIDENCE_BYTES) return `"${f.name}" is larger than 10 MB`;
  }
  return null;
}

/** Storage path for a vendor's photo; the first folder must be the vendor's id. */
export function evidencePath(userId: string, fileName: string, id: string): string {
  const ext = (fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${userId}/${id}.${ext}`;
}
