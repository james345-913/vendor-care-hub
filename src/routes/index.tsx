import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Megaphone, MessageSquareWarning, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroAsset from "@/assets/mbarara-central-market.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Market Guard — Vendors Association & Complaints" },
      {
        name: "description",
        content:
          "Register as a member, report problems at your market, and follow association meetings — all in one place.",
      },
      { property: "og:title", content: "Market Guard — Vendors Association" },
      {
        property: "og:description",
        content: "One voice for market and street traders: membership, complaints and meetings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

const features = [
  {
    icon: BadgeCheck,
    title: "Register as a member",
    body: "Get your membership number and digital member card once officials approve you.",
  },
  {
    icon: MessageSquareWarning,
    title: "Report a problem",
    body: "Harassment, unfair levies, stall disputes, sanitation — file it and track every step.",
  },
  {
    icon: Megaphone,
    title: "Stay informed",
    body: "See notices and upcoming meetings from the association leadership.",
  },
];

function Landing() {
  const signedIn = useSignedIn();
  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate min-h-[88vh] overflow-hidden">
        <img
          src={heroAsset.url}
          alt="Vendors and fresh produce stalls inside Mbarara Central Market in Uganda"
          width={1600}
          height={702}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[42%_center] md:object-center"
        />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />

        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm font-display text-lg font-extrabold text-accent-foreground">
              MG
            </span>
            <span className="font-display text-xl font-bold">Market Guard</span>
          </Link>
          {signedIn ? (
            <Button asChild variant="glass">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <Button asChild variant="glass">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </header>

        <div className="mx-auto flex max-w-6xl flex-col justify-end px-6 pb-20 pt-[28vh]">
          <p className="mb-4 inline-flex w-fit rounded-full bg-ochre px-3 py-1 text-xs font-bold uppercase tracking-widest text-ochre-foreground">
            Vendors association
          </p>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.02] text-primary-foreground md:text-7xl">
            One market.
            <br />
            One voice.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/85">
            Join the association, report problems at your stall, and never miss a meeting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="warm">
              <Link to={signedIn ? "/dashboard" : "/auth"}>
                {signedIn ? "Open my dashboard" : "Become a member"} <ArrowRight />
              </Link>
            </Button>
            {!signedIn && (
              <Button asChild size="lg" variant="glass">
                <Link to="/auth">I already have an account</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-3">
        {features.map((f, i) => (
          <div key={f.title} className="rounded-2xl border bg-card p-7 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <f.icon className="h-7 w-7 text-accent" />
              <span className="font-display text-sm font-bold text-muted-foreground">
                0{i + 1}
              </span>
            </div>
            <h3 className="text-xl font-bold">{f.title}</h3>
            <p className="mt-2 text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Market Guard Vendors Association
      </footer>
    </div>
  );
}
