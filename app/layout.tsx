import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LiveChatButtonWrapper from "@/components/LiveChatButtonWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MomsCare - AI-Powered Maternal Health Assistant",
  description: "Supporting pregnant mothers with AI-powered guidance and medical advice",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ec4899" />
      </head>
      <body className={inter.className}>
        {children}
        <LiveChatButtonWrapper />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => console.log('Service Worker registered'))
                    .catch((err) => console.log('Service Worker registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
