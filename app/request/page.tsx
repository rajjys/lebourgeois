import RequestTicket from '@/components/forms/request-ticket-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Suspense } from 'react'

const RequestPage = () => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading page" />}>
        <RequestTicket />
    </Suspense>
  )
}

export default RequestPage

