'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Archive, Check, Inbox, Mail, MessageCircle, Phone, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DeleteButton } from '@/components/backoffice/FormParts';
import { sendJson } from '@/services/http';
import { formatDayMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils/cn-utils';
import type { ContactMessage } from '@/lib/generated/prisma/client';

type Status = ContactMessage['status'];

const TOPIC: Record<ContactMessage['topic'], { label: string; variant: 'info' | 'warning' | 'success' | 'neutral' }> = {
  QUESTION: { label: 'Question', variant: 'info' },
  CORRECTION: { label: 'Erreur signalée', variant: 'warning' },
  AIRLINE: { label: 'Compagnie', variant: 'success' },
  OTHER: { label: 'Autre', variant: 'neutral' },
};

const TABS: { status: Status; label: string }[] = [
  { status: 'NEW', label: 'À traiter' },
  { status: 'ANSWERED', label: 'Répondus' },
  { status: 'ARCHIVED', label: 'Archivés' },
];

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

const time = (iso: Date | string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kinshasa' });

/** wa.me needs the international number; a local "0…" number only gets a phone link. */
const whatsappHref = (phone: string) => (/^(\+|243)/.test(phone) ? `https://wa.me/${phone.replace(/^\+/, '')}` : null);

export default function MessagesPage() {
  const { data, isLoading, error, mutate } = useSWR<ContactMessage[]>('/api/contact', fetcher);
  const [tab, setTab] = useState<Status>('NEW');

  if (isLoading) return <LoadingSpinner message="Chargement des messages…" />;
  if (error) return <p className="text-danger">Impossible de charger les messages.</p>;

  const messages = data ?? [];
  const shown = messages.filter((m) => m.status === tab);
  const count = (s: Status) => messages.filter((m) => m.status === s).length;

  async function setStatus(m: ContactMessage, status: Status) {
    try {
      await sendJson(`/api/contact/${m.id}`, 'PATCH', { status });
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(m: ContactMessage) {
    try {
      await sendJson(`/api/contact/${m.id}`, 'DELETE');
      await mutate();
      toast.success('Message supprimé');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Envoyés depuis la page Contact : questions, erreurs signalées, compagnies.
        </p>
      </header>

      <div role="tablist" aria-label="Statut" className="inline-flex rounded-lg border bg-muted p-1">
        {TABS.map(({ status, label }) => (
          <button
            key={status}
            role="tab"
            type="button"
            aria-selected={tab === status}
            onClick={() => setTab(status)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === status ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label} <span className="ml-1 text-xs text-muted-foreground">{count(status)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed py-12 text-center">
          <Inbox className="mb-3 size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Aucun message ici.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {shown.map((m) => (
            <li key={m.id} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <Badge variant={TOPIC[m.topic].variant}>{TOPIC[m.topic].label}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-link underline">
                        <Mail className="size-3.5" aria-hidden="true" />
                        {m.email}
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-link underline">
                        <Phone className="size-3.5" aria-hidden="true" />
                        {m.phone}
                      </a>
                    )}
                    {m.phone && whatsappHref(m.phone) && (
                      <a
                        href={whatsappHref(m.phone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-link underline"
                      >
                        <MessageCircle className="size-3.5" aria-hidden="true" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
                <time dateTime={new Date(m.createdAt).toISOString()} className="text-xs text-muted-foreground">
                  {formatDayMonthYear(new Date(m.createdAt))} à {time(m.createdAt)}
                </time>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
              {m.pageUrl && <p className="mt-2 text-xs text-muted-foreground">Page : {m.pageUrl}</p>}

              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                {m.status !== 'ANSWERED' && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(m, 'ANSWERED')}>
                    <Check className="size-4" aria-hidden="true" />
                    Marquer comme répondu
                  </Button>
                )}
                {m.status !== 'ARCHIVED' && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(m, 'ARCHIVED')}>
                    <Archive className="size-4" aria-hidden="true" />
                    Archiver
                  </Button>
                )}
                {m.status !== 'NEW' && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(m, 'NEW')}>
                    <Undo2 className="size-4" aria-hidden="true" />
                    Remettre à traiter
                  </Button>
                )}
                <div className="ml-auto">
                  <DeleteButton what={`le message de ${m.name}`} onConfirm={() => remove(m)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
