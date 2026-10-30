'use client'
import { Plane } from "lucide-react";
import Link from "next/link";
import { useTranslation } from 'react-i18next';
import { SITE } from "@/lib/site";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-secondary border-t border-border mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground">{SITE.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.exploreFlights')}
                </Link>
              </li>
              <li>
                <Link href="/request" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.requestQuote')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {SITE.name}. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
