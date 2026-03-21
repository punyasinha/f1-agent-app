import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Data Agent",
  description: "Ask questions about Formula 1 history using natural language",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
