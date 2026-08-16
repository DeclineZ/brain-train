import Link from "next/link";
import { getAuthMode } from "@/lib/server/vitalmind/config";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "ไม่พบตั๋วเข้าใช้งาน กรุณาเปิดเกมจาก Vitalmind อีกครั้ง",
  used: "ตั๋วเข้าใช้งานนี้ถูกใช้แล้ว กรุณาเปิดเกมจาก Vitalmind อีกครั้ง",
  invalid: "ตั๋วเข้าใช้งานไม่ถูกต้องหรือหมดอายุแล้ว",
  upstream: "Vitalmind ยังไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่ภายหลัง",
  configuration: "ระบบเชื่อมต่อ Vitalmind ยังตั้งค่าไม่สมบูรณ์",
  identity: "ไม่สามารถเตรียมบัญชีเกมได้ กรุณาติดต่อผู้ดูแลระบบ",
  unexpected: "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง",
};

export default async function VitalmindRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.unexpected : null;
  const dualMode = getAuthMode() === "dual";

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center p-6 text-brown-900">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold mb-4">เปิดเกมผ่าน Vitalmind</h1>
        <p className="text-brown-600 mb-6">
          กรุณาเข้าสู่ระบบที่ Vitalmind แล้วเลือกเมนูเกมฝึกสมองเพื่อเข้าใช้งานอย่างปลอดภัย
        </p>
        {message && <p className="rounded-xl bg-red-50 p-4 text-red-700 mb-6">{message}</p>}
        {dualMode && (
          <Link href="/login" className="inline-flex rounded-xl bg-orange-action px-6 py-3 font-bold text-white">
            ใช้ระบบเข้าสู่ระบบเดิม
          </Link>
        )}
      </section>
    </main>
  );
}
