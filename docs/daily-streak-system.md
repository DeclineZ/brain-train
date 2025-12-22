# Daily Streak System

## Overview
The daily streak system provides gamification for user engagement with check-ins, badges, and calendar tracking.

## Features
- **Daily Check-in**: Manual or automatic check-in after game completion
- **Streak Tracking**: Current streak, longest streak, total check-ins
- **Interactive Calendar**: Monthly view with check-in history
- **Achievement Badges**: Milestone-based rewards
- **Fire Animations**: Visual feedback based on streak length
- **Thai Localization**: All text in Thai language

## Components

### StreakBadge (`components/DailyStreak/StreakBadge.tsx`)
Main component showing current streak with check-in functionality.
- Displays fire icon with size/color based on streak
- Manual check-in button
- Calendar access button
- Auto-check-in support for games

### CalendarModal (`components/DailyStreak/CalendarModal.tsx`)
Full calendar view showing check-in history.
- Monthly navigation
- Thai day names
- Visual indicators for checked-in days
- Legend and explanations

### StreakNotification (`components/DailyStreak/StreakNotification.tsx`)
Celebration notifications for successful check-ins.
- Milestone messages
- Badge unlock announcements
- Animated entrance/exit
- Auto-dismiss after 4 seconds

## Server Actions (`lib/server/dailystreakAction.ts`)

### `performDailyCheckin(userId: string)`
- Calls existing `checkin_today()` RPC
- Updates streak counters
- Checks for new badges
- Returns check-in result with message

### `getCheckinStatus(userId: string)`
- Fetches current check-in status
- Returns streak information
- Checks if already checked in today

### `getCheckinCalendar(userId: string, year: number, month: number)`
- Gets check-in data for specific month
- Returns calendar with check-in markers
- Includes future/past day indicators

### `getStreakBadges(userId: string)`
- Returns all available badges
- Marks unlocked badges based on user progress
- Includes achievement thresholds

## Integration

### In TopCard
The streak system is integrated into `TopCard.tsx`:
- Replaces original week row with StreakBadge
- Shows original week row if no user logged in
- Handles user authentication

### Auto Check-in from Games
To trigger automatic check-in after game completion:

```typescript
// In your game component after completion
const handleGameComplete = async () => {
  // Your existing game completion logic
  
  // Trigger auto check-in
  const result = await performDailyCheckin(userId);
  if (result.ok) {
    // Show notification or update UI
  }
};
```

## Database Schema

The system expects these Supabase tables:

### `profiles`
- User profile information
- Foreign key for other tables

### `checkin_days`
- Individual check-in records
- Columns: `user_id`, `checkin_date`

### `checkin_summary`
- Aggregated streak data
- Columns: `user_id`, `current_streak`, `longest_streak`, `total_checkins`, `last_checkin_date`

### RPC Function
- `checkin_today(p_user_id)` - Prevents backdating check-ins

## Badge System

### Streak Milestones
- 🌱 1 day: การเริ่มต้น (First Check-in)
- 🔥 3 days: 3 วันติดต่อกัน! (3 Day Streak)
- 💪 7 days: สัปดาห์แห่งความมุ่งมั่น (Week of Commitment)
- 🏆 30 days: เดือนแห่งความมุ่งมั่น (Month of Commitment)
- 👑 100 days: ระดับตำนาน (Legendary Level)

### Total Check-ins
- ⭐ 50 total: ผู้ฝึกฝนตัวจริง (Dedicated Practitioner)
- 🏆 100 total: ยอดฝีมือ (Expert)

## UI Design

### Color Scheme
- Background: `#FFFDF7` (cream)
- Primary: `#D75931` (orange)
- Secondary: `#EADFD6` (light brown)
- Text: `#3C2924` (dark brown)
- Secondary Text: `#51433A` (medium brown)

### Fire Icon Colors
- 0-2 days: Gray
- 3-6 days: Yellow
- 7-29 days: Orange  
- 30+ days: Red

### Animations
- Pulse animation for un-checked-in fire icons
- Smooth transitions for calendar navigation
- Slide-in/out for notifications
- Hover effects on interactive elements

## Error Handling

All server actions use the `Result<T>` pattern:
```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

Components handle loading states, network errors, and edge cases gracefully with user-friendly Thai error messages.
