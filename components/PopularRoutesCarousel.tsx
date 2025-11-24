'use client'
import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CarouselApi } from "@/components/ui/carousel";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useFlightPatterns } from "@/hooks/useFlightPatterns";
import { FlightPatternResponse } from "@/lib/validations/flightPattern";
import Image from "next/image";


function formatMoney(amount: number): string {
	return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
		amount,
	);
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
	const { patterns } = useFlightPatterns();

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
					{patterns?.slice(0, 10).map((route: FlightPatternResponse) => {
						const title = `${route.origin.city} (${route.origin.code}) → ${route.destination.city} (${route.destination.code})`;
						return (
							<CarouselItem key={route.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
								<Link href={`/explore/${encodeURIComponent(route.id)}`} className="block h-full">
									<Card className="h-full bg-background/70 backdrop-blur border-border hover:bg-background/80 transition-colors">
                                    <CardHeader className="py-2 flex justify-center items-center">
										<p className="text-sm font-semibold text-foreground truncate">{title}</p>
                                    </CardHeader>
										<CardContent className="p-2 pt-1 flex gap-3 items-center">
											{/* Airline emblem */}

											{
												route.airline.logo ? 
													<Image 
														src={route.airline.logo}
														height={60}
														width={60}
														alt={route.airline.code}
														className="flex h-10 w-10 items-center justify-center rounded-full"
													/>
														:
													<div
														className="flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold text-white"
														style={{ backgroundColor: route.airline?.color || "#33cc33"}}
														aria-label={route.airline.name}
														title={route.airline.name}
													>
														{route.airline.code}
													</div>
											}
											{/* Main meta */}
											<div className="min-w-0 flex-1">
												<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
													<span>{/*new Date(route.departureDate).toLocaleDateString()*/}</span>
													<span className="">•</span>
													<span className="">{route.departureTime} — {route.arrivalTime}</span>
													<span className="">•</span>
													<span className="">{route.aircraft}</span>
												</div>
											</div>
											{/* Price */}
											<div className="flex items-center gap-1">
												<span className="text-sm font-bold text-primary">{formatMoney(route.price || 0)}</span>
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


