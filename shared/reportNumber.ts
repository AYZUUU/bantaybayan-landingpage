import { supabase } from "../services/supabase";

export async function getCitizenReportNumber(
  reportId: string,
  userId: string | null,
): Promise<number | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("reports")
    .select("id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Could not determine citizen report number:", error);
    return null;
  }

  const reportIndex = data.findIndex((report) => String(report.id) === reportId);
  return reportIndex >= 0 ? reportIndex + 1 : null;
}
