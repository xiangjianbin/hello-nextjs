import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Spring FES Video",
  description: "故事转视频生成平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased font-sans">
        <ToastProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
