'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

const Contact = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    contactMethod: "email" as "email" | "phone",
    email: "",
    phone: "",
    isWhatsapp: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const missingContact =
      formData.contactMethod === "email" ? !formData.email : !formData.phone;

    if (!formData.name || !formData.message || missingContact) {
      toast.error(
        t("contact.form.missingFields", {
          defaultValue: "Please fill in all required fields",
        })
      );
      return;
    }

    toast.success(t('contact.form.successTitle'), {
      description: t('contact.form.successMessage')
    });
    
    setFormData({
      name: "",
      message: "",
      contactMethod: "email",
      email: "",
      phone: "",
      isWhatsapp: true,
    });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: t('contact.info.email'),
      value: "info@lebourgeois.travel",
      href: "mailto:info@lebourgeois.travel",
    },
    {
      icon: Phone,
      title: t('contact.info.phone'),
      value: "+1 (234) 567-890",
      href: "tel:+1234567890",
    },
    {
      icon: MapPin,
      title: t('contact.info.whatsapp'),
      value: "Worldwide Coverage",
      href: null,
    },
  ];

  const officeLocations = [
    {
      city: "Goma",
      address: "Boulevard Kanyamuhanga, Quartier Les Volcans, Goma, DRC",
      phone: "+243 900 000 001",
      email: "goma@lebourgeois.travel",
      mapUrl: "https://www.google.com/maps?q=Goma,+DRC&output=embed",
    },
    {
      city: "Kisangani",
      address: "Avenue de la Mission, Commune Makiso, Kisangani, DRC",
      phone: "+243 900 000 002",
      email: "kisangani@lebourgeois.travel",
      mapUrl: "https://www.google.com/maps?q=Kisangani,+DRC&output=embed",
    },
    {
      city: "Kinshasa",
      address: "Boulevard du 30 Juin, Gombe, Kinshasa, DRC",
      phone: "+243 900 000 003",
      email: "kinshasa@lebourgeois.travel",
      mapUrl: "https://www.google.com/maps?q=Kinshasa,+DRC&output=embed",
    },
  ];

  return (
      <div className="flex-1 py-12 bg-gradient-to-b from-sky-light/20 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-12 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('contact.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info Cards */}
            <div className="space-y-6">
              {contactMethods.map((method, index) => (
                <Card key={index} className="shadow-soft hover:shadow-card transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <method.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">{method.title}</h3>
                        {method.href ? (
                          <a
                            href={method.href}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {method.value}
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">{method.value}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>{t('contact.title')}</CardTitle>
                  <CardDescription>
                    {t('contact.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('contact.form.name')}</Label>
                      <Input
                        id="name"
                        placeholder={t('contact.form.namePlaceholder')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t('contact.form.message')}</Label>
                      <Textarea
                        id="message"
                        placeholder={t('contact.form.messagePlaceholder')}
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">
                          {t("contact.form.preferredContact", {
                            defaultValue: "Preferred contact method",
                          })}
                        </Label>
                        <RadioGroup
                          value={formData.contactMethod}
                          onValueChange={(value) =>
                            setFormData({ ...formData, contactMethod: value as "email" | "phone" })
                          }
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                          <div className="flex items-center gap-2 rounded-md border border-border p-3">
                            <RadioGroupItem value="email" id="contact-email" />
                            <Label htmlFor="contact-email" className="cursor-pointer">
                              {t("contact.form.contactByEmail", {
                                defaultValue: "Respond via email",
                              })}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2 rounded-md border border-border p-3">
                            <RadioGroupItem value="phone" id="contact-phone" />
                            <Label htmlFor="contact-phone" className="cursor-pointer">
                              {t("contact.form.contactByPhone", {
                                defaultValue: "Respond via phone",
                              })}
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {formData.contactMethod === "email" ? (
                        <div className="space-y-2">
                          <Label htmlFor="email">
                            {t("contact.form.email", { defaultValue: "Email" })} *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder={t("contact.form.emailPlaceholder", {
                              defaultValue: "you@example.com",
                            })}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="phone">
                            {t("contact.form.phone", { defaultValue: "Phone number" })} *
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder={t("contact.form.phonePlaceholder", {
                              defaultValue: "+243 900 000 000",
                            })}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="isWhatsapp"
                              checked={formData.isWhatsapp}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, isWhatsapp: Boolean(checked) })
                              }
                            />
                            <Label htmlFor="isWhatsapp">
                              {t("contact.form.isWhatsapp", {
                                defaultValue: "This number is available on WhatsApp",
                              })}
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" variant="hero" size="lg" className="w-full">
                      <Send className="mr-2 h-5 w-5" />
                      {t('contact.form.submit')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
        </div>
        </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl mt-16">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {t("contact.offices.title", { defaultValue: "Visit our offices" })}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("contact.offices.subtitle", {
              defaultValue:
                "We are present in key cities across the Democratic Republic of Congo. Reach out or stop by the office closest to you.",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {officeLocations.map((office) => (
            <Card key={office.city} className="shadow-soft h-full flex flex-col overflow-hidden">
              <div className="aspect-video">
                <iframe
                  title={`${office.city} office location`}
                  src={office.mapUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <CardHeader className="space-y-1">
                <CardTitle>{office.city}</CardTitle>
                <CardDescription>{office.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <a href={`tel:${office.phone.replace(/\s+/g, "")}`} className="hover:text-primary">
                    {office.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href={`mailto:${office.email}`} className="hover:text-primary">
                    {office.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{t("contact.offices.mapPin", { defaultValue: "Map pin ready for updates" })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      </div>
  );
};

export default Contact;
