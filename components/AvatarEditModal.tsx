"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface AvatarEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  onAvatarSelect: (avatarId: string) => void;
  isLoading?: boolean;
}

const avatars = [
  { id: 'avatar-1', src: '/avatars/avatar1.webp', alt: 'Avatar 1' },
  { id: 'avatar-2', src: '/avatars/avatar2.webp', alt: 'Avatar 2' },
  { id: 'avatar-3', src: '/avatars/avatar3.webp', alt: 'Avatar 3' },
];

export default function AvatarEditModal({ 
  isOpen, 
  onClose, 
  currentAvatar, 
  onAvatarSelect,
  isLoading = false 
}: AvatarEditModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || 'avatar-1');

  const handleAvatarClick = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    onAvatarSelect(avatarId);
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
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-brown-medium" />
          </button>
        </div>

        {/* Avatar Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarClick(avatar.id)}
              disabled={isLoading}
              className={`relative aspect-square rounded-xl overflow-hidden border-4 transition-all hover:scale-105 active:scale-95
                ${selectedAvatar === avatar.id 
                  ? 'border-orange-dark shadow-lg' 
                  : 'border-gray-200 hover:border-brown-light'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Image
                src={avatar.src}
                alt={avatar.alt}
                fill
                className="object-cover"
              />
              
              {/* Selected indicator */}
              {selectedAvatar === avatar.id && (
                <div className="absolute inset-0 bg-orange-dark/20 flex items-center justify-center">
                  <div className="w-8 h-8 bg-orange-dark rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center text-brown-medium text-sm">
            กำลังอัปเดตอวาตาร์...
          </div>
        )}
      </div>
    </div>
  );
}
