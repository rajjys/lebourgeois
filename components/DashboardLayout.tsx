'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Plane, Building2, MapPin, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
    children: ReactNode;
}
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Airlines', href: '/dashboard/airlines', icon: <Building2 className="w-5 h-5" /> },
    { name: 'Airports', href: '/dashboard/airports', icon: <MapPin className="w-5 h-5" /> },
    { name: 'Flight Patterns', href: '/dashboard/flight-patterns', icon: <Plane className="w-5 h-5" /> },
  ];

  const isActive = (href: string) =>
    pathname === href

  return (
    <div className="min-h-screen flex bg-gray-100">

      {/* ---- MOBILE TOP NAV ---- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white shadow flex items-center justify-between px-4 z-40">
        <Link href="/" className="flex items-end gap-2 group p-4 border-b border-border">
          <Image
            src="/icon.png"
            alt="Le Bourgeois logo"
            width={40}
            height={40}
            className="h-5 w-5 object-contain"
          />
        </Link>
        <span className="ml-4 font-bold text-lg">Dashboard</span>
        <Button variant="outline" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* ---- MOBILE SIDEBAR ---- */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`
          fixed md:static z-50 top-0 left-0 h-full w-64 bg-white shadow-md
          transform transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header + Close button mobile */}
        <div className="flex items-center justify-between px-4 h-14 border-b md:hidden">
          <span className="font-semibold text-lg">Menu</span>
          <button onClick={() => setOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex flex-col h-screen pb-16">
            <Link href="/" className="flex items-end gap-2 group p-4 border-b border-border">
              <Image
                src="/icon.png"
                alt="Le Bourgeois logo"
                width={40}
                height={40}
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-bold text-foreground">
                Le <span className="text-primary">Bourgeois</span>
              </span>
            </Link>
          {/* Main menu */}
          <div className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition
                  ${isActive(item.href)
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}

          </div>

          {/* Footer link */}
          <div className="px-4 py-4 border-t">
            <Link
              href="/"
              className="flex items-center justify-center px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium text-sm"
            >
              Go to Website
            </Link>
          </div>
        </nav>
      </aside>

      {/* ---- PAGE CONTENT ---- */}
      <main className="p-4">{children}</main>
    </div>
  );
}
