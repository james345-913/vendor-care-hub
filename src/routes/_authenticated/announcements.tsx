import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { format, isPast } from "date-fns";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions } from "@/hooks/use-member";
import { announcementsQueryOptions } from "@/lib/queries";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Notices & meetings — Soko Umoja" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(memberQueryOptions),
      context.queryClient.ensureQueryData(announcementsQueryOptions),
    ]),
  component: AnnouncementsPage,
});

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  body: z.string().trim().min(1, "Write the details").max(4000),
  venue: z.string().trim().max(150),
  meeting_at: z.string().optional(),
});

function AnnouncementsPage() {
  const { data: me } = useSuspenseQuery(memberQueryOptions);
  const { data: items } = useSuspenseQuery(announcementsQueryOptions);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"notice" | "meeting">("notice");
  const [busy, setBusy] = useState(false);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget).entries()));
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message);
    const { meeting_at, ...rest } = parsed.data;
    if (kind === "meeting" && !meeting_at) return toast.error("Pick the meeting date and time");
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      ...rest,
      kind,
      meeting_at: kind === "meeting" && meeting_at ? new Date(meeting_at).toISOString() : null,
      created_by: me.user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(kind === "meeting" ? "Meeting scheduled" : "Notice posted");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <div>
      <PageHeader
        title="Notices & meetings"
        subtitle="Updates from the association leadership."
        action={
          me.isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="warm">
                  <Plus /> New post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New post</DialogTitle>
                </DialogHeader>
                <Tabs value={kind} onValueChange={(v) => setKind(v as "notice" | "meeting")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="notice">Notice</TabsTrigger>
                    <TabsTrigger value="meeting">Meeting</TabsTrigger>
                  </TabsList>
                </Tabs>
                <form onSubmit={onCreate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" required />
                  </div>
                  {kind === "meeting" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="meeting_at">Date & time</Label>
                        <Input id="meeting_at" name="meeting_at" type="datetime-local" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="venue">Venue</Label>
                        <Input id="venue" name="venue" placeholder="e.g. Market hall" />
                      </div>
                    </div>
                  )}
                  {kind === "notice" && <input type="hidden" name="venue" value="" />}
                  <div className="space-y-1.5">
                    <Label htmlFor="body">{kind === "meeting" ? "Agenda" : "Message"}</Label>
                    <Textarea id="body" name="body" rows={5} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {kind === "meeting" ? "Schedule meeting" : "Post notice"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground shadow-soft">
            No notices or meetings yet.
          </div>
        )}
        {items.map((a) => {
          const past = a.meeting_at ? isPast(new Date(a.meeting_at)) : false;
          return (
            <article key={a.id} className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="flex items-start gap-4">
                {a.kind === "meeting" && a.meeting_at && (
                  <div className="hidden w-16 shrink-0 rounded-xl bg-primary-deep py-2 text-center text-primary-foreground sm:block">
                    <p className="text-xs uppercase tracking-wider text-ochre">
                      {format(new Date(a.meeting_at), "MMM")}
                    </p>
                    <p className="font-display text-2xl font-extrabold">
                      {format(new Date(a.meeting_at), "d")}
                    </p>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={a.kind}>{a.kind === "meeting" ? "Meeting" : "Notice"}</Badge>
                    {past && <Badge variant="closed">Past</Badge>}
                    <span className="text-xs text-muted-foreground">
                      Posted {format(new Date(a.created_at), "d MMM yyyy")}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold">{a.title}</h2>
                  {a.kind === "meeting" && a.meeting_at && (
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-accent" />
                        {format(new Date(a.meeting_at), "EEEE d MMM, h:mm a")}
                      </span>
                      {a.venue && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-accent" /> {a.venue}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-3 whitespace-pre-wrap text-foreground/90">{a.body}</p>
                </div>
                {me.isAdmin && (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(a.id)} aria-label="Delete post">
                    <Trash2 />
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
