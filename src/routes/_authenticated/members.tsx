import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions } from "@/hooks/use-member";
import { membersQueryOptions } from "@/lib/queries";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEMBERSHIP_LABELS, type MembershipStatus } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members register — Soko Umoja" }] }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(memberQueryOptions);
    if (!me.isAdmin) throw redirect({ to: "/dashboard" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(membersQueryOptions),
  component: MembersPage,
});

const FILTERS: Array<MembershipStatus | "all"> = ["all", "pending", "active", "suspended"];

function MembersPage() {
  const { data: members } = useSuspenseQuery(membersQueryOptions);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<MembershipStatus | "all">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return members.filter(
      (m) =>
        (filter === "all" || m.membership_status === filter) &&
        (!t ||
          m.full_name.toLowerCase().includes(t) ||
          m.membership_number.toLowerCase().includes(t) ||
          m.market_location.toLowerCase().includes(t) ||
          m.phone.includes(t)),
    );
  }, [members, filter, q]);

  async function setStatus(id: string, status: MembershipStatus) {
    const { error } = await supabase.from("profiles").update({ membership_status: status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Member ${status === "active" ? "approved" : status}`);
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  const pending = members.filter((m) => m.membership_status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Members register"
        subtitle={`${members.length} registered · ${pending} waiting for approval`}
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
              {f === "all" ? "All" : MEMBERSHIP_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, number, market" className="pl-9" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {list.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No members match.</p>
        ) : (
          <ul className="divide-y">
            {list.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{m.membership_number}</span>
                    <Badge variant={m.membership_status}>{MEMBERSHIP_LABELS[m.membership_status]}</Badge>
                  </div>
                  <p className="mt-0.5 font-semibold">{m.full_name || m.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {[m.business_name, m.goods_category, m.market_location, m.stall_number && `Stall ${m.stall_number}`, m.phone]
                      .filter(Boolean)
                      .join(" · ") || "No details yet"}
                    {" · joined "}
                    {format(new Date(m.created_at), "d MMM yyyy")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {m.membership_status !== "active" && (
                    <Button size="sm" onClick={() => setStatus(m.id, "active")}>
                      Approve
                    </Button>
                  )}
                  {m.membership_status !== "suspended" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "suspended")}>
                      Suspend
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
