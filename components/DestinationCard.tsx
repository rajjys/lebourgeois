import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "i18next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface DestinationCardProps {
  title: string;
  description: string;
  image: string;
  price?: string;
}

const DestinationCard = ({ title, description, image, price }: DestinationCardProps) => {
  return (
    <Card className="group overflow-hidden border-border hover:shadow-hover transition-all duration-300 bg-card">
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {price && (
          <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold shadow-card">
            {price}
          </div>
        )}
      </div>
      <CardContent className="p-5 space-y-3">
        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        <Button variant="ghost" size="sm" asChild className="w-full group/btn">
          <Link href="/request" className="flex items-center justify-center gap-2">
            {t("explore.destinationsCta",{ defaultValues: "Request Quote"})}
            <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default DestinationCard;
