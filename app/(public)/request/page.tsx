import type { Metadata } from 'next'
import RequestTicket from '@/components/forms/request-ticket-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { pageMetadata } from '@/lib/seo'
import { Suspense } from 'react'

// Its own title and description (F-2): it used to show the home's, a duplicate in the sitemap.
export const metadata: Metadata = pageMetadata({
  title: "Demander de l'aide pour un vol",
  description:
    "Pas de vol connu sur votre trajet ? Donnez-nous le trajet, la date et le nombre de voyageurs : notre équipe cherche avec vous et vous recontacte.",
  path: '/request',
})

const RequestPage = () => {
  return (
    <Suspense fallback={<LoadingSpinner message="Chargement" />}>
        <RequestTicket />
    </Suspense>
  )
}

export default RequestPage

