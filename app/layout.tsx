import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Thai, Geist } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-thai",
  subsets: ["thai", "latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EDI REPORT SYSTEM",
  description: "ระบบจัดการข้อมูลหลัก EDI สำหรับลูกค้าและสินค้า",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", inter.variable, ibmPlexThai.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
