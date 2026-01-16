import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 overflow-hidden', className)}>
      <Leaf className="h-6 w-6 shrink-0 rounded-md bg-primary p-1 text-primary-foreground" />
      <span className="text-lg font-semibold font-headline group-data-[state=collapsed]:hidden">Greenlab</span>
    </div>
  );
}
