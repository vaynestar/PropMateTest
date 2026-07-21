import "@/app/globals.css";

export const metadata = {
  title: "Print",
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen">
        {children}
      </body>
    </html>
  );
}
