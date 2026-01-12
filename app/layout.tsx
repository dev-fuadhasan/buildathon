import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MomsCare AI - 24/7 Pregnancy Support",
  description: "Get instant, personalized pregnancy guidance from AI — available anytime. Track your journey, upload prescriptions, and consult doctors when needed.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/favicon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ec4899" />
      </head>
      <body className={inter.className}>
        <GlobalErrorHandler />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => {
                      console.log('Service Worker registered');
                      
                      // Check for updates immediately
                      reg.update();
                      
                      // Check for updates every 5 minutes
                      setInterval(() => {
                        reg.update();
                      }, 300000);
                      
                      // Check for updates when page becomes visible
                      document.addEventListener('visibilitychange', () => {
                        if (!document.hidden) {
                          reg.update();
                        }
                      });
                      
                      // Listen for service worker updates
                      reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New service worker available, reload to activate
                              console.log('New service worker available, reloading...');
                              window.location.reload();
                            }
                          });
                        }
                      });
                    })
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
