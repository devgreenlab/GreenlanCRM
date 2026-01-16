import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 py-16 bg-background border-2 border-dashed rounded-lg',
        className
      )}
    >
      <div className="bg-secondary p-3 rounded-full">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-xl font-semibold font-headline">{title}</h2>
      <p className="mt-2 max-w-sm mx-auto text-muted-foreground font-serif">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
