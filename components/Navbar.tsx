'use client'
import { Button } from "@/components/ui/button";
import { Plane, Languages, Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn-utils";
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";


const Navbar = () => {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  const navLinks = [
    { href: "/", label: t('nav.home') },
    { href: "/explore", label: t('nav.exploreFlights') },
    { href: "/request", label: t('nav.requestTicket') },
    { href: "/about", label: t('nav.about') },
    { href: "/contact", label: t('nav.contact') },
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Le <span className="text-primary">Bourgeois</span>
            </span>
          </Link>

          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="px-4">
                <div className="mt-8 flex flex-col gap-3">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "w-full px-3 py-2 rounded-md text-sm font-medium",
                          pathname === link.href ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <div className="pt-3 border-t border-border" />
                  <Select value={i18n.language} onValueChange={changeLanguage}>
                    <SelectTrigger className="h-10">
                      <Languages className="h-4 w-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <SheetClose asChild>
                    <Button variant="hero" size="sm" asChild className="mt-1">
                      <Link href="/request">{t('nav.bookFlight')}</Link>
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors",
                  pathname === link.href && "text-foreground bg-secondary"
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <Select value={i18n.language} onValueChange={changeLanguage}>
              <SelectTrigger className="w-[110px] h-9">
                <Languages className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="hero" size="sm" asChild className="hidden sm:inline-flex lg:inline-flex">
              <Link href="/request">{t('nav.bookFlight')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
