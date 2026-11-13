import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions } from "@/hooks/use-member";
import { PageHeader } from "@/components/app-shell";
import { MembershipCard } from "@/components/membership-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOODS_CATEGORIES } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "My profile — Market Guard" },
    { name: "description", content: "Manage your Market Guard vendor profile and membership details in Mbarara, Uganda." },
    { property: "og:title", content: "My profile — Market Guard" },
    { property: "og:description", content: "Manage your Market Guard vendor profile and membership details in Mbarara, Uganda." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memberQueryOptions),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z.string().trim().min(9, "Enter a valid phone").max(20).regex(/^[+0-9 ]+$/, "Phone: digits only"),
  business_name: z.string().trim().max(120),
  market_location: z.string().trim().min(2, "Where do you trade?").max(120),
  stall_number: z.string().trim().max(30),
  national_id: z.string().trim().max(20),
});

function ProfilePage() {
  const { data: me } = useSuspenseQuery(memberQueryOptions);
  const qc = useQueryClient();
  const p = me.profile!;
  const [category, setCategory] = useState(p.goods_category);
  const [busy, setBusy] = useState(false);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget).entries()));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, goods_category: category })
      .eq("id", p.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <div>
      <PageHeader title="My profile" subtitle="Keep your details up to date for the association register." />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={onSave} className="space-y-5 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="grid gap-5 sm:grid-cols-2">
            <F label="Full name" name="full_name" defaultValue={p.full_name} />
            <F label="Phone" name="phone" defaultValue={p.phone} />
            <F label="National ID no." name="national_id" defaultValue={p.national_id} />
            <F label="Business / stall name" name="business_name" defaultValue={p.business_name} />
            <div className="space-y-1.5">
              <Label>What do you sell?</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {GOODS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <F label="Stall number" name="stall_number" defaultValue={p.stall_number} />
          </div>
          <F label="Market / street" name="market_location" defaultValue={p.market_location} />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              Save changes
            </Button>
          </div>
        </form>
        <div className="space-y-3">
          <MembershipCard profile={p} />
          {p.membership_status === "pending" && (
            <p className="text-sm text-muted-foreground">
              Your membership is waiting for approval by an association official.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function F({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}
