import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Darshan Seeds Billing App",
  description: "દર્શન સીડ્સ ઇન્ડસ્ટ્રીઝ — ખરીદી, પેમેન્ટ અને રોજમેળ બિલિંગ એપ",
  appleWebApp: {
    capable: true,
    title: "Darshan Seeds Billing",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
