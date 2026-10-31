'use client'
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Languages, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn-utils";
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import CountryFlag from "react-country-flag"
import { SITE } from "@/lib/site";
import { SEARCH_ANCHOR } from "@/lib/links";

// Logo left, sections in the middle, the search button and language on the right.
// The search button is the only way to /explore, so there is no "Vols" link doing the same.
// Vols (route index), Compagnies and Aéroports join when their pages exist (docs/PLAN.md, RW-5, E-1, E-2).
const Navbar = () => {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  const navLinks = [
    { href: "/about", label: t('nav.about') },
    { href: "/contact", label: t('nav.contact') },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    );

  // Where a search form is on the page, bring it back into view instead of reloading.
  const goToSearch = (event: MouseEvent<HTMLAnchorElement>) => {
    const form = document.getElementById(SEARCH_ANCHOR);
    if (!form) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    form.querySelector<HTMLElement>('[role="combobox"]')?.focus({ preventScroll: true });
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[auto_1fr] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <Link href="/" aria-label={`${SITE.name}, ${t('nav.home')}`} className="justify-self-start">
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={linkClass(isActive(link.href))}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 justify-self-end">
            <Button asChild size="sm" className="h-9">
              <Link href="/explore" onClick={goToSearch}>
                <Search className="size-4" aria-hidden="true" />
                <span className="max-[359px]:sr-only">{t('nav.search')}</span>
              </Link>
            </Button>

            <Select value={i18n.language} onValueChange={changeLanguage}>
              <SelectTrigger className="hidden h-9 w-[84px] lg:flex" aria-label="Langue / Language">
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

            {/* Mobile: the button is on the right, so the panel opens from the right */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label={t('nav.openMenu')}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              {/* A navigation list needs no description; Radix asks for the explicit opt-out. */}
              <SheetContent side="right" className="w-72 px-4" aria-describedby={undefined}>
                <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
                <div className="mt-8 flex flex-col gap-1">
                  {[{ href: "/", label: t('nav.home') }, ...navLinks].map((link) => {
                    const active = link.href === "/" ? pathname === "/" : isActive(link.href);
                    return (
                      <SheetClose asChild key={link.href}>
                        <Link href={link.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                          {link.label}
                        </Link>
                      </SheetClose>
                    );
                  })}

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
