'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LogoMark } from "@/components/brand/Logo";
import { TYPE } from "@/components/ds/typography";
import { Button } from "@/components/ui/button";
import { VOLS_HREF } from "@/lib/links";
import { cn } from "@/lib/utils/cn-utils";

/**
 * 404 (P-17): in French like the rest of the site, with the navbar and footer, and the two ways
 * forward: the search, which is where most old links meant to go, and the home.
 */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <LogoMark className="size-12" />
        <p className="mt-6 text-sm font-semibold text-brand">{t("notFound.code")}</p>
        <h1 className={cn(TYPE.title, "mt-2 text-foreground")}>{t("notFound.title")}</h1>
        <p className={cn(TYPE.lead, "mt-3 max-w-md text-pretty")}>{t("notFound.body")}</p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Button asChild size="lg">
            <Link href={VOLS_HREF}>
              <Search aria-hidden="true" />
              {t("notFound.search")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">{t("notFound.home")}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
