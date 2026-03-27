import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "素质学分管理平台",
  description: "大学生综合能力量化与追踪系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
