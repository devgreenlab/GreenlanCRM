import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Terjadi kesalahan yang tidak terduga.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 py-16 border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/10',
        className
      )}
    >
      <div className="bg-destructive/20 p-3 rounded-full">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mt-4 text-xl font-semibold font-headline text-destructive">
        Terjadi Masalah
      </h2>
      <p className="mt-2 text-destructive/80 font-serif">{message}</p>
      <Button variant="destructive" onClick={onRetry} className="mt-6">
        Coba Lagi
      </Button>
    </div>
  );
}
