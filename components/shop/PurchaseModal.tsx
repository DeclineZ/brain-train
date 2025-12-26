"use client";

import { Coins, X, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ShopItem, PurchaseResult } from "@/lib/server/shopAction";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShopItem | null;
  userBalance: number;
  onConfirm: (item: ShopItem) => Promise<void>;
}

export default function PurchaseModal({ 
  isOpen, 
  onClose, 
  item, 
  userBalance, 
  onConfirm 
}: PurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get icon based on item type
  const getItemIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      powerup: "💡",
      theme: "🎨",
      avatar: "👤",
      bonus: "🎁",
      weapon: "⚔️",
      consumable: "🧪",
      default: "📦"
    };
    return iconMap[type] || iconMap.default;
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!item) return;

    setIsProcessing(true);
    setError(null);

    try {
      // This will be handled by the parent component
      await onConfirm(item);
      // If successful, the parent will call showResult
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsProcessing(false);
    }
  };

  const showResult = (purchaseResult: PurchaseResult) => {
    setResult(purchaseResult);
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (result?.success) {
      // Trigger balance update event
      window.dispatchEvent(new Event('balanceUpdate'));
    }
    onClose();
  };

  if (!isOpen || !item) return null;

  const canAfford = userBalance >= item.price;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-medium">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-brown-900">
              {result ? "การซื้อสำเร็จ!" : "ยืนยันการซื้อ"}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-lighter rounded-full transition-colors"
              disabled={isProcessing}
            >
              <X className="w-6 h-6 text-brown-800" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!result ? (
            // Confirmation View
            <div className="space-y-6">
              {/* Item Details */}
              <div className="flex items-center gap-4 p-4 bg-cream rounded-xl">
                <div className="text-5xl">{getItemIcon(item.type)}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-brown-900">{item.name}</h3>
                  <p className="text-brown-800 text-sm">{item.description}</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-lighter rounded-lg">
                  <span className="text-brown-800 font-medium">ราคาสินค้า</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-orange-action" />
                    <span className="text-lg font-bold text-orange-action">{item.price}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-lighter rounded-lg">
                  <span className="text-brown-800 font-medium">เหรียญคงเหลือหลังซื้อ</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-orange-action" />
                    <span className="text-lg font-bold text-orange-action">
                      {userBalance - item.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              {!canAfford && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-red-700 text-sm">
                    เหรียญของคุณไม่พอสำหรับซื้อสินค้านี้
                  </span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}
            </div>
          ) : (
            // Success View
            <div className="space-y-6">
              {/* Success Message */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brown-900 mb-2">
                    {result.message}
                  </h3>
                  <p className="text-brown-800">
                    คุณได้รับ {item.name} แล้ว!
                  </p>
                </div>
              </div>

              {/* New Balance */}
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-green-700 text-sm mb-1">เหรียญคงเหลือ</p>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-6 h-6 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {result.new_balance.toLocaleString('th-TH')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-medium">
          <div className="flex gap-3">
            {!result ? (
              <>
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 border-2 border-gray-medium text-brown-800 rounded-xl font-semibold hover:bg-gray-lighter transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing || !canAfford}
                  className="flex-1 py-3 px-4 bg-orange-action text-white rounded-xl font-semibold hover:bg-orange-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังดำเนินการ...</span>
                    </div>
                  ) : (
                    "ยืนยันการซื้อ"
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-green-success text-white rounded-xl font-semibold hover:bg-green-success transition-colors"
              >
                ตกลง
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a method to update the result from parent
export function createPurchaseModalRef() {
  let modalRef: ((result: PurchaseResult) => void) | null = null;
  
  return {
    setRef: (ref: (result: PurchaseResult) => void) => {
      modalRef = ref;
    },
    showResult: (result: PurchaseResult) => {
      if (modalRef) modalRef(result);
    }
  };
}
