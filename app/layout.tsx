import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rayane Yajjou — Portfolio",
  description:
    "Rayane Yajjou — engineering student at École Centrale Casablanca, seeking a final-year internship (PFE). Mathematics, machine learning, physics, software.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
