import { NextRequest, NextResponse } from 'next/server';
import { getCheckinStatus, performDailyCheckin, getCheckinCalendar } from '@/lib/server/dailystreakAction';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'status':
        const statusResult = await getCheckinStatus(userId);
        return NextResponse.json(statusResult);
      
      case 'calendar':
        if (!year || !month) {
          return NextResponse.json({ error: 'Year and month are required for calendar' }, { status: 400 });
        }
        const calendarResult = await getCheckinCalendar(userId, parseInt(year), parseInt(month));
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
  const { userId, action } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'checkin':
        const checkinResult = await performDailyCheckin(userId);
        return NextResponse.json(checkinResult);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
