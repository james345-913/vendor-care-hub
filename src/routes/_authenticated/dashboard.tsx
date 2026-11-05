import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, MapPin, Plus, ArrowRight } from "lucide-react";
import { memberQueryOptions } from "@/hooks/use-member";
import { announcementsQueryOptions, complaintsQueryOptions } from "@/lib/queries";
import { MembershipCard } from "@/components/membership-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type ComplaintStatus } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Market Guard" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(memberQueryOptions),
      context.queryClient.ensureQueryData(complaintsQueryOptions),
      context.queryClient.ensureQueryData(announcementsQueryOptions),
    ]),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useSuspenseQuery(memberQueryOptions);
  const { data: complaints } = useSuspenseQuery(complaintsQueryOptions);
  const { data: announcements } = useSuspenseQuery(announcementsQueryOptions);

  const counts = (["open", "in_review", "resolved"] as ComplaintStatus[]).map((s) => ({
    s,
    n: complaints.filter((c) => c.status === s).length,
  }));
  const now = Date.now();
  const nextMeeting = announcements
    .filter((a) => a.kind === "meeting" && a.meeting_at && new Date(a.meeting_at).getTime() > now)
    .sort((a, b) => new Date(a.meeting_at!).getTime() - new Date(b.meeting_at!).getTime())[0];
  const incomplete = me.profile && (!me.profile.phone || !me.profile.market_location);
  const firstName = me.profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent">{me.isAdmin ? "Official" : "Member"}</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">
            Habari{firstName ? `, ${firstName}` : ""}!
          </h1>
        </div>
        <Button asChild variant="warm" size="lg">
          <Link to="/complaints/new">
            <Plus /> Report a problem
          </Link>
        </Button>
      </div>

      {incomplete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ochre bg-ochre/15 px-5 py-4">
          <p className="text-sm font-medium">
            Your profile is missing your phone or market. Officials need these to approve you.
          </p>
          <Button asChild size="sm" variant="ochre">
            <Link to="/profile">Complete profile</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {me.profile && <MembershipCard profile={me.profile} />}

        <div className="grid grid-cols-3 gap-3">
          {counts.map(({ s, n }) => (
            <Link
              key={s}
              to="/complaints"
              className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <Badge variant={s} className="w-fit">
                {STATUS_LABELS[s]}
              </Badge>
              <p className="mt-6 font-display text-4xl font-extrabold">{n}</p>
              <p className="text-xs text-muted-foreground">
                {me.isAdmin ? "complaints" : "my complaints"}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-bold">Next meeting</h2>
          {nextMeeting ? (
            <div className="mt-4">
              <p className="font-display text-xl font-bold">{nextMeeting.title}</p>
              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  {format(new Date(nextMeeting.meeting_at!), "EEEE d MMM yyyy, h:mm a")}
                </p>
                {nextMeeting.venue && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" /> {nextMeeting.venue}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Latest notices</h2>
            <Link to="/announcements" className="flex items-center gap-1 text-sm font-semibold text-primary">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-4 divide-y">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="py-3">
                <p className="font-semibold">{a.title}</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">{a.body}</p>
              </li>
            ))}
            {announcements.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">Nothing posted yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
