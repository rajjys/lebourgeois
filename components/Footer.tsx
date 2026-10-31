'use client'
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import { useTranslation } from 'react-i18next';
import { SITE } from "@/lib/site";
import { requestHref } from "@/lib/links";

// Route, airline and airport links join the footer when their pages exist (RW-5, E-1, E-2):
// links to search results don't help crawlers, links to real pages do.
const Footer = () => {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('footer.explore'),
      links: [{ href: "/explore", label: t('footer.search') }],
    },
    {
      title: SITE.name,
      links: [
        { href: "/about", label: t('nav.about') },
        { href: requestHref(), label: t('footer.help') },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_1fr_1fr]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-sm text-sm text-muted-foreground">{t('footer.tagline')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t('footer.noTickets')}</p>
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

        <div className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {SITE.name}. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
