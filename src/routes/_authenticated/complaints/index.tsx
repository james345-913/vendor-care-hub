import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, Search } from "lucide-react";
import { memberQueryOptions } from "@/hooks/use-member";
import { complaintsQueryOptions } from "@/lib/queries";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, STATUS_LABELS, type ComplaintStatus } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/complaints/")({
  head: () => ({ meta: [
    { title: "Complaints — Market Guard" },
    { name: "description", content: "Follow vendor complaints and association responses in Mbarara, Uganda." },
    { property: "og:title", content: "Complaints — Market Guard" },
    { property: "og:description", content: "Follow vendor complaints and association responses in Mbarara, Uganda." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(memberQueryOptions),
      context.queryClient.ensureQueryData(complaintsQueryOptions),
    ]),
  component: ComplaintsPage,
});

const FILTERS: Array<ComplaintStatus | "all"> = ["all", "open", "in_review", "resolved", "closed"];

function ComplaintsPage() {
  const { data: me } = useSuspenseQuery(memberQueryOptions);
  const { data: complaints } = useSuspenseQuery(complaintsQueryOptions);
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return complaints.filter(
      (c) =>
        (filter === "all" || c.status === filter) &&
        (!term ||
          c.title.toLowerCase().includes(term) ||
          c.reference_no.toLowerCase().includes(term) ||
          c.vendor?.full_name?.toLowerCase().includes(term)),
    );
  }, [complaints, filter, q]);

  return (
    <div>
      <PageHeader
        title={me.isAdmin ? "All complaints" : "My complaints"}
        subtitle={
          me.isAdmin
            ? "Review issues raised by members and update their status."
            : "Track the problems you've reported to the association."
        }
        action={
          <Button asChild variant="warm">
            <Link to="/complaints/new">
              <Plus /> New complaint
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, ref, name"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {list.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-lg font-bold">No complaints here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {complaints.length === 0
                ? "When you report a problem, it will show up here."
                : "Try a different filter."}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  to="/complaints/$id"
                  params={{ id: c.id }}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{c.reference_no}</span>
                      {c.priority === "high" && <Badge variant="high">Urgent</Badge>}
                    </div>
                    <p className="mt-0.5 truncate font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_LABELS[c.category]}
                      {me.isAdmin && c.vendor ? ` · ${c.vendor.full_name || c.vendor.membership_number}` : ""}
                      {" · "}
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={c.status}>{STATUS_LABELS[c.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
