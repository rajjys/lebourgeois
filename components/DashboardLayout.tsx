'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, Building2, MapPin, LayoutDashboard, FileText, Palette, ExternalLink, LogOut, Menu } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils/cn-utils';

// Back office: desktop-first (docs/DESIGN-SYSTEM.md#back-office). Small screens get a simple menu.
const navItems = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Demandes', href: '/dashboard/requests', icon: FileText },
  { name: 'Compagnies', href: '/dashboard/airlines', icon: Building2 },
  { name: 'Aéroports', href: '/dashboard/airports', icon: MapPin },
  { name: 'Programmes de vol', href: '/dashboard/flight-patterns', icon: Plane },
  { name: 'Système de design', href: '/dashboard/design', icon: Palette },
];

function NavLinks({ pathname }: { pathname: string }) {
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {navItems.map(({ name, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive(href)
              ? 'bg-accent text-accent-foreground font-semibold'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {name}
        </Link>
      ))}
    </>
  );
}

function SecondaryActions() {
  return (
    <>
      <Link
        href="/"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
        Voir le site
      </Link>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Se déconnecter
        </button>
      </form>
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-muted md:h-screen md:sticky md:top-0">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/dashboard" aria-label="Tableau de bord">
            <Logo markClassName="size-7" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Back office">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="space-y-1 border-t p-3">
          <SecondaryActions />
        </div>
      </aside>

      {/* Small screens: logo + native disclosure menu, no client state */}
      <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
        <Link href="/dashboard" aria-label="Tableau de bord">
          <Logo markClassName="size-7" />
        </Link>
        <details className="relative">
          <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border border-input">
            <Menu className="size-5" aria-hidden="true" />
            <span className="sr-only">Menu</span>
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-64 space-y-1 rounded-lg border bg-popover p-2 shadow-popover">
            <NavLinks pathname={pathname} />
            <div className="border-t pt-1">
              <SecondaryActions />
            </div>
          </div>
        </details>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
