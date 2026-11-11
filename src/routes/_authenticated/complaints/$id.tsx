import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions } from "@/hooks/use-member";
import { complaintQueryOptions } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, type ComplaintStatus } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  head: () => ({ meta: [{ title: "Complaint — Market Guard" }] }),
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(memberQueryOptions);
    const d = await context.queryClient.ensureQueryData(complaintQueryOptions(params.id));
    if (!d.complaint) throw notFound();
  },
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <p className="font-display text-xl font-bold">Complaint not found</p>
      <Link to="/complaints" className="mt-3 inline-block text-primary underline">
        Back to complaints
      </Link>
    </div>
  ),
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(memberQueryOptions);
  const { data } = useSuspenseQuery(complaintQueryOptions(id));
  const c = data.complaint!;
  const [message, setMessage] = useState("");
  const [newStatus, setNewStatus] = useState<ComplaintStatus | "keep">("keep");
  const [busy, setBusy] = useState(false);

  async function onReply(e: FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) { toast.error("Write a message first"); return; }
    if (text.length > 2000) { toast.error("Message is too long"); return; }
    setBusy(true);
    const { error } = await supabase.from("complaint_updates").insert({
      complaint_id: c.id,
      author_id: me.user.id,
      message: text,
      new_status: me.isAdmin && newStatus !== "keep" ? newStatus : null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setMessage("");
    setNewStatus("keep");
    toast.success("Update posted");
    await qc.invalidateQueries({ queryKey: ["complaints"] });
  }

  return (
    <div className="space-y-6">
      <Link to="/complaints" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All complaints
      </Link>

      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{c.reference_no}</span>
          <Badge variant={c.status}>{STATUS_LABELS[c.status]}</Badge>
          {c.priority === "high" && <Badge variant="high">{PRIORITY_LABELS.high}</Badge>}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">{c.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {CATEGORY_LABELS[c.category]} · Filed {format(new Date(c.created_at), "d MMM yyyy, h:mm a")}
        </p>
        {c.location && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-accent" /> {c.location}
          </p>
        )}
        <p className="mt-5 whitespace-pre-wrap leading-relaxed">{c.description}</p>

        {c.evidence_paths.length > 0 && <EvidenceGallery paths={c.evidence_paths} />}

        {me.isAdmin && c.vendor && (
          <div className="mt-6 rounded-xl bg-muted p-4 text-sm">
            <p className="font-semibold">
              {c.vendor.full_name} · {c.vendor.membership_number}
            </p>
            <p className="text-muted-foreground">
              {c.vendor.market_location}
              {c.vendor.stall_number ? `, stall ${c.vendor.stall_number}` : ""}
            </p>
            {c.vendor.phone && (
              <a href={`tel:${c.vendor.phone}`} className="mt-1 inline-flex items-center gap-1 text-primary">
                <Phone className="h-3.5 w-3.5" /> {c.vendor.phone}
              </a>
            )}
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold">Progress</h2>
        <ol className="relative space-y-4 border-l-2 border-border pl-6">
          <li className="relative">
            <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-ochre" />
            <p className="text-sm font-semibold">Complaint submitted</p>
            <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "d MMM yyyy, h:mm a")}</p>
          </li>
          {data.updates.map((u) => {
            const fromVendor = u.author_id === c.vendor_id;
            return (
              <li key={u.id} className="relative">
                <span
                  className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-card ${fromVendor ? "bg-muted-foreground" : "bg-primary"}`}
                />
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">
                      {fromVendor ? (u.author_id === me.user.id ? "You" : u.author?.full_name || "Member") : u.author?.full_name || "Association official"}
                    </span>
                    {!fromVendor && <Badge variant="meeting">Official</Badge>}
                    {u.new_status && (
                      <span className="text-muted-foreground">
                        changed status to <Badge variant={u.new_status}>{STATUS_LABELS[u.new_status]}</Badge>
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(new Date(u.created_at), "d MMM, h:mm a")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{u.message}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {c.status !== "closed" || me.isAdmin ? (
        <form onSubmit={onReply} className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={me.isAdmin ? "Write an update for the member…" : "Add more information…"}
          />
          <div className="flex flex-wrap items-center justify-end gap-3">
            {me.isAdmin && (
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ComplaintStatus | "keep")}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep status</SelectItem>
                  {(Object.keys(STATUS_LABELS) as ComplaintStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      Mark as {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button type="submit" disabled={busy}>
              Post update
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-center text-sm text-muted-foreground">This complaint is closed.</p>
      )}
    </div>
  );
}
