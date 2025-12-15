'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useRequests } from '@/hooks/useRequests';
import { deleteRequest } from '@/services/requests';
import { FileText, Eye, Trash2 } from 'lucide-react';
import { RequestStatus } from '@/lib/constants';

const statusColors = {
  [RequestStatus.NEW]: 'bg-blue-100 text-blue-800',
  [RequestStatus.CLAIMED]: 'bg-yellow-100 text-yellow-800',
  [RequestStatus.CONTACTED]: 'bg-green-100 text-green-800',
  [RequestStatus.CLOSED]: 'bg-gray-100 text-gray-800',
};

export default function RequestsPage() {
  const { t } = useTranslation();
  const { requests, isLoading, mutate } = useRequests();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteRequest(id);
      toast.success(t('dashboard.requests.deleteSuccess', { defaultValue: 'Request deleted successfully' }));
      mutate();
    } catch (error) {
      toast.error(t('dashboard.requests.deleteError', { defaultValue: 'Failed to delete request' }));
      console.log('Delete request error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message={t('common.loading', { defaultValue: 'Loading...' })} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.requests.title', { defaultValue: 'Requests' })}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.requests.description', { defaultValue: 'Manage flight booking requests from customers' })}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {requests?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('dashboard.requests.noRequests', { defaultValue: 'No requests yet' })}
              </h3>
              <p className="text-muted-foreground text-center">
                {t('dashboard.requests.noRequestsDescription', { defaultValue: 'Requests will appear here when customers submit flight booking requests.' })}
              </p>
            </CardContent>
          </Card>
        ) : (
          requests?.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {request.originCity} → {request.destinationCity}
                    </CardTitle>
                    <CardDescription>
                      {request.flightNumber} • {format(new Date(request.travelDate), 'PPP')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[request.status]}>
                      {request.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(request.createdAt), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('dashboard.requests.customer', { defaultValue: 'Customer' })}
                    </p>
                    <p className="font-medium">{request.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('dashboard.requests.contact', { defaultValue: 'Contact' })}
                    </p>
                    <p className="font-medium">
                      {request.clientPhone || request.clientEmail || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('dashboard.requests.details', { defaultValue: 'Details' })}
                    </p>
                    <p className="font-medium">
                      {request.travelers} {request.travelers === 1 ? t('common.traveler', { defaultValue: 'traveler' }) : t('common.travelers', { defaultValue: 'travelers' })} • {request.travelClass}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/requests/${request.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('common.view', { defaultValue: 'View' })}
                    </Link>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId === request.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete', { defaultValue: 'Delete' })}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('dashboard.requests.deleteConfirmTitle', { defaultValue: 'Delete Request' })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('dashboard.requests.deleteConfirmMessage', {
                            defaultValue: 'Are you sure you want to delete this request? This action cannot be undone.'
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t('common.cancel', { defaultValue: 'Cancel' })}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(request.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('common.delete', { defaultValue: 'Delete' })}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}