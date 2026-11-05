import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget).entries()));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("complaints")
      .insert({ ...parsed.data, category, priority, vendor_id: u.user!.id })
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
          <Input id="title" name="title" placeholder="e.g. County askaris confiscated my goods" required />
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
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/complaints" })}>
            Cancel
          </Button>
          <Button type="submit" variant="warm" disabled={busy}>
            Submit complaint
          </Button>
        </div>
      </form>
    </div>
  );
}
