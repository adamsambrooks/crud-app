import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRUD App - Employee Management',
  description: 'A modern employee management CRUD application built with Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {children}
      </body>
    </html>
  );
}
