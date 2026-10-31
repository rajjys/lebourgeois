'use client'
import { Button } from "@/components/ui/button";
import { Languages, Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn-utils";
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import CountryFlag from "react-country-flag"
import { SITE } from "@/lib/site";

// The navbar lists sections of the site, not actions: the search lives in the home hero,
// and the request form is reached from a failed search and the footer.
// Compagnies, Aéroports and État du réseau join when their pages exist (docs/PLAN.md, E-1 to E-3).
const Navbar = () => {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  const navLinks = [
    { href: "/explore", label: t('nav.flights') },
    { href: "/about", label: t('nav.about') },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link href="/" aria-label={`${SITE.name}, ${t('nav.home')}`}>
            <Logo />
          </Link>

          {/* Desktop */}
          <div className="hidden flex-1 items-center justify-between lg:flex">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(link.href)
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Select value={i18n.language} onValueChange={changeLanguage}>
              <SelectTrigger className="h-9 w-[84px]" aria-label="Langue / Language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">
                  <div className="flex items-center gap-2">
                    <CountryFlag countryCode="FR" svg style={{ width: "1em", height: "1em" }} />
                    FR
                  </div>
                </SelectItem>
                <SelectItem value="en">
                  <div className="flex items-center gap-2">
                    <CountryFlag countryCode="GB" svg style={{ width: "1em", height: "1em" }} />
                    EN
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: the button is on the right, so the panel opens from the right */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t('nav.openMenu')}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 px-4">
                <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
                <div className="mt-8 flex flex-col gap-1">
                  <SheetClose asChild>
                    <Link
                      href="/"
                      aria-current={pathname === "/" ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium",
                        pathname === "/" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {t('nav.home')}
                    </Link>
                  </SheetClose>
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={isActive(link.href) ? "page" : undefined}
                        className={cn(
                          "rounded-md px-3 py-2 text-sm font-medium",
                          isActive(link.href)
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}

                  <div className="my-3 border-t border-border" />

                  <Select value={i18n.language} onValueChange={changeLanguage}>
                    <SelectTrigger className="h-10" aria-label="Langue / Language">
                      <Languages className="mr-1 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">
                        <div className="flex items-center gap-4">
                          <CountryFlag countryCode="FR" svg style={{ width: "1em", height: "1em" }} />
                          Français
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-4">
                          <CountryFlag countryCode="GB" svg style={{ width: "1em", height: "1em" }} />
                          English
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
