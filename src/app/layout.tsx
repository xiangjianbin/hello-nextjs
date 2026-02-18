import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
