'use client';

import * as React from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import type { PipelineSettings } from '@/lib/firestore/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, PlusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function PageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </CardContent>
        </Card>
    )
}

function StageManager({
    title,
    description,
    stages,
    onStagesChange,
}: {
    title: string;
    description: string;
    stages: string[];
    onStagesChange: (newStages: string[]) => void;
}) {
    const [newStage, setNewStage] = React.useState('');

    const handleAddStage = () => {
        if (newStage && !stages.includes(newStage)) {
            onStagesChange([...stages, newStage]);
            setNewStage('');
        }
    };

    const handleDeleteStage = (stageToDelete: string) => {
        onStagesChange(stages.filter(stage => stage !== stageToDelete));
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {stages.map(stage => (
                        <div key={stage} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                            <span className="capitalize">{stage}</span>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will remove the "{stage}" stage. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteStage(stage)}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-4">
                    <Input 
                        value={newStage}
                        onChange={(e) => setNewStage(e.target.value)}
                        placeholder="Nama tahapan baru..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                    />
                    <Button onClick={handleAddStage}><PlusCircle className="mr-2 h-4 w-4" /> Tambah</Button>
                </div>
            </CardContent>
        </Card>
    );
}


export default function PipelinePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [localSettings, setLocalSettings] = React.useState<Partial<PipelineSettings>>({});

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'pipeline') : null),
    [firestore]
  );
  
  const { data: pipelineSettings, isLoading, error } = useDoc<PipelineSettings>(settingsRef);

  React.useEffect(() => {
    if (pipelineSettings) {
      setLocalSettings(pipelineSettings);
    } else {
      setLocalSettings({ leadStages: [], dealStages: [] });
    }
  }, [pipelineSettings]);

  const handleSaveChanges = async () => {
    if (!firestore || !settingsRef) return;
    setIsSaving(true);
    
    const dataToSave = {
        leadStages: localSettings.leadStages || [],
        dealStages: localSettings.dealStages || [],
    };

    try {
        if (pipelineSettings) {
            await updateDoc(settingsRef, dataToSave);
        } else {
            await setDoc(settingsRef, dataToSave);
        }
        toast({ title: 'Sukses', description: 'Pengaturan pipeline berhasil disimpan.' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Gagal menyimpan pengaturan.' });
        console.error(e);
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} message="Gagal memuat pengaturan pipeline." />;
  }
  
  return (
    <div className="space-y-6">
        <StageManager
            title="Tahapan Prospek (Lead)"
            description="Atur tahapan untuk papan Kanban di halaman Prospek."
            stages={localSettings.leadStages || ['new', 'qualified', 'unqualified']}
            onStagesChange={(newStages) => setLocalSettings(prev => ({...prev, leadStages: newStages}))}
        />
        <StageManager
            title="Tahapan Deal"
            description="Atur tahapan untuk pipeline deal (fitur mendatang)."
            stages={localSettings.dealStages || ['prospek', 'negosiasi', 'deal', 'produksi', 'selesai', 'lost']}
            onStagesChange={(newStages) => setLocalSettings(prev => ({...prev, dealStages: newStages}))}
        />
        <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Semua Perubahan"}
        </Button>
    </div>
  );
}
