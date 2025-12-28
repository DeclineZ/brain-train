"use client";

import BalanceDisplay from "@/components/shop/BalanceDisplay";
import ShopItemCard from "@/components/shop/ShopItemCard";
import PurchaseModal from "@/components/shop/PurchaseModal";
import CategoryTabs from "@/components/shop/CategoryTabs";
import type { ShopItemWithOwnership, UserBalance } from "@/lib/server/shopAction";
import { useState } from "react";
import { useTheme } from "@/app/providers/ThemeProvider";


export default function ShopContent({ userId, initialBalance, initialItems }: {
  userId: string | null;
  initialBalance: UserBalance;
  initialItems: ShopItemWithOwnership[];
}) {
  const [userBalance, setUserBalance] = useState<UserBalance>(initialBalance);
  const [items, setItems] = useState<ShopItemWithOwnership[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<ShopItemWithOwnership[]>(initialItems.filter(item => item.type === "theme"));
  const [activeCategory, setActiveCategory] = useState<string>("theme");
  const [selectedItem, setSelectedItem] = useState<ShopItemWithOwnership | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filter items when category changes
  const handleCategoryChange = async (category: string) => {
    setActiveCategory(category);

    // Filter locally since we already have ownership data
    const filtered = items.filter(item => item.type === category);
    setFilteredItems(filtered);
  };

  // Handle purchase
  const handlePurchase = async (item: ShopItemWithOwnership) => {
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
        // Update balance
        setUserBalance(prev => ({
          ...prev,
          balance: result.new_balance,
          updated_at: new Date().toISOString()
        }));

        // Update item ownership status locally
        const updatedItems = items.map(i =>
          i.id === item.id ? { ...i, isOwned: true } : i
        );
        setItems(updatedItems);
        setFilteredItems(updatedItems.filter(i => i.type === activeCategory));


        // Close modal and show success
        setIsModalOpen(false);
        showToast(result.message || "ซื้อสำเร็จ!", "success");

        // Trigger balance update for other components
        window.dispatchEvent(new Event('balanceUpdate'));
      } else {
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
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg text-white font-medium ${type === 'success' ? 'bg-green-success' : 'bg-red-600'
      }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // Handle purchase button click
  const handlePurchaseClick = (item: ShopItemWithOwnership) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const { theme, setTheme } = useTheme();

  const handleEquip = async (item: ShopItemWithOwnership) => {
    if (item.type === "theme") {
      setIsProcessing(true);
      try {
        const response = await fetch('/api/user/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId: item.id }),
        });

        if (response.ok) {
          // Helper to map ID to visual key (simplified logic from StatsPage)
          const visualKey = item.name.toLowerCase().includes("pastel") ? "pastel" : "default";
          setTheme(visualKey);
          showToast(`เปลี่ยนธีมเป็น ${item.name} แล้ว!`, "success");
        } else {
          showToast("ไม่สามารถเปลี่ยนธีมได้", "error");
        }
      } catch (error) {
        showToast("เกิดข้อผิดพลาด", "error");
      } finally {
        setIsProcessing(false);
      }
    } else {
      showToast("ยังไม่สามารถใช้งานไอเทมนี้ได้ในขณะนี้", "error");
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Balance Display */}
        <BalanceDisplay userId={userId} />

        {/* Category Tabs */}
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          items={items}
        />

        {/* Shop Items Grid - 2-column mobile-first layout */}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              userBalance={userBalance.balance}
              onPurchase={handlePurchaseClick}
              onEquip={handleEquip}
              isLoading={isProcessing}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-brown-800 mb-2">ไม่มีสินค้าในหมวดหมู่นี้</h3>
            <p className="text-brown-light">ลองเลือกหมวดหมู่อื่นดูนะครับ</p>
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
