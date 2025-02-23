// src/app/layout.tsx
"use client";

import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import LoadingScreen from "../components/LoadingScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const AuthenticatedLayout = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";

  useEffect(() => {
    if (!isLoading && !user && !['/login', '/register'].includes(pathname)) {
      router.push("/login");
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading && !['/login', '/register'].includes(pathname)) {
    return <LoadingScreen />;
  }

  if (!user && !['/login', '/register'].includes(pathname)) {
    return <div>Redirecionando para a tela de login...</div>;
  }

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div>
      <header>
        <nav>
          <ul className="nav-menu">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/search">Buscar</Link>
            </li>
          </ul>
          {user && (
            <ul className="nav-menu logout-menu">
              <li>
                <Link href="#" onClick={handleLogout}>Logout</Link>
              </li>
            </ul>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; 2025 Consultas. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <AuthenticatedLayout>
            {children}
          </AuthenticatedLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
