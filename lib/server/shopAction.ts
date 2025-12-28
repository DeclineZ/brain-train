import { createClient } from "@/utils/supabase/server";
import type { Result, UserBalance, ShopItem, ShopItemWithOwnership, PlayerInventory, PurchaseResult, TransactionHistory } from "@/types";


/**
 * Gets the user's current coin balance
 */
export async function getUserBalance(userId: string): Promise<Result<UserBalance>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("wallets")
      .select("balance, updated_at")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no wallet exists, return 0 balance
      if (error.code === 'PGRST116') {
        return { 
          ok: true, 
          data: { balance: 0, updated_at: new Date().toISOString() } 
        };
      }
      console.error('Balance fetch error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: data as UserBalance };
  } catch (error) {
    console.error('Balance error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets all available shop items from database
 */
export async function getShopItems(): Promise<Result<ShopItem[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Shop items fetch error:', error);
      return { ok: false, error: error.message };
    }

    // Add display properties for UI compatibility
    const itemsWithDisplay = data?.map(item => ({
      ...item,
      icon: getItemIcon(item.type),
      category: item.type,
      available: true,
    })) || [];

    return { ok: true, data: itemsWithDisplay };
  } catch (error) {
    console.error('Shop items error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets shop items with ownership status for a specific user
 */
export async function getShopItemsWithOwnership(userId: string | null): Promise<Result<ShopItemWithOwnership[]>> {
  try {
    const supabase = await createClient();
    
    if (!userId) {
      // If no user, return items without ownership
      const itemsResult = await getShopItems();
      if (!itemsResult.ok) return itemsResult;
      
      const itemsWithoutOwnership: ShopItemWithOwnership[] = itemsResult.data.map(item => ({
        ...item,
        isOwned: false
      }));
      
      return { ok: true, data: itemsWithoutOwnership };
    }

    // Get all items and user's inventory in parallel
    const [itemsResult, inventoryResult] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("player_inventory").select("item_id, quantity").eq("player_id", userId)
    ]);

    if (itemsResult.error) {
      console.error('Shop items fetch error:', itemsResult.error);
      return { ok: false, error: itemsResult.error.message };
    }

    if (inventoryResult.error) {
      console.error('Inventory fetch error:', inventoryResult.error);
      return { ok: false, error: inventoryResult.error.message };
    }

    // Create ownership map from inventory
    const ownershipMap = new Map();
    inventoryResult.data?.forEach(inv => {
      ownershipMap.set(inv.item_id, { isOwned: true, quantity: inv.quantity });
    });

    // Combine items with ownership status
    const itemsWithOwnership: ShopItemWithOwnership[] = itemsResult.data?.map(item => {
      const ownership = ownershipMap.get(item.id);
      return {
        ...item,
        icon: getItemIcon(item.type),
        category: item.type,
        available: true,
        isOwned: !!ownership,
        quantity: ownership?.quantity
      };
    }) || [];

    return { ok: true, data: itemsWithOwnership };
  } catch (error) {
    console.error('Shop items with ownership error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets shop items by category with ownership status
 */
export async function getShopItemsByCategoryWithOwnership(category?: string, userId?: string | null): Promise<Result<ShopItemWithOwnership[]>> {
  try {
    const itemsResult = await getShopItemsWithOwnership(userId || null);
    if (!itemsResult.ok) {
      return itemsResult;
    }

    let filteredItems = itemsResult.data;
    
    if (category && category !== "all") {
      filteredItems = itemsResult.data.filter(item => item.type === category);
    }

    return { ok: true, data: filteredItems };
  } catch (error) {
    console.error('Category items with ownership error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Get icon based on item type
 */
function getItemIcon(type: string): string {
  const iconMap: { [key: string]: string } = {
    powerup: "💡",
    theme: "🎨",
    avatar: "👤",
    bonus: "🎁",
    weapon: "⚔️",
    consumable: "🧪",
    default: "📦"
  };
  return iconMap[type] || iconMap.default;
}

/**
 * Adds item to player inventory
 */
export async function addItemToInventory(userId: string, itemId: string, quantity: number = 1): Promise<Result<PlayerInventory>> {
  try {
    const supabase = await createClient();
    
    // Check if item already exists in inventory
    const { data: existingItem, error: fetchError } = await supabase
      .from("player_inventory")
      .select("*")
      .eq("player_id", userId)
      .eq("item_id", itemId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Inventory fetch error:', fetchError);
      return { ok: false, error: fetchError.message };
    }

    if (existingItem) {
      // Update existing item quantity
      const { data, error } = await supabase
        .from("player_inventory")
        .update({ 
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq("player_id", userId)
        .eq("item_id", itemId)
        .select()
        .single();

      if (error) {
        console.error('Inventory update error:', error);
        return { ok: false, error: error.message };
      }

      return { ok: true, data: data as PlayerInventory };
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from("player_inventory")
        .insert({
          player_id: userId,
          item_id: itemId,
          quantity: quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Inventory insert error:', error);
        return { ok: false, error: error.message };
      }

      return { ok: true, data: data as PlayerInventory };
    }
  } catch (error) {
    console.error('Add to inventory error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Purchases an item from shop
 */
export async function purchaseItem(userId: string, itemId: string): Promise<Result<PurchaseResult>> {
  try {
    const supabase = await createClient();
    
    // Get shop item details
    const itemsResult = await getShopItems();
    if (!itemsResult.ok) {
      return { ok: false, error: "ไม่สามารถดึงข้อมูลสินค้าได้" };
    }

    const item = itemsResult.data.find(i => i.id === itemId);
    if (!item) {
      return { ok: false, error: "ไม่พบสินค้านี้" };
    }

    // Generate unique order ID and idempotency key
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const idempotencyKey = `${userId}_${itemId}_${orderId}`;

    // Apply coin delta using the provided RPC function
    const { data, error } = await supabase.rpc("apply_coin_delta", {
      p_user_id: userId,
      p_delta: -item.price, // Subtract coins
      p_action_key: "purchase_item",
      p_ref_id: orderId,
      p_metadata: { 
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.type
      },
      p_idempotency_key: idempotencyKey,
      p_allow_negative: false // Don't allow overdraft
    });

    if (error) {
      console.error('Purchase RPC error:', error);
      
      if (error.message.includes('insufficient') || error.message.includes('negative')) {
        return { ok: false, error: "เหรียญของคุณไม่พอสำหรับซื้อสินค้านี้" };
      }
      
      return { ok: false, error: "เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่" };
    }

    const newBalance = data;

    // Add item to inventory after successful payment
    const inventoryResult = await addItemToInventory(userId, itemId, 1);
    if (!inventoryResult.ok) {
      console.error('Failed to add item to inventory:', inventoryResult.error);
      // Note: In a production system, you might want to refund the coins here
      return { ok: false, error: "เกิดข้อผิดพลาดในการเพิ่มไอเทมลงในกระเป๋า" };
    }

    const result: PurchaseResult = {
      success: true,
      new_balance: newBalance,
      item_purchased: item,
      transaction_id: orderId,
      message: `ซื้อ ${item.name} สำเร็จ! คงเหลือ ${newBalance} เหรียญ`
    };

    return { ok: true, data: result };
  } catch (error) {
    console.error('Purchase error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets user's transaction history
 */
export async function getTransactionHistory(userId: string): Promise<Result<TransactionHistory[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("coin_transactions")
      .select("id, delta, balance_after, action_key, ref_id, metadata, created_at")
      .eq("user_id", userId)
      .eq("action_key", "purchase_item")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error('Transaction history error:', error);
      return { ok: false, error: error.message };
    }

    const history: TransactionHistory[] = data?.map(transaction => ({
      id: transaction.id,
      item_name: transaction.metadata?.itemName || "สินค้า",
      item_price: Math.abs(transaction.delta),
      balance_after: transaction.balance_after,
      action_key: transaction.action_key,
      created_at: transaction.created_at,
      metadata: transaction.metadata
    })) || [];

    return { ok: true, data: history };
  } catch (error) {
    console.error('Transaction history error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Adds coins to user's wallet (admin function)
 */
export async function addCoins(
  userId: string, 
  amount: number, 
  reason: string = "bonus"
): Promise<Result<{ new_balance: number }>> {
  try {
    const supabase = await createClient();
    
    if (amount <= 0) {
      return { ok: false, error: "จำนวนเหรียญต้องมากกว่า 0" };
    }

    const orderId = `bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const idempotencyKey = `${userId}_bonus_${orderId}`;

    const { data, error } = await supabase.rpc("apply_coin_delta", {
      p_user_id: userId,
      p_delta: amount,
      p_action_key: "add_coins",
      p_ref_id: orderId,
      p_metadata: { 
        reason: reason,
        amount: amount
      },
      p_idempotency_key: idempotencyKey,
      p_allow_negative: true
    });

    if (error) {
      console.error('Add coins RPC error:', error);
      return { ok: false, error: "เกิดข้อผิดพลาดในการเพิ่มเหรียญ" };
    }

    return { ok: true, data: { new_balance: data } };
  } catch (error) {
    console.error('Add coins error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets shop items by category
 */
export async function getShopItemsByCategory(category?: string): Promise<Result<ShopItem[]>> {
  try {
    const itemsResult = await getShopItems();
    if (!itemsResult.ok) {
      return itemsResult;
    }

    let filteredItems = itemsResult.data;
    
    if (category && category !== "all") {
      filteredItems = itemsResult.data.filter(item => item.type === category);
    }

    return { ok: true, data: filteredItems };
  } catch (error) {
    console.error('Category items error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Grants free avatar to user during signup
 */
export async function grantFreeAvatar(userId: string, avatarId: string): Promise<Result<PlayerInventory>> {
  try {
    // First verify this is a valid avatar item
    const itemsResult = await getShopItems();
    if (!itemsResult.ok) {
      return { ok: false, error: "ไม่สามารถตรวจสอบข้อมูลอวาตาร์ได้" };
    }

    const avatarItem = itemsResult.data.find(item => item.id === avatarId && item.type === 'avatar');
    if (!avatarItem) {
      return { ok: false, error: "อวาตาร์ไม่ถูกต้อง" };
    }

    // Only allow free avatars (price = 0) for signup
    if (avatarItem.price !== 0) {
      return { ok: false, error: "อวาตาร์นี้ไม่ใช่อวาตาร์ฟรีสำหรับการลงทะเบียน" };
    }

    // Add to user's inventory
    const inventoryResult = await addItemToInventory(userId, avatarId, 1);
    if (!inventoryResult.ok) {
      return inventoryResult;
    }

    // Also set as user's default avatar
    const supabase = await createClient();
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({ 
        user_id: userId,
        avatar_url: avatarId,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Profile update error:', profileError);
      return { ok: false, error: "ไม่สามารถตั้งค่าอวาตาร์เริ่มต้นได้" };
    }

    return inventoryResult;
  } catch (error) {
    console.error('Grant free avatar error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Gets free avatar items available for signup
 */
export async function getFreeAvatars(): Promise<Result<ShopItem[]>> {
  try {
    const itemsResult = await getShopItems();
    if (!itemsResult.ok) {
      return itemsResult;
    }

    const freeAvatars = itemsResult.data.filter(item => 
      item.type === 'avatar' && item.price === 0
    );

    return { ok: true, data: freeAvatars };
  } catch (error) {
    console.error('Get free avatars error:', error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
