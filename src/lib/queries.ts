import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const complaintsQueryOptions = queryOptions({
  queryKey: ["complaints"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("complaints")
      .select(
        "*, vendor:profiles!complaints_vendor_id_fkey(full_name, membership_number, market_location)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const complaintQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["complaints", id],
    queryFn: async () => {
      const [{ data: complaint, error }, { data: updates, error: uErr }] = await Promise.all([
        supabase
          .from("complaints")
          .select(
            "*, vendor:profiles!complaints_vendor_id_fkey(full_name, membership_number, market_location, phone, stall_number)",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("complaint_updates")
          .select("*, author:profiles!complaint_updates_author_id_fkey(full_name)")
          .eq("complaint_id", id)
          .order("created_at", { ascending: true }),
      ]);
      if (error) throw error;
      if (uErr) throw uErr;
      return { complaint, updates: updates ?? [] };
    },
  });

export const announcementsQueryOptions = queryOptions({
  queryKey: ["announcements"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const membersQueryOptions = queryOptions({
  queryKey: ["members"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
