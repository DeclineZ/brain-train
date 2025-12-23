import { createClient } from "@/utils/supabase/server";
import { getCheckinStatus } from "@/lib/server/dailystreakAction";
import TopCardClient from "./TopCardClient";

export default async function TopCard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;
  let checkinStatus = null;

  if (user) {
    // Parallel fetch for partial performance gain
    const [profileResult, statusResult] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single(),
      getCheckinStatus(user.id)
    ]);

    if (profileResult.data) {
      userProfile = profileResult.data;
    }

    if (statusResult.ok && statusResult.data) {
      checkinStatus = statusResult.data;
    }
  }

  return (
    <TopCardClient
      userProfile={userProfile}
      checkinStatus={checkinStatus}
      userId={user?.id || null}
    />
  );
}
