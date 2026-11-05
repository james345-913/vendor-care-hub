import type { Database } from "@/integrations/supabase/types";

export type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];
export type ComplaintCategory = Database["public"]["Enums"]["complaint_category"];
export type ComplaintPriority = Database["public"]["Enums"]["complaint_priority"];
export type MembershipStatus = Database["public"]["Enums"]["membership_status"];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  closed: "Closed",
};

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  harassment: "Harassment / eviction",
  fees_levies: "Fees & levies",
  stall_allocation: "Stall allocation",
  sanitation: "Sanitation & waste",
  security: "Security & theft",
  infrastructure: "Roads, water & power",
  other: "Other",
};

export const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "Urgent",
};

export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  pending: "Pending approval",
  active: "Active member",
  suspended: "Suspended",
};

export const GOODS_CATEGORIES = [
  "Fruits & vegetables",
  "Cereals & grains",
  "Clothing & textiles",
  "Shoes & accessories",
  "Household goods",
  "Electronics & phones",
  "Cooked food",
  "Fish & meat",
  "Services (tailor, repairs, salon)",
  "Other",
];
