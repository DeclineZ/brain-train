import type { Metadata } from "next";
import { Sarabun, Geist_Mono } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brain Train - เกมฝึกสมอง",
  description: "เกมฝึกสมองเพื่อพัฒนาทักษะการใช้เหตุผลและการประมวลผลข้อมูล",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${sarabun.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
