'use client'
import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CarouselApi } from "@/components/ui/carousel";
import { popularRoutes } from "@/data/data";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type RouteItem = (typeof popularRoutes)[number];

function formatMoney(amount: number): string {
	return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
		amount,
	);
}

function getRouteId(route: RouteItem): string {
	// Use flightNumber as stable route id fallback
	return route.flightNumber;
}

export default function PopularRoutesCarousel() {
	const [api, setApi] = useState<CarouselApi | null>(null);

	useEffect(() => {
		if (!api) return;
		const interval = setInterval(() => {
			if (!api) return;
			// Loop to first slide when reaching the end
			if (api.canScrollNext()) {
				api.scrollNext();
			} else {
				api.scrollTo(0);
			}
		}, 3500);
		return () => clearInterval(interval);
	}, [api]);

	// Keep the hero small: show first 10 popular routes
	const items = popularRoutes.slice(0, 10);

	return (
		<div className="w-full">
			<Carousel
				setApi={setApi}
				className="w-full"
				opts={{
					align: "start",
					loop: true,
					skipSnaps: false,
					dragFree: true,
				}}
			>
				<CarouselContent className="items-stretch">
					{items.map((route) => {
						const id = getRouteId(route);
						const title = `${route.origin.city} (${route.origin.iataCode}) → ${route.destination.city} (${route.destination.iataCode})`;
						return (
							<CarouselItem key={id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
								<Link href={`/explore/${encodeURIComponent(id)}`} className="block h-full">
									<Card className="h-full bg-background/70 backdrop-blur border-border hover:bg-background/80 transition-colors">
                                    <CardHeader className="py-2 flex justify-center items-center">
										<p className="text-sm font-semibold text-foreground truncate">{title}</p>
                                    </CardHeader>
										<CardContent className="p-4 pt-1 flex gap-3 items-center">
											{/* Airline emblem */}
											<div
												className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold text-white"
												style={{ backgroundColor: route.airline.color }}
												aria-label={route.airline.name}
												title={route.airline.name}
											>
												{route.airline.code}
											</div>
											{/* Main meta */}
											<div className="min-w-0 flex-1">
												<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
													<span>{new Date(route.departureDate).toLocaleDateString()}</span>
													<span className="hidden sm:inline">•</span>
													<span className="hidden sm:inline">{route.ata} — {route.eta}</span>
													<span className="hidden md:inline">•</span>
													<span className="hidden md:inline">{route.airPlane}</span>
												</div>
											</div>
											{/* Price */}
											<div className="flex items-center gap-1">
												<span className="text-sm font-bold text-primary">{formatMoney(route.price)}</span>
												<ArrowRight className="h-4 w-4 text-primary hidden sm:block" />
											</div>
										</CardContent>
									</Card>
								</Link>
							</CarouselItem>
						);
					})}
				</CarouselContent>
			</Carousel>
			<div className="mt-3 flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						if (!api) return;
						api.scrollPrev();
					}}
					aria-label="Previous routes"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						if (!api) return;
						api.scrollNext();
					}}
					aria-label="Next routes"
				>
					<ArrowRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}


