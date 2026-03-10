import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

// Prevent caching of authenticated pages to avoid security issues with browser back button
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TaskerAI",
  description: "AI Task Manager",
  icons: {
    icon: "/assets/images/taskeraiLogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inria+Sans:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#01162B] text-white overflow-hidden">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
