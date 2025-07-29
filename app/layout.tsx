import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "./contexts/Web3Context";
import { NotificationProvider } from "./contexts/NotificationContext";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DATACOIN dApp - Decentralized Token Management",
  description: "Manage your DATACOIN tokens with MetaMask integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NotificationProvider>
          <Web3Provider>
            <Header />
            {children}
          </Web3Provider>
        </NotificationProvider>
      </body>
    </html>
  );
}
