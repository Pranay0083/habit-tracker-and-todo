import type { Metadata } from "next";
import ErrorReporter from "@/components/ErrorReporter";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habit Tracker & Todo",
  description: "Track your habits and manage your todos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
