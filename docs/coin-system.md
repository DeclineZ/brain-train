# Coin System

## Overview
The coin system provides a virtual currency for purchasing items in the shop, with functions to add and subtract coins from user wallets.

## Features
- **Virtual Currency**: Coins used for purchasing shop items
- **Balance Management**: Real-time balance updates across all components
- **Transaction History**: Complete record of all coin transactions
- **Purchase System**: Buy items with coin deduction
- **Bonus System**: Add coins for rewards or testing

## Server Actions (`lib/server/shopAction.ts`)

### `addCoins(userId: string, amount: number, reason?: string)`
Adds coins to a user's wallet.

**Parameters:**
- `userId`: User ID to add coins to
- `amount`: Number of coins to add (must be positive)
- `reason`: Optional reason for the addition

**Returns:**
```typescript
Result<{ new_balance: number }>
```

**Example:**
```typescript
const result = await addCoins("user123", 100, "เติมเหรียญ 100 คะแนน");
if (result.ok) {
  console.log("New balance:", result.data.new_balance);
}
```

**Database Operations:**
- Uses `apply_coin_delta` RPC function
- Creates transaction record with action_key "add_coins"
- Includes metadata with reason and amount
- Generates unique idempotency key for safety

### `purchaseItem(userId: string, itemId: string)`
Subtracts coins when purchasing shop items.

**Parameters:**
- `userId`: User ID making the purchase
- `itemId`: ID of the item being purchased

**Returns:**
```typescript
Result<PurchaseResult>
```

**Example:**
```typescript
const result = await purchaseItem("user123", "powerup_hint");
if (result.ok) {
  console.log("Purchased:", result.data.item_purchased.name);
  console.log("New balance:", result.data.new_balance);
}
```

**Process:**
1. Validates item exists and is available
2. Checks if user has sufficient coins
3. Prevents overdraft (negative balance not allowed)
4. Creates transaction record with action_key "purchase_item"
5. Returns purchase confirmation with new balance

### `getUserBalance(userId: string)`
Gets current user balance.

**Returns:**
```typescript
Result<UserBalance>
```

**Example:**
```typescript
const result = await getUserBalance("user123");
if (result.ok) {
  console.log("Current balance:", result.data.balance);
}
```

## API Endpoints

### `/api/add-coins` (POST)
Client endpoint for adding coins.

**Request Body:**
```json
{
  "userId": "user123",
  "amount": 100,
  "reason": "เติมเหรียญ 100 คะแนน"
}
```

**Response:**
```json
{
  "new_balance": 500
}
```

**Error Response:**
```json
{
  "error": "User ID is required"
}
```

### `/api/shop` (POST)
Client endpoint for purchasing items.

**Request Body:**
```json
{
  "userId": "user123",
  "itemId": "powerup_hint"
}
```

**Response:**
```json
{
  "success": true,
  "new_balance": 50,
  "item_purchased": {
    "id": "powerup_hint",
    "name": "เคล็ดลับพิเศษ",
    "price": 50
  },
  "transaction_id": "order_1234567890_abc123",
  "message": "ซื้อเคล็ดลับพิเศษสำเร็จ! คงเหลือ 50 เหรียญ"
}
```

## Client Components

### ShopItemCard (`components/shop/ShopItemCard.tsx`)
Card component for individual shop items with purchase functionality.

**Key Functions:**
- Displays item price and user balance
- Validates purchase eligibility
- Calls purchase API on button click
- Shows loading and error states

## Database Schema

### `wallets` Table
Stores user wallet information.
- `user_id`: User ID (primary key)
- `balance`: Current coin balance
- `updated_at`: Last update timestamp

### `coin_transactions` Table
Records all coin transactions.
- `id`: Transaction ID
- `user_id`: User ID
- `delta`: Coin change (positive for addition, negative for subtraction)
- `balance_after`: Balance after transaction
- `action_key`: Type of transaction ("add_coins", "purchase_item")
- `ref_id`: Reference ID (order ID, bonus ID, etc.)
- `metadata`: JSON metadata (item details, reason, etc.)
- `created_at`: Transaction timestamp

### RPC Function: `apply_coin_delta`
Atomic operation for updating coin balance.
```sql
apply_coin_delta(
  p_user_id text,
  p_delta integer,
  p_action_key text,
  p_ref_id text,
  p_metadata jsonb,
  p_idempotency_key text,
  p_allow_negative boolean
)
```

**Parameters:**
- `p_user_id`: User ID
- `p_delta`: Coin change (+/-)
- `p_action_key`: Transaction type
- `p_ref_id`: Reference identifier
- `p_metadata`: Additional transaction data
- `p_idempotency_key`: Prevents duplicate transactions
- `p_allow_negative`: Allow negative balance (false for purchases)

## Error Handling

All operations use the `Result<T>` pattern:
```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

**Common Errors:**
- "User ID is required" - Missing authentication
- "เหรียญของคุณไม่พอสำหรับซื้อสินค้านี้" - Insufficient balance
- "จำนวนเหรียญต้องมากกว่า 0" - Invalid coin amount
- "สินค้านี้ไม่มีให้บริการในขณะนี้" - Item not available

## Integration Examples

### Adding Coins from Game Rewards
```typescript
// In your game component after level completion
const handleLevelComplete = async (userId: string) => {
  const result = await addCoins(userId, 50, "รางวัลผ่านด่าน");
  if (result.ok) {
    showNotification("ได้รับ 50 เหรียญ!");
    updateBalance(result.data.new_balance);
  }
};
```

### Processing Shop Purchase
```typescript
// In shop component
const handlePurchase = async (item: ShopItem) => {
  const response = await fetch('/api/shop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, itemId: item.id })
  });
  
  const result = await response.json();
  if (response.ok) {
    showSuccess(result.message);
    updateBalance(result.new_balance);
  } else {
    showError(result.error);
  }
};
```


## Security Considerations

1. **Idempotency Keys**: All transactions use unique keys to prevent duplicates
2. **Server-Side Validation**: All coin operations validated on server
3. **Negative Balance Prevention**: Purchases cannot overdraft accounts
4. **Authentication**: All operations require valid user ID
5. **Transaction Atomicity**: Balance updates use database RPC for consistency

## UI Design

### Color Scheme
- Success: Green (`bg-green-600`)
- Error: Red (`bg-red-600`)
- Disabled: Gray (`bg-gray-200 text-gray-500`)
- Primary Action: Orange gradient (`from-green-500 to-green-600`)

### Loading States
- Spinner animation during API calls
- Disabled button state while processing
- Toast notifications for user feedback

### Balance Display
- Real-time updates across all components
- Coin icon (💰) for visual identification
- Thai currency labeling ("เหรียญ")
