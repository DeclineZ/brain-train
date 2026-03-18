import { createClient } from "@/utils/supabase/server";

export async function getTodayStatGains(userId: string) {
    try {
        const supabase = await createClient();
        
        // Use the start of the current day in the server's local time zone
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const { data: sessions, error } = await supabase
            .from('game_sessions')
            .select('stat_planning, stat_memory, stat_visual, stat_focus, stat_speed, stat_emotion')
            .eq('user_id', userId)
            .gte('played_at', startOfDay.toISOString());

        if (error) {
            console.error("Error fetching today's stat gains:", error);
            return null;
        }

        let planning = 0;
        let memory = 0;
        let visual = 0;
        let focus = 0;
        let speed = 0;
        let emotion = 0;

        sessions?.forEach(session => {
            planning += session.stat_planning || 0;
            memory += session.stat_memory || 0;
            visual += session.stat_visual || 0;
            focus += session.stat_focus || 0;
            speed += session.stat_speed || 0;
            emotion += session.stat_emotion || 0;
        });

        // Use maximum data value for radar scaling, defaulting to 100
        const maxGain = Math.max(planning, memory, visual, focus, speed, emotion, 100);

        return [
            { subject: 'การวางแผน', A: planning, fullMark: maxGain },
            { subject: 'ความเร็ว', A: speed, fullMark: maxGain },
            { subject: 'ความจำ', A: memory, fullMark: maxGain },
            { subject: 'สมาธิ', A: focus, fullMark: maxGain },
            { subject: 'การมองเห็น', A: visual, fullMark: maxGain },
            { subject: 'อารมณ์', A: emotion, fullMark: maxGain },
        ];
    } catch (error) {
        console.error("Failed to calculate today stat gains:", error);
        return null;
    }
}
