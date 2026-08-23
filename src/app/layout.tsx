import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MindCommit — Elon Musk Knowledge Twin",
  description: "Version-Controlled Knowledge Twin of Elon Musk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-[#e8e6e1]`}>
        {children}
      </body>
    </html>
  );
}
