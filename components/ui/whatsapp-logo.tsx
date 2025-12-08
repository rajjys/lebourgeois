import { cn } from '@/lib/utils/cn-utils';
import Image from 'next/image';

export default function WhatsAppLogo({className}: {className?: string}) {
  return (
    <Image 
      src="/logos/whatsapp.svg" 
      alt="WhatsApp Logo" 
      width={50} 
      height={50} 
      className={cn("object-contain", className)}
    />
  );
}
