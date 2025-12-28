"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

interface AvatarSelectionProps {
  onAvatarSelected: (avatarId: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export default function AvatarSelection({ 
  onAvatarSelected, 
  onSkip, 
  isLoading = false 
}: AvatarSelectionProps) {
  const [freeAvatars, setFreeAvatars] = useState<ShopItem[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchFreeAvatars();
  }, []);

  const fetchFreeAvatars = async () => {
    setAvatarsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/shop/free-avatars');
      const result = await response.json();
      
      if (!result.ok) {
        setError(result.error || 'ไม่สามารถโหลดอวาตาร์ได้');
        setFreeAvatars([]);
        return;
      }
      
      const avatars = result.data;
      setFreeAvatars(avatars);
      
      // Select first avatar by default
      if (avatars.length > 0) {
        setSelectedAvatar(avatars[0].id);
      }
    } catch (error) {
      console.error('Error fetching free avatars:', error);
      setError('เกิดข้อผิดพลาดในการโหลดอวาตาร์');
    } finally {
      setAvatarsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAvatar) return;
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/signup/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarId: selectedAvatar }),
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        setError(result.error || 'ไม่สามารถเลือกอวาตาร์ได้');
        return;
      }

      setSuccess('เลือกอวาตาร์สำเร็จ!');
      onAvatarSelected(selectedAvatar);
    } catch (error) {
      console.error('Error selecting avatar:', error);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  if (avatarsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-action mb-4" />
        <p className="text-brown-medium">กำลังโหลดอวาตาร์...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😅</div>
        <h3 className="text-lg font-bold text-brown-800 mb-2">เกิดข้อผิดพลาด</h3>
        <p className="text-brown-light text-sm mb-4">{error}</p>
        <button
          onClick={fetchFreeAvatars}
          disabled={isLoading}
          className="px-6 py-2 bg-orange-action hover:bg-orange-hover text-white font-semibold rounded-xl transition-all"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  if (freeAvatars.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😅</div>
        <h3 className="text-lg font-bold text-brown-800 mb-2">ไม่มีอวาตาร์ฟรีในขณะนี้</h3>
        <p className="text-brown-light text-sm mb-4">คุณสามารถเลือกอวาตาร์ได้ในภายหลังที่ร้านค้า</p>
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isLoading}
            className="px-6 py-2 bg-orange-action hover:bg-orange-hover text-white font-semibold rounded-xl transition-all"
          >
            ข้ามไปก่อน
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brown-800 mb-2">เลือกอวาตาร์ของคุณ</h2>
        <p className="text-brown-medium">เลือกอวาตาร์ฟรี 1 ตัวเพื่อเริ่มต้นการเดินทาง</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-xl text-center">
          {success}
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Avatar Grid */}
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        {freeAvatars.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => setSelectedAvatar(avatar.id)}
            disabled={submitting}
            className={`relative aspect-square rounded-xl overflow-hidden border-4 transition-all hover:scale-105 active:scale-95
              ${selectedAvatar === avatar.id 
                ? 'border-orange-dark shadow-lg' 
                : 'border-gray-200 hover:border-brown-light'
              }
              ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {avatar.image ? (
              <Image
                src={`/${avatar.image}`}
                alt={avatar.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-tan-light to-yellow-light">
                👤
              </div>
            )}
            
            {/* Selected indicator */}
            {selectedAvatar === avatar.id && (
              <div className="absolute inset-0 bg-orange-dark/20 flex items-center justify-center">
                <div className="w-8 h-8 bg-orange-dark rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected Avatar Name */}
      {selectedAvatar && (
        <div className="text-center">
          <p className="text-sm text-brown-medium">คุณเลือก:</p>
          <p className="font-bold text-brown-800">
            {freeAvatars.find(a => a.id === selectedAvatar)?.name}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={!selectedAvatar || submitting || isLoading}
          className="w-full py-3 bg-orange-action hover:bg-orange-hover disabled:bg-gray-medium disabled:text-gray-text text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <span>เริ่มต้นใช้งาน</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={submitting || isLoading}
            className="w-full py-3 bg-white hover:bg-cream disabled:bg-gray-100 disabled:text-gray-text text-brown-medium font-semibold rounded-xl border-2 border-brown-border hover:border-orange-action transition-all"
          >
            ข้ามไปก่อน
          </button>
        )}
      </div>
    </div>
  );
}
