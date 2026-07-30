import { NextRequest, NextResponse } from 'next/server';
import { getCheckinStatus, performDailyCheckin, getCheckinCalendar } from '@/lib/server/dailystreakAction';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  try {
    switch (action) {
      case 'status':
        const statusResult = await getCheckinStatus(user.id);
        return NextResponse.json(statusResult);
      
      case 'calendar':
        if (!year || !month) {
          return NextResponse.json({ error: 'Year and month are required for calendar' }, { status: 400 });
        }
        const calendarResult = await getCheckinCalendar(user.id, parseInt(year), parseInt(month));
        return NextResponse.json(calendarResult);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 });
  }

  const { action } = await request.json();

  try {
    switch (action) {
      case 'checkin':
        const checkinResult = await performDailyCheckin(user.id);
        return NextResponse.json(checkinResult);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
