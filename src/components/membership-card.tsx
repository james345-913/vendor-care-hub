import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { MEMBERSHIP_LABELS } from "@/lib/labels";

export function MembershipCard({ profile }: { profile: Tables<"profiles"> }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary-deep bg-weave p-6 text-primary-foreground shadow-lift">
      <div className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-gradient-warm opacity-80" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre">Member card</p>
          <Badge variant={profile.membership_status}>{MEMBERSHIP_LABELS[profile.membership_status]}</Badge>
        </div>
        <p className="mt-8 font-display text-2xl font-bold">{profile.full_name || "Unnamed member"}</p>
        <p className="text-primary-foreground/70">{profile.business_name || "—"}</p>
        <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-primary-foreground/60">Member no.</p>
            <p className="font-display font-bold tracking-wide">{profile.membership_number}</p>
          </div>
          <div>
            <p className="text-xs text-primary-foreground/60">Market</p>
            <p className="truncate font-semibold">{profile.market_location || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-primary-foreground/60">Stall</p>
            <p className="font-semibold">{profile.stall_number || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
