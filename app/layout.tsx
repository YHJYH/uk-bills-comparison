export const metadata = {
  title: "UK Bills Comparison",
  description: "Compare and share average household bills across the UK",
};

import "../styles/globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
