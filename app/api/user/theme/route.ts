import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { themeId } = await request.json();

        if (!themeId) {
            return NextResponse.json({ error: "Theme ID is required" }, { status: 400 });
        }

        // Update profile in DB
        // Note: You might need to add the active_theme_id column to your profiles table first if it doesn't exist
        const { error } = await supabase
            .from("user_profiles")
            .update({ active_theme_id: themeId }) // Fixed column name
            .eq("user_id", user.id);

        if (error) {
            console.error("Error updating theme:", error);
            return NextResponse.json({ error: "Failed to update theme" }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            message: "Theme updated successfully"
        });
    } catch (error) {
        console.error("Theme update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
