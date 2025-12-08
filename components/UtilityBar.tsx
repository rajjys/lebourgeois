"use client";

import { Facebook, Instagram, Linkedin, Twitter, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";
import WhatsAppLogo from "./ui/whatsapp-logo";

export default function UtilityBar() {
  const { i18n } = useTranslation();
  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

  return (
    <div className="w-full bg-muted/50 border-b border-border text-xs sm:text-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-9 items-center justify-end sm:justify-between">

          {/* LEFT — Social Icons */}
          <div className="hidden sm:flex items-center gap-3 text-muted-foreground">

            <a href="https://facebook.com/lebourgeois" target="_blank" className="hover:text-foreground transition-colors">
              <Facebook className="w-4 h-4" />
            </a>

            <a href="https://twitter.com/lebourgeois" target="_blank" className="hover:text-foreground transition-colors">
              <Twitter className="w-4 h-4" />
            </a>

            <a href="https://linkedin.com/company/lebourgeois" target="_blank" className="hover:text-foreground transition-colors">
              <Linkedin className="w-4 h-4" />
            </a>

            <a href="https://instagram.com/lebourgeois" target="_blank" className="hover:text-foreground transition-colors">
              <Instagram className="w-4 h-4" />
            </a>

          </div>

          {/* RIGHT — Phone + Email + Language */}
          <div className="flex items-center gap-4">

            {/* WhatsApp number */}
            <a  href="https://wa.me/+243973447860?text=Bonjour%20Le%20Bourgeois%20Travels!"
                target="_blank"
                className="flex items-center gap-1 space-x-1 text-muted-foreground hover:text-foreground transition-colors">
                <WhatsAppLogo className="h-5 w-5 text-green-600" />
                +243 973 447 860
            </a>
            <div className="border-r h-4 border-border" />
            {/* Email */}
            <a
              href="mailto:info@lebourgeois.travel"
              className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="w-4 h-4 text-red-600" />
              info@lebourgeois.cd
            </a>

            {/* Language Selector */}
            <Select value={i18n.language} onValueChange={changeLanguage}>
              <SelectTrigger className="h-7 px-2 text-xs w-[70px]">
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

          </div>

        </div>
      </div>
    </div>
  );
}
