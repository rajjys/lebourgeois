'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useRequest } from '@/hooks/useRequests';
import { deleteRequest } from '@/services/requests';
import { ArrowLeft, Trash2, Phone, Mail, Users, Plane, Calendar, MapPin } from 'lucide-react';
import { RequestStatus } from '@/lib/constants';

const statusColors = {
  [RequestStatus.NEW]: 'bg-blue-100 text-blue-800',
  [RequestStatus.CLAIMED]: 'bg-yellow-100 text-yellow-800',
  [RequestStatus.CONTACTED]: 'bg-green-100 text-green-800',
  [RequestStatus.CLOSED]: 'bg-gray-100 text-gray-800',
};

export default function RequestDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { requestId } = useParams<{ requestId: string }>();
  const { request, isLoading } = useRequest(requestId);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!request) return;

    setDeleting(true);
    try {
      await deleteRequest(request.id);
      toast.success(t('dashboard.requests.deleteSuccess', { defaultValue: 'Request deleted successfully' }));
      router.push('/dashboard/requests');
    } catch (error) {
        if (error instanceof Error) {
            console.error("Delete failed:", error.message);
            } else {
                console.error("Unexpected error:", error);
            }
        toast.error(t('dashboard.requests.deleteError', { defaultValue: 'Failed to delete request' }));
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message={t('common.loading', { defaultValue: 'Loading...' })} />;
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">
              {t('dashboard.requests.notFound', { defaultValue: 'Request not found' })}
            </h3>
            <p className="text-muted-foreground">
              {t('dashboard.requests.notFoundDescription', { defaultValue: 'The request you are looking for does not exist.' })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('dashboard.requests.requestDetail', { defaultValue: 'Request Details' })}
            </h1>
            <p className="text-muted-foreground">
              {t('dashboard.requests.requestId', { defaultValue: 'Request ID' })}: {request.id}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={deleting}
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
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('common.delete', { defaultValue: 'Delete' })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6">
        {/* Status and Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                {request.originCity} → {request.destinationCity}
              </CardTitle>
              <Badge className={statusColors[request.status]}>
                {request.status}
              </Badge>
            </div>
            <CardDescription>
              {request.flightNumber} • {format(new Date(request.travelDate), 'PPP')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{t('dashboard.requests.origin', { defaultValue: 'Origin' })}</span>
                </div>
                <p className="font-medium">{request.originCity}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{t('dashboard.requests.destination', { defaultValue: 'Destination' })}</span>
                </div>
                <p className="font-medium">{request.destinationCity}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t('dashboard.requests.travelDate', { defaultValue: 'Travel Date' })}</span>
                </div>
                <p className="font-medium">{format(new Date(request.travelDate), 'PPP')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{t('dashboard.requests.travelers', { defaultValue: 'Travelers' })}</span>
                </div>
                <p className="font-medium">
                  {request.travelers} {request.travelers === 1 ? t('common.traveler', { defaultValue: 'traveler' }) : t('common.travelers', { defaultValue: 'travelers' })}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('dashboard.requests.travelClass', { defaultValue: 'Travel Class' })}
              </p>
              <p className="font-medium capitalize">{request.travelClass}</p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.requests.customerInfo', { defaultValue: 'Customer Information' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('dashboard.requests.customerName', { defaultValue: 'Name' })}
              </p>
              <p className="font-medium">{request.clientName}</p>
            </div>

            {request.clientEmail && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.requests.email', { defaultValue: 'Email' })}
                </p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${request.clientEmail}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {request.clientEmail}
                  </a>
                </div>
              </div>
            )}

            {request.clientPhone && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.requests.phone', { defaultValue: 'Phone' })}
                </p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${request.clientPhone}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {request.clientPhone}
                  </a>
                  {request.prefersWhatsapp && (
                    <Badge variant="secondary" className="text-xs">
                      WhatsApp
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.requests.metadata', { defaultValue: 'Metadata' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.requests.createdAt', { defaultValue: 'Created At' })}
                </p>
                <p className="font-medium">
                  {format(new Date(request.createdAt), 'PPP p')}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.requests.updatedAt', { defaultValue: 'Updated At' })}
                </p>
                <p className="font-medium">
                  {format(new Date(request.updatedAt), 'PPP p')}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.requests.source', { defaultValue: 'Source' })}
                </p>
                <p className="font-medium capitalize">{request.source}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}