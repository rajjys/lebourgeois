'use client'
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import { useTranslation } from 'react-i18next';
import { SITE } from "@/lib/site";
import { requestHref, VOLS_HREF } from "@/lib/links";

const WHATSAPP_DISPLAY = SITE.whatsapp.replace(/^\+(\d{3})(\d{3})(\d{3})(\d{3})$/, "+$1 $2 $3 $4");
const WHATSAPP_HREF = `https://wa.me/${SITE.whatsapp.replace(/^\+/, "")}`;

// What the site does, how we work and how to help, the same three ideas as /about (owner, 2026-11-02).
// Airline and airport links join "Explorer" when their pages exist (E-1, E-2); the routes are on /vols.
const Footer = () => {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('footer.explore'),
      links: [
        { href: VOLS_HREF, label: t('footer.routes') },
        { href: requestHref(), label: t('footer.help') },
      ],
    },
    {
      title: SITE.name,
      links: [
        { href: "/about", label: t('nav.about') },
        { href: "/about#methode", label: t('footer.method') },
        { href: "/about#limites", label: t('footer.limits') },
        { href: "/contact", label: t('footer.contact') },
      ],
    },
    {
      title: t('footer.join'),
      links: [
        { href: "/contact?sujet=erreur", label: t('footer.reportError') },
        { href: "/contact?sujet=compagnie", label: t('footer.partners') },
        { href: "/about#participer", label: t('footer.contribute') },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 space-y-3 md:col-span-1">
            <Logo />
            <p className="max-w-sm text-sm text-muted-foreground">{t('footer.tagline')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t('footer.method_line')}</p>
            <p className="text-sm text-muted-foreground">
              WhatsApp :{" "}
              <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-link">
                {WHATSAPP_DISPLAY}
              </a>
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">{column.title}</h2>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {SITE.name}. {t('footer.rights')}</p>
          <p>{t('footer.noTickets')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
