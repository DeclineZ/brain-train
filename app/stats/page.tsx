import BottomNav from "@/components/BottomNav";

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF7] pb-24">
      <div className="mx-auto max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#3C2924] mb-2">สถิติ</h1>
          <p className="text-[#51433A]">ติดตามความก้าวหน้าและผลงานของคุณ</p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-[#EADFD6] rounded-2xl p-8 text-center">
          <div className="text-[#51433A] mb-4">
            <svg 
              className="w-16 h-16 mx-auto mb-4 text-[#C3A37F]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#3C2924] mb-2">ยังไม่มีข้อมูลสถิติ</h2>
          <p className="text-[#51433A]">เล่นเกมเพื่อเริ่มสะสมสถิติและความสำเร็จ</p>
        </div>

        {/* Coming Soon Sections */}
        <div className="mt-8 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#3C2924] mb-3">คะแนนรวม</h3>
            <div className="text-3xl font-bold text-[#D75931]">0</div>
            <p className="text-[#51433A] text-sm mt-1">คะแนนทั้งหมดที่สะสม</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#3C2924] mb-3">เกมที่เล่น</h3>
            <div className="text-3xl font-bold text-[#D75931]">0</div>
            <p className="text-[#51433A] text-sm mt-1">จำนวนเกมที่เล่นไปแล้ว</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#3C2924] mb-3">เวลาเล่น</h3>
            <div className="text-3xl font-bold text-[#D75931]">0 นาที</div>
            <p className="text-[#51433A] text-sm mt-1">เวลาที่ใช้ในการฝึกสมอง</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav active="stats" />
    </div>
  );
}
