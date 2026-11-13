import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, X } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type ComplaintCategory,
  type ComplaintPriority,
} from "@/lib/labels";
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_BUCKET,
  MAX_EVIDENCE_PHOTOS,
  evidencePath,
  validateEvidence,
} from "@/lib/evidence";

export const Route = createFileRoute("/_authenticated/complaints/new")({
  head: () => ({ meta: [{ title: "Report a problem — Market Guard" }] }),
  component: NewComplaint,
});

const schema = z.object({
  title: z.string().trim().min(3, "Give it a short title").max(150),
  description: z.string().trim().min(10, "Describe what happened (at least 10 characters)").max(4000),
  location: z.string().trim().max(150),
});

function NewComplaint() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [category, setCategory] = useState<ComplaintCategory>("other");
  const [priority, setPriority] = useState<ComplaintPriority>("normal");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  function onPickPhotos(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const next = [...photos, ...picked];
    const err = validateEvidence(next);
    if (err) { toast.error(err); return; }
    setPhotos(next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget).entries()));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    const photoErr = validateEvidence(photos);
    if (photoErr) { toast.error(photoErr); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user!.id;
    const evidence_paths: string[] = [];
    for (const file of photos) {
      const path = evidencePath(userId, file.name, crypto.randomUUID());
      const { error: upErr } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setBusy(false);
        if (evidence_paths.length) await supabase.storage.from(EVIDENCE_BUCKET).remove(evidence_paths);
        toast.error(`Could not upload "${file.name}": ${upErr.message}`);
        return;
      }
      evidence_paths.push(path);
    }
    const { data, error } = await supabase
      .from("complaints")
      .insert({ ...parsed.data, category, priority, vendor_id: userId, evidence_paths })
      .select("id, reference_no")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Complaint ${data.reference_no} submitted`);
    await qc.invalidateQueries({ queryKey: ["complaints"] });
    navigate({ to: "/complaints/$id", params: { id: data.id } });
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Report a problem"
        subtitle="Officials will review it and keep you updated here."
      />
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-soft">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="e.g. My goods were confiscated at Mbarara Central Market" required />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>How urgent?</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ComplaintPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Where did it happen?</Label>
          <Input id="location" name="location" placeholder="Market, street or stall number" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">What happened?</Label>
          <Textarea
            id="description"
            name="description"
            rows={6}
            placeholder="Include dates, names and anything that helps officials act."
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Photo evidence (optional)</Label>
          <p className="text-sm text-muted-foreground">
            Add up to {MAX_EVIDENCE_PHOTOS} photos — for example damaged goods, a receipt or the scene.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept={EVIDENCE_ACCEPT}
            multiple
            className="hidden"
            onChange={onPickPhotos}
            aria-label="Add photos"
          />
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={src} className="relative h-24 w-24 overflow-hidden rounded-xl border bg-muted">
                <img src={src} alt={`Evidence photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_EVIDENCE_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Camera className="h-5 w-5" />
                Add photo
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/complaints" })}>
            Cancel
          </Button>
          <Button type="submit" variant="warm" disabled={busy}>
            {busy ? (photos.length ? "Uploading photos…" : "Submitting…") : "Submit complaint"}
          </Button>
        </div>
      </form>
    </div>
  );
}
