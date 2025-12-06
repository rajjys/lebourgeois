'use client'
import { Button } from "@/components/ui/button";
import { Plane, Globe, HeadphonesIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import PopularRoutesCarousel from "@/components/PopularRoutesCarousel";
import Link from "next/link";
import Image from "next/image";

const Home = () => {
  const { t } = useTranslation();

  const highlights = [
    {
      icon: Plane,
      title: t('home.features.fast.title'),
      description: t('home.features.fast.description'),
    },
    {
      icon: Globe,
      title: t('home.features.global.title'),
      description: t('home.features.global.description'),
    },
    {
      icon: HeadphonesIcon,
      title: t('home.features.support.title'),
      description: t('home.features.support.description'),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/assets/hero-flight.jpg"
            alt="Hero flight"
            width={800}
            height={600}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        </div>
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              {t('home.hero.title')}
            </h1>
            <h3 className="text-lg sm:text-xl text-muted-foreground max-w-xl">
              {t('home.hero.subtitle')}
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link href="/explore">{t('home.hero.cta')}</Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/request">{t('nav.requestQuote')}</Link>
              </Button>
            </div>
          </div>
          <div className="mt-4 md:mt-10">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-foreground">{t('home.hero.latestPrices')}</h3>
              <Link href="/explore" className="text-sm text-muted-secondary font-medium hover:underline">
                {t('home.hero.exploreAllRoutes', { defaultValue: 'Explore all routes' })}
              </Link>
            </div>
            <div className="mt-3">
              <PopularRoutesCarousel />
            </div>
          </div>
        </div>
        
      </section>

      {/* About Section */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              {t('home.about.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('home.about.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {highlights.map((item, index) => (
              <div
                key={index}
                className="text-center space-y-4 p-6 rounded-xl bg-card border border-border hover:shadow-card transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-sky-light/50 to-gold-light/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {t('about.cta')}
          </h2>
          <Button variant="hero" size="xl" asChild>
            <Link href="/explore">{t('home.about.cta')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
