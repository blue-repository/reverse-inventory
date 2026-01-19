import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./darkmode.css";
import { UserProvider } from "@/app/context/UserContext";
import { ThemeProvider } from "@/app/context/ThemeContext";
import UserIdentificationModal from "@/app/components/UserIdentificationModal";
import NavbarWrapper from "@/app/components/NavbarWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Farmacia Inventario - Gestión de Productos",
  description: "Sistema de gestión de inventario para farmacias con control de stock, lotes y reportes",
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
        <ThemeProvider>
          <UserProvider>
            <UserIdentificationModal />
            <NavbarWrapper />
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
