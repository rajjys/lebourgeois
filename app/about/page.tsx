'use client'
import { Award, Clock, Shield, Users } from "lucide-react";
import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();
  
  const values = [
    {
      icon: Award,
      title: "Excellence",
      description: "We're committed to delivering the highest quality service",
    },
    {
      icon: Clock,
      title: "Efficiency",
      description: "Quick response times and streamlined processes",
    },
    {
      icon: Shield,
      title: "Trust",
      description: "Your security and satisfaction are our top priorities",
    },
    {
      icon: Users,
      title: "Personal Touch",
      description: "Every traveler gets individualized attention",
    },
  ];

  return (
      <div className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-sky-light/20 to-background">
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

        {/* Values Section */}
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="text-center space-y-4 p-6 rounded-xl bg-card border border-border shadow-soft"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-primary/10 via-sky-light/50 to-gold-light/30 rounded-2xl p-12 text-center space-y-6 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground">
                {t('about.cta')}
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/request" className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-card hover:shadow-hover text-base">
                  {t('nav.requestTicket')}
                </a>
                <a href="/contact" className="inline-flex items-center justify-center px-8 py-4 border border-border rounded-lg font-semibold hover:bg-secondary transition-colors text-base">
                  {t('nav.contact')}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
  );
};

export default About;
