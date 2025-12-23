import BottomNav from "@/components/BottomNav";
import TopCard from "@/components/TopCard";

export default function Shop() {
    return (
        <div className="min-h-screen bg-[#FFFDF7]">
            <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
                <div className="mt-8 flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-6xl mb-4">🏪</div>
                    <h1 className="text-2xl font-bold text-[#5D4037] mb-2">ร้านค้า</h1>
                    <p className="text-[#8B5E3C]">ฟีเจอร์นี้กำลังมาเร็วๆ นี้!</p>
                </div>
            </div>
            <BottomNav active="shop" />
        </div>
    );
}
