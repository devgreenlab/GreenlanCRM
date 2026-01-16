import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Leaf className="h-6 w-6 text-primary-foreground bg-primary p-1 rounded-md" />
      <span className="text-lg font-semibold font-headline">Greenlab</span>
    </div>
  );
}
