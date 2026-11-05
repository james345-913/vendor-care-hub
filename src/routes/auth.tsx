import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { z } from "zod";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOODS_CATEGORIES } from "@/lib/labels";
import heroImg from "@/assets/market-hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or register — Soko Umoja" },
      { name: "description", content: "Sign in or register as a member of the vendors association." },
      { property: "og:title", content: "Sign in or register — Soko Umoja" },
      { property: "og:description", content: "Access your vendor membership, complaints and meetings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .min(9, "Enter a valid phone number")
    .max(20)
    .regex(/^[+0-9 ]+$/, "Digits only"),
  business_name: z.string().trim().max(120),
  goods_category: z.string().trim().max(80),
  market_location: z.string().trim().min(2, "Where do you trade?").max(120),
  stall_number: z.string().trim().max(30),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function onSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function onForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Check your email for a reset link.");
    setForgot(false);
  }

  async function onSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      ...Object.fromEntries(fd.entries()),
      goods_category: category,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    const { email, password, ...meta } = parsed.data;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: meta },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) setSentTo(email);
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src={heroImg}
          alt="Vendors at a Nairobi market"
          className="absolute inset-0 h-full w-full object-cover"
          width={1600}
          height={1104}
        />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="absolute bottom-0 p-12 text-primary-foreground">
          <Link to="/" className="font-display text-2xl font-bold">
            Soko Umoja
          </Link>
          <p className="mt-3 max-w-sm text-primary-foreground/85">
            Your association, your rights. Register once and raise issues any time.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 block font-display text-xl font-bold text-primary lg:hidden">
            Soko Umoja
          </Link>

          {sentTo ? (
            <div className="rounded-2xl border bg-card p-8 shadow-soft">
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="mt-3 text-muted-foreground">
                We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>.
                Open it to activate your account, then sign in.
              </p>
              <Button className="mt-6" variant="outline" onClick={() => setSentTo(null)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <h1 className="text-3xl font-bold">Welcome back</h1>
                <p className="mt-1 text-muted-foreground">Sign in to your member account.</p>
                {forgot ? (
                  <form onSubmit={onForgot} className="mt-6 space-y-4">
                    <Field label="Email" name="email" type="email" required />
                    <Button type="submit" className="w-full" disabled={busy}>
                      Send reset link
                    </Button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline"
                      onClick={() => setForgot(false)}
                    >
                      Back to sign in
                    </button>
                  </form>
                ) : (
                  <form onSubmit={onSignIn} className="mt-6 space-y-4">
                    <Field label="Email" name="email" type="email" required />
                    <Field label="Password" name="password" type="password" required />
                    <Button type="submit" className="w-full" size="lg" disabled={busy}>
                      Sign in
                    </Button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline"
                      onClick={() => setForgot(true)}
                    >
                      Forgot password?
                    </button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <h1 className="text-3xl font-bold">Become a member</h1>
                <p className="mt-1 text-muted-foreground">
                  Officials will review and approve your membership.
                </p>
                <form onSubmit={onSignUp} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" name="full_name" required />
                    <Field label="Phone" name="phone" placeholder="07xx xxx xxx" required />
                  </div>
                  <Field label="Business / stall name" name="business_name" />
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
                  <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                    <Field
                      label="Market / street"
                      name="market_location"
                      placeholder="e.g. Gikomba, Muthurwa"
                      required
                    />
                    <Field label="Stall no." name="stall_number" />
                  </div>
                  <Field label="Email" name="email" type="email" required />
                  <Field label="Password" name="password" type="password" required />
                  <Button type="submit" className="w-full" size="lg" disabled={busy}>
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!sentTo && (
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={() => social("google")}>
                Continue with Google
              </Button>
              <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
                Continue with Lovable
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
