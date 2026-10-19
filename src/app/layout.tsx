import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const serif = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Ryan Kuah",
  description: "Projects by Ryan Kuah: apps, tools, games, and experiments.",
  metadataBase: new URL("https://ryankuah.com"),
  openGraph: {
    title: "Ryan Kuah",
    description: "Apps, tools, games, and experiments by Ryan Kuah.",
    images: [
      {
        url: "/images/social-preview.png",
        width: 1440,
        height: 1000,
        alt: "An illustrated forest campsite beneath a starry night sky",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} size-full overflow-hidden overscroll-none`}
    >
      <body className="size-full overflow-hidden overscroll-none bg-background font-sans text-[14px]/[1.7] text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
