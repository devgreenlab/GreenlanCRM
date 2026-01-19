'use client';

import * as React from 'react';
import { Check, Languages } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale('id')}>
          <div className="flex items-center justify-between w-full">
            <span>Bahasa Indonesia</span>
            {locale === 'id' && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('en')}>
          <div className="flex items-center justify-between w-full">
            <span>English</span>
            {locale === 'en' && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
