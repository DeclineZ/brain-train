"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, CheckCircle2 } from "lucide-react";

interface ShopItemWithOwnership {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  image?: string;
  created_at: string;
  item_key:string;
  updated_at: string;
  isOwned: boolean;
  quantity?: number;
}

interface AvatarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  onAvatarSelect: (avatarId: string) => void;
  isLoading?: boolean;
  userId?: string | null;
}

export default function AvatarEditModal({ 
  isOpen, 
  onClose, 
  currentAvatar, 
  onAvatarSelect,
  isLoading = false,
  userId 
}: AvatarEditModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');
  const [ownedAvatars, setOwnedAvatars] = useState<ShopItemWithOwnership[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch owned avatars when modal opens or userId changes
  useEffect(() => {
    if (isOpen && userId) {
      fetchOwnedAvatars();
    }
  }, [isOpen, userId]);

  const fetchOwnedAvatars = async () => {
    if (!userId) return;
    
    setAvatarsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/shop/avatars/owned?userId=${userId}`);
      const result = await response.json();
      
      if (!result.ok) {
        setError(result.error || 'ไม่สามารถโหลดอวาตาร์ได้');
        setOwnedAvatars([]);
        return;
      }
      
      const avatars = result.data.filter((item: { isOwned: boolean; }) => item.isOwned);
      setOwnedAvatars(avatars);
      
      // Set selected avatar if not already set
      if (!selectedAvatar && avatars.length > 0) {
        const current = avatars.find((a: { id: string ; }) => a.id === currentAvatar);
        setSelectedAvatar(current ? current.id : avatars[0].id);
      }
    } catch (error) {
      console.error('Error fetching owned avatars:', error);
      setError('เกิดข้อผิดพลาดในการโหลดอวาตาร์');
    } finally {
      setAvatarsLoading(false);
    }
  };

  const handleAvatarClick = (avatarId: string) => {
    if (isLoading || avatarsLoading) return;
    
    setSelectedAvatar(avatarId);
    onAvatarSelect(avatarId);
  };

  const getAvatarImagePath = (avatar: ShopItemWithOwnership): string => {
    if (avatar.image) {
      return `/${avatar.image}`;
    }
    
    // Fallback to construct path from avatar ID
    const avatarNumber = avatar.id.replace('avatar-', '');
    return `/avatars/avatar-${avatarNumber}.webp`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-brown-darkest">เลือกอวาตาร์</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            disabled={isLoading || avatarsLoading}
          >
            <X className="w-5 h-5 text-brown-medium" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Avatar Grid */}
        {avatarsLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-action border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-brown-medium text-sm">กำลังโหลดอวาตาร์...</p>
            </div>
          </div>
        ) : ownedAvatars.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-bold text-brown-800 mb-2">คุณยังไม่มีอวาตาร์</h3>
            <p className="text-brown-light text-sm">ไปที่ร้านค้าเพื่อซื้ออวาตาร์เพิ่มเติม</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {ownedAvatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarClick(avatar.item_key)}
                disabled={isLoading || avatarsLoading}
                className={`relative aspect-square rounded-xl overflow-hidden border-4 transition-all hover:scale-105 active:scale-95
                  ${selectedAvatar === avatar.id 
                    ? 'border-orange-dark shadow-lg' 
                    : 'border-gray-200 hover:border-brown-light'
                  }
                  ${isLoading || avatarsLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <Image
                  src={getAvatarImagePath(avatar)}
                  alt={avatar.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // Fallback to default avatar if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-tan-light to-yellow-light">
                          👤
                        </div>
                      `;
                    }
                  }}
                />
                
                {/* Selected indicator */}
                {selectedAvatar === avatar.id && (
                  <div className="absolute inset-0 bg-orange-dark/20 flex items-center justify-center">
                    <div className="w-8 h-8 bg-orange-dark rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                
                {/* Avatar name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium text-center truncate">
                    {avatar.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Avatar Info */}
        {selectedAvatar && ownedAvatars.length > 0 && (
          <div className="text-center mb-4">
            <p className="text-sm text-brown-medium">คุณเลือก:</p>
            <p className="font-bold text-brown-800">
              {ownedAvatars.find(a => a.id === selectedAvatar)?.name}
            </p>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center text-brown-medium text-sm mb-4">
            กำลังอัปเดตอวาตาร์...
          </div>
        )}

        {/* Retry button for error state */}
        {error && !avatarsLoading && (
          <button
            onClick={fetchOwnedAvatars}
            disabled={isLoading}
            className="w-full py-2 bg-orange-action hover:bg-orange-hover text-white font-semibold rounded-xl transition-all"
          >
            ลองใหม่
          </button>
        )}
      </div>
    </div>
  );
}
