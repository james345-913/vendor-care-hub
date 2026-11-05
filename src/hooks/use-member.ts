import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const memberQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) throw new Error("Not signed in");
    const uid = userData.user.id;
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    if (error) throw error;
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return { user: userData.user, profile, isAdmin };
  },
});

export function useMember() {
  return useQuery(memberQueryOptions);
}
