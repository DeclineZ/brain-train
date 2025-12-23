"use client";

import BalanceDisplay from "@/components/shop/BalanceDisplay";
import ShopItemCard from "@/components/shop/ShopItemCard";
import PurchaseModal from "@/components/shop/PurchaseModal";
import CategoryTabs from "@/components/shop/CategoryTabs";
import type { ShopItem, UserBalance } from "@/lib/server/shopAction";
import { useState} from "react";

import AddCoinsButton from "./DEL_AddCoinsButton";

export default function ShopContent({ userId, initialBalance, initialItems }: {
  userId: string | null;
  initialBalance: UserBalance;
  initialItems: ShopItem[];
}) {
  const [userBalance, setUserBalance] = useState<UserBalance>(initialBalance);
  const [items, setItems] = useState<ShopItem[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filter items when category changes
  const handleCategoryChange = async (category: string) => {
    setActiveCategory(category);
    
    if (category === "all") {
      setFilteredItems(items);
    } else if (userId) {
      try {
        const response = await fetch(`/api/shop?userId=${userId}&category=${category}`);
        const result = await response.json();
        
        if (result.items) {
          setFilteredItems(result.items);
        } else {
          showToast(result.error || "เกิดข้อผิดพลาด", "error");
        }
      } catch (error) {
        showToast("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
      }
    }
  };

  // Handle purchase
  const handlePurchase = async (item: ShopItem) => {
    if (!userId) return;

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          itemId: item.id
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Update balance and trigger refresh
        setUserBalance(prev => ({ 
          ...prev, 
          balance: result.new_balance,
          updated_at: new Date().toISOString()
        }));
        
        // Show success in modal
        setIsModalOpen(false);
        
        // Show success toast
        showToast(result.message || "ซื้อสำเร็จ!", "success");
        
        // Trigger balance update for other components
        window.dispatchEvent(new Event('balanceUpdate'));
      } else {
        // Show error toast
        showToast(result.error || "เกิดข้อผิดพลาด", "error");
      }
    } catch (error) {
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Simple toast function
  const showToast = (message: string, type: "success" | "error") => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg text-white font-medium ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // Handle purchase button click
  const handlePurchaseClick = (item: ShopItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Balance Display */}
        <BalanceDisplay userId={userId} />

        {/* Add Coins Button */}
        <AddCoinsButton 
          userId={userId}
          onBalanceUpdate={(newBalance) => {
            setUserBalance(prev => ({ 
              ...prev, 
              balance: newBalance,
              updated_at: new Date().toISOString()
            }));
          }}
        />

        {/* Category Tabs */}
        <CategoryTabs 
          activeCategory={activeCategory} 
          onCategoryChange={handleCategoryChange}
          items={items}
        />

        {/* Shop Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              userBalance={userBalance.balance}
              onPurchase={handlePurchaseClick}
              isLoading={isProcessing}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-[#5D4037] mb-2">ไม่มีสินค้าในหมวดหมู่นี้</h3>
            <p className="text-[#8B5E3C]">ลองเลือกหมวดหมู่อื่นดูนะครับ</p>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        userBalance={userBalance.balance}
        onConfirm={handlePurchase}
      />
    </>
  );
}
