import { Newsreader, Public_Sans } from "next/font/google";

const blogSerif = Newsreader({
  variable: "--font-blog-serif",
  subsets: ["latin"],
  display: "swap",
});

const blogSans = Public_Sans({
  variable: "--font-blog-sans",
  subsets: ["latin"],
  display: "swap",
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${blogSerif.variable} ${blogSans.variable}`}>
      {children}
    </div>
  );
}
