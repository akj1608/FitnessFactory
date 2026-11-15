import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fit Reset — Personal fitness coaching for everyone",
  description:
    "Generic multi-user fitness coach: personalize your profile, track daily habits, and get AI fitness advice.",
  appleWebApp: {
    capable: true,
    title: "Fit Reset",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f1a14" />
      </head>
      <body>{children}</body>
    </html>
  );
}
