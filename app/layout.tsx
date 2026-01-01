import type { Metadata } from "next";
import { Sarabun, Geist_Mono, Mali } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/app/providers/ThemeProvider";

import TopBar from "@/components/TopBar";
import TopBarWrapper from "@/components/TopBarWrapper";



import { MotionProvider } from "@/app/providers/MotionProvider";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
});

const mali = Mali({
  variable: "--font-mali",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme");

  return (
    <html lang="th">
      <body
        className={`${sarabun.variable} ${geistMono.variable} ${mali.variable} antialiased`}
      >
        <ThemeProvider initialTheme={(themeCookie?.value as "default" | "pastel") || "default"}>
          <MotionProvider>
            <TopBarWrapper>
              <TopBar />
            </TopBarWrapper>
            {children}
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
