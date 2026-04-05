import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aura",
  description: "Your private, encrypted journal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-base-100 text-base-content">
        {/* Apply saved theme + font scale before first paint to avoid flash */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('aura-theme');if(t&&t!=='system'){document.documentElement.setAttribute('data-theme',t)}else{document.documentElement.setAttribute('data-theme',window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}}catch(e){}try{var s=localStorage.getItem('aura-font-scale');if(s)document.documentElement.style.fontSize=s+'%'}catch(e){}})();` }}
        />
        <ThemeProvider />
        {children}
        {/* FlyonUI interactive components (dropdowns, modals, etc.) */}
        <Script src="/flyonui.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
