'use client';

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils/cn-utils";

// Building blocks for back-office edit screens (docs/DESIGN-SYSTEM.md, back office).

/** Props that tie an input to its label and its hint or error. */
export const describedBy = (id: string, error?: string) => ({
  id,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": `${id}-msg`,
});

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">(facultatif)</span>}
      </Label>
      {children}
      <p id={`${id}-msg`} className={cn("text-xs", error ? "text-danger" : "text-muted-foreground")}>
        {error ?? hint}
      </p>
    </div>
  );
}

export function FormSection({
  title,
  description,
  columns = 2,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  columns?: 1 | 2;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>{children}</CardContent>
    </Card>
  );
}

export function EditorHeader({
  backHref,
  backLabel,
  title,
  meta,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <header className="space-y-2">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {meta}
      </div>
    </header>
  );
}

/** For records that flights or fares may still use: the API refuses those deletes. */
export const IN_USE_NOTE =
  "La suppression est définitive. Si des routes ou des vols y sont liés, elle sera refusée : changez plutôt le statut.";

/** Delete with a confirmation step. */
export function DeleteButton({
  what,
  onConfirm,
  description = "La suppression est définitive.",
}: {
  what: string;
  onConfirm: () => void;
  description?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="text-danger hover:text-danger">
          <Trash2 className="size-4" aria-hidden="true" />
          Supprimer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {what} ?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={buttonVariants({ variant: "destructive" })}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
