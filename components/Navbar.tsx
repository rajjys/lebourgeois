'use client'
import { useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { House, Info, Menu, MessageCircle, Search, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils/cn-utils";
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import CountryFlag from "react-country-flag"
import { SITE } from "@/lib/site";
import { SEARCH_ANCHOR, VOLS_HREF } from "@/lib/links";

const WHATSAPP_DISPLAY = SITE.whatsapp.replace(/^\+(\d{3})(\d{3})(\d{3})(\d{3})$/, "+$1 $2 $3 $4");
const WHATSAPP_HREF = `https://wa.me/${SITE.whatsapp.replace(/^\+/, "")}`;
const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const;

// Logo left, sections in the middle (Accueil, À propos, Contact), the search button and language on the right.
// The button opens /vols, which is both the search and the route index (RW-5), so there is no "Vols" link doing the same.
// Compagnies and Aéroports join when their pages exist (E-1, E-2).
// Phones (owner, 2026-11-02): a round search icon instead of the full button, so it does not compete with
// the page's own button; a borderless menu icon; a menu with large links, one search button, a FR | EN
// switch, and WhatsApp and "report a mistake" at the bottom.
const Navbar = () => {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // The menu's search button on a page with a search form: scroll there once the menu has closed
  // (while it is open the page cannot scroll, and closing hands focus back to the menu button).
  const searchAfterClose = useRef(false);

  const navLinks = [
    { href: "/", label: t('nav.home'), icon: House },
    { href: "/about", label: t('nav.about'), icon: Info },
    { href: "/contact", label: t('nav.contact'), icon: MessageCircle },
  ];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    );

  // Where a search form is on the page, bring it back into view instead of reloading.
  const scrollToSearch = () => {
    const form = document.getElementById(SEARCH_ANCHOR);
    if (!form) return;
    requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      form.querySelector<HTMLElement>('[role="combobox"]')?.focus({ preventScroll: true });
    });
  };
  const goToSearch = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!document.getElementById(SEARCH_ANCHOR)) return;
    event.preventDefault();
    scrollToSearch();
  };
  const menuSearch = (event: MouseEvent<HTMLAnchorElement>) => {
    if (document.getElementById(SEARCH_ANCHOR)) {
      event.preventDefault();
      searchAfterClose.current = true;
    }
    setMenuOpen(false);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  const language = i18n.language?.startsWith("en") ? "en" : "fr";
  const reportHref = pathname === "/contact" ? "/contact?sujet=erreur" : `/contact?${new URLSearchParams({ sujet: "erreur", page: pathname })}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid h-14 grid-cols-[auto_1fr] items-center gap-2 sm:h-16 sm:gap-4 lg:grid-cols-[1fr_auto_1fr]">
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

          <div className="flex items-center gap-1 justify-self-end sm:gap-2">
            {/* Phones: a round icon, tinted, so the page's own pink button stays the one to press. */}
            <Link
              href={VOLS_HREF}
              onClick={goToSearch}
              aria-label={t('nav.search')}
              className="inline-flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
            >
              <Search className="size-5" aria-hidden="true" />
            </Link>
            <Button asChild size="sm" className="hidden h-9 sm:inline-flex">
              <Link href={VOLS_HREF} onClick={goToSearch}>
                <Search className="size-4" aria-hidden="true" />
                {t('nav.search')}
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
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                  aria-label={t('nav.openMenu')}
                >
                  <Menu className="size-6" aria-hidden="true" />
                </button>
              </SheetTrigger>
              {/* A navigation list needs no description; Radix asks for the explicit opt-out. */}
              <SheetContent
                ref={menuRef}
                side="right"
                showClose={false}
                className="flex w-[min(20rem,88vw)] flex-col gap-0 p-0 focus:outline-none"
                aria-describedby={undefined}
                // The panel itself takes focus: no ring on the first link when opened with a tap.
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  menuRef.current?.focus({ preventScroll: true });
                }}
                onCloseAutoFocus={(event) => {
                  if (!searchAfterClose.current) return;
                  searchAfterClose.current = false;
                  event.preventDefault();
                  scrollToSearch();
                }}
              >
                <div className="flex h-14 shrink-0 items-center justify-between border-b pl-5 pr-3 sm:h-16">
                  <Logo />
                  <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
                  <SheetClose
                    className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('nav.closeMenu')}
                  >
                    <X className="size-5" aria-hidden="true" />
                  </SheetClose>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                  <ul className="space-y-1">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href);
                      return (
                        <li key={href}>
                          <SheetClose asChild>
                            <Link
                              href={href}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                active ? "bg-brand-50 text-foreground" : "text-neutral-700 hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <Icon className={cn("size-5", active ? "text-brand" : "text-muted-foreground")} aria-hidden="true" />
                              {label}
                            </Link>
                          </SheetClose>
                        </li>
                      );
                    })}
                  </ul>

                  <Button asChild size="lg" className="mt-5 h-12 w-full text-base">
                    <Link href={VOLS_HREF} onClick={menuSearch}>
                      <Search className="size-5" aria-hidden="true" />
                      {t('nav.search')}
                    </Link>
                  </Button>
                </div>

                <div className="shrink-0 space-y-4 border-t px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <div role="group" aria-label="Langue / Language" className="grid grid-cols-2 rounded-full bg-muted p-1">
                    {LANGUAGES.map(({ code, label }) => (
                      <button
                        key={code}
                        type="button"
                        lang={code}
                        aria-pressed={language === code}
                        onClick={() => changeLanguage(code)}
                        className={cn(
                          "rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          language === code ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li>
                      <a
                        href={WHATSAPP_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg py-2 text-neutral-700 hover:text-foreground"
                      >
                        <MessageCircle className="size-4 text-success" aria-hidden="true" />
                        {t('contact.aside.whatsapp', { number: WHATSAPP_DISPLAY })}
                      </a>
                    </li>
                    <li>
                      <SheetClose asChild>
                        <Link href={reportHref} className="flex items-center gap-3 rounded-lg py-2 text-neutral-700 hover:text-foreground">
                          <TriangleAlert className="size-4 text-muted-foreground" aria-hidden="true" />
                          {t('footer.reportError')}
                        </Link>
                      </SheetClose>
                    </li>
                  </ul>
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
