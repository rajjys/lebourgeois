'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plane,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SIDEBAR_COOKIE } from '@/lib/backoffice';
import { cn } from '@/lib/utils/cn-utils';

// Back office: desktop-first (docs/DESIGN-SYSTEM.md#navigation).
// The sidebar docks to an icon rail; the choice is kept in a cookie so the server renders it right.

type NavItem = { name: string; href: string; icon: LucideIcon };
type NavGroup = { label?: string; items: NavItem[] };

// Users and settings join "Administration" when those pages exist (docs/PLAN.md, O-11 and O-12).
const navGroups: NavGroup[] = [
  { items: [{ name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard }] },
  {
    label: 'Données de vol',
    items: [
      { name: 'Programmes de vol', href: '/dashboard/flight-patterns', icon: CalendarDays },
      { name: 'Compagnies', href: '/dashboard/airlines', icon: Plane },
      { name: 'Aéroports', href: '/dashboard/airports', icon: MapPin },
    ],
  },
  {
    label: 'Clients',
    items: [
      { name: 'Demandes', href: '/dashboard/requests', icon: Inbox },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    ],
  },
  { label: 'Administration', items: [{ name: 'Système de design', href: '/dashboard/design', icon: Palette }] },
];

const itemClass = (active: boolean) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-accent text-accent-foreground font-semibold'
      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  );

/** Shows the label as a tooltip when the rail is collapsed; a plain wrapper otherwise. */
function RailTip({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavLinks({ pathname, collapsed = false }: { pathname: string; collapsed?: boolean }) {
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {navGroups.map((group, index) => (
        <div key={group.label ?? index} className={cn(index > 0 && 'mt-4')}>
          {group.label &&
            (collapsed ? (
              <div className="mx-3 mb-2 border-t" role="presentation" />
            ) : (
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            ))}
          <div className="space-y-1">
            {group.items.map(({ name, href, icon: Icon }) => (
              <RailTip key={href} label={name} collapsed={collapsed}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={cn(itemClass(isActive(href)), collapsed && 'justify-center px-0')}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className={cn(collapsed && 'sr-only')}>{name}</span>
                </Link>
              </RailTip>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function SecondaryActions({ collapsed = false }: { collapsed?: boolean }) {
  const cls = cn(itemClass(false), 'w-full', collapsed && 'justify-center px-0');
  return (
    <>
      <RailTip label="Voir le site" collapsed={collapsed}>
        <Link href="/" className={cls}>
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
          <span className={cn(collapsed && 'sr-only')}>Voir le site</span>
        </Link>
      </RailTip>
      <form action="/api/auth/logout" method="post">
        <RailTip label="Se déconnecter" collapsed={collapsed}>
          <button type="submit" className={cls}>
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            <span className={cn(collapsed && 'sr-only')}>Se déconnecter</span>
          </button>
        </RailTip>
      </form>
    </>
  );
}

export default function DashboardLayout({
  children,
  defaultCollapsed = false,
}: {
  children: ReactNode;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  // Ctrl+B / Cmd+B docks or undocks the sidebar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b' && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const toggleLabel = collapsed ? 'Déplier le menu' : 'Réduire le menu';

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background md:flex">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'hidden md:flex md:shrink-0 md:flex-col md:border-r md:bg-muted md:h-screen md:sticky md:top-0 transition-[width] duration-200',
            collapsed ? 'md:w-16' : 'md:w-60',
          )}
        >
          <div className={cn('flex h-14 items-center border-b', collapsed ? 'justify-center' : 'px-4')}>
            <Link href="/dashboard" aria-label="Tableau de bord">
              {collapsed ? <LogoMark className="size-7" /> : <Logo markClassName="size-7" />}
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3" aria-label="Back office">
            <NavLinks pathname={pathname} collapsed={collapsed} />
          </nav>
          <div className="space-y-1 border-t p-3">
            <SecondaryActions collapsed={collapsed} />
            <RailTip label={`${toggleLabel} (Ctrl+B)`} collapsed={collapsed}>
              <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                className={cn(itemClass(false), 'w-full', collapsed && 'justify-center px-0')}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span className={cn('whitespace-nowrap', collapsed && 'sr-only')}>{toggleLabel}</span>
                {!collapsed && (
                  <kbd className="ml-auto whitespace-nowrap rounded border bg-background px-1.5 text-xs font-normal text-muted-foreground">
                    Ctrl B
                  </kbd>
                )}
              </button>
            </RailTip>
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
            <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border bg-popover p-2 shadow-popover">
              <NavLinks pathname={pathname} />
              <div className="mt-3 space-y-1 border-t pt-2">
                <SecondaryActions />
              </div>
            </div>
          </details>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </TooltipProvider>
  );
}
