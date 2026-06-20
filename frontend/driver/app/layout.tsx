import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { I18nProvider } from "@/lib/i18n";

const googleSans = Google_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DriveLanka - Driver Dashboard",
  description: "Real-time bus tracking & headway advisory for Sri Lanka",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", "font-sans", googleSans.variable)}>
      <body className="min-h-full flex flex-col">
        <SidebarProvider>
          <I18nProvider>{children}</I18nProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
