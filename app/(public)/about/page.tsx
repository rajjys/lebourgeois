'use client'
import Link from "next/link";
import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();
  
  return (
      <div className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-brand-50 to-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              {t('about.title')}
            </h1>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold text-foreground mb-6">{t('about.mission.title')}</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t('about.mission.description')}</p>
              </div>
              
              <h2 className="text-3xl font-bold text-foreground mb-6 mt-12">{t('about.approach.title')}</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t('about.approach.description')}</p>
              </div>
              
              <h2 className="text-3xl font-bold text-foreground mb-6 mt-12">{t('about.expertise.title')}</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t('about.expertise.description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-primary/10 to-brand-50 rounded-2xl p-12 text-center space-y-6 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground">
                {t('about.cta')}
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/explore" className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-card hover:shadow-hover text-base">
                  {t('home.about.cta')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
  );
};

export default About;
