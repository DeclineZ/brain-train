"use client";

import { Search } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <Search className="w-5 h-5 text-[#51433A]" />
      </div>
      <input
        type="text"
        placeholder="อยากเล่นเกมอะไร?"
        value={query}
        onChange={handleChange}
        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-[#EADFD6] focus:outline-none focus:ring-2 focus:ring-[#D75931] focus:border-transparent text-[#3C2924] placeholder-[#51433A]"
      />
    </div>
  );
}
