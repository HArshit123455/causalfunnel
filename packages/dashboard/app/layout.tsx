import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CausalFunnel Analytics',
  description: 'User analytics dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b px-6 py-3 flex items-center justify-between">
              <div className="font-semibold">CausalFunnel Analytics</div>
              <nav className="flex gap-4 text-sm">
                <a href="/sessions" className="hover:underline">Sessions</a>
                <a href="/heatmap" className="hover:underline">Heatmap</a>
                <a href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/demo/`} className="hover:underline" target="_blank" rel="noreferrer">Demo</a>
              </nav>
            </header>
            <main className="flex-1 p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
