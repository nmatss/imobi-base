import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play, Pause, Maximize, Minimize, RotateCw, Plus, Trash2, Eye,
  Camera, Home, ChevronLeft, ChevronRight, Loader2, Upload, Link as LinkIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VirtualTour {
  id: string;
  propertyId: string;
  name: string;
  type: '360_photo' | '360_video' | 'matterport' | 'external';
  url: string;
  thumbnailUrl?: string;
  orderIndex: number;
  isActive: boolean;
}

interface VirtualTourPlayerProps {
  propertyId: string;
  editable?: boolean;
}

export function VirtualTourPlayer({ propertyId, editable = false }: VirtualTourPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for new tour
  const [newTour, setNewTour] = useState({
    name: '',
    type: '360_photo' as VirtualTour['type'],
    url: '',
  });

  const { data: tours, isLoading } = useQuery<VirtualTour[]>({
    queryKey: ['virtual-tours', propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/virtual-tours`);
      if (!res.ok) throw new Error('Erro ao carregar tours');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<VirtualTour>) => {
      const res = await fetch(`/api/properties/${propertyId}/virtual-tours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao adicionar tour');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Tour adicionado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['virtual-tours', propertyId] });
      setShowAddDialog(false);
      setNewTour({ name: '', type: '360_photo', url: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tourId: string) => {
      const res = await fetch(`/api/virtual-tours/${tourId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao remover tour');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Tour removido.' });
      queryClient.invalidateQueries({ queryKey: ['virtual-tours', propertyId] });
    },
  });

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const activeTours = tours?.filter(t => t.isActive) || [];
  const currentTour = activeTours[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeTours.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === activeTours.length - 1 ? 0 : prev + 1));
  };

  const renderTourContent = (tour: VirtualTour) => {
    switch (tour.type) {
      case 'matterport':
      case 'external':
        return (
          <iframe
            src={tour.url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="xr-spatial-tracking"
          />
        );
      case '360_video':
        return (
          <video
            src={tour.url}
            className="w-full h-full object-cover"
            controls
            autoPlay={isPlaying}
            loop
          />
        );
      case '360_photo':
      default:
        // For 360 photos, we could use a library like Photo Sphere Viewer
        // For now, using a simple image with pan effect
        return (
          <div className="w-full h-full relative overflow-hidden">
            <img
              src={tour.url}
              alt={tour.name}
              className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
              style={{
                transform: 'scale(1.2)',
                transition: 'transform 0.3s ease',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                Arraste para explorar
              </div>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!activeTours.length && !editable) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Tour Virtual 360°
          </CardTitle>
          {editable && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Tour
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Tour Virtual</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Tour</Label>
                    <Input
                      placeholder="Ex: Sala de Estar"
                      value={newTour.name}
                      onChange={(e) => setNewTour({ ...newTour, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newTour.type}
                      onValueChange={(value: VirtualTour['type']) => setNewTour({ ...newTour, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="360_photo">Foto 360°</SelectItem>
                        <SelectItem value="360_video">Vídeo 360°</SelectItem>
                        <SelectItem value="matterport">Matterport</SelectItem>
                        <SelectItem value="external">Link Externo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      placeholder="https://..."
                      value={newTour.url}
                      onChange={(e) => setNewTour({ ...newTour, url: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {newTour.type === 'matterport' && 'Cole o link de compartilhamento do Matterport'}
                      {newTour.type === 'external' && 'Cole o link do tour virtual externo'}
                      {newTour.type === '360_photo' && 'Cole o link da imagem 360°'}
                      {newTour.type === '360_video' && 'Cole o link do vídeo 360°'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createMutation.mutate(newTour)}
                      disabled={!newTour.name || !newTour.url || createMutation.isPending}
                      className="flex-1"
                    >
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTours.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum tour virtual cadastrado</p>
            {editable && (
              <p className="text-sm mt-1">
                Adicione tours 360° para uma experiência imersiva
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Main Viewer */}
            <div
              ref={containerRef}
              className={`relative bg-black rounded-lg overflow-hidden ${
                isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video'
              }`}
            >
              {currentTour && renderTourContent(currentTour)}

              {/* Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeTours.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={goToPrevious}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-white text-sm">
                          {currentIndex + 1} / {activeTours.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={goToNext}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {currentTour?.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-5 w-5" />
                      ) : (
                        <Maximize className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            {activeTours.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {activeTours.map((tour, index) => (
                  <button
                    key={tour.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    {tour.thumbnailUrl ? (
                      <img
                        src={tour.thumbnailUrl}
                        alt={tour.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Home className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    {editable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(tour.id);
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Edit Mode List */}
        {editable && tours && tours.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-2">Gerenciar Tours</h4>
            <div className="space-y-2">
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={tour.isActive ? 'default' : 'secondary'}>
                      {tour.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span className="text-sm font-medium">{tour.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {tour.type === '360_photo' && 'Foto 360°'}
                      {tour.type === '360_video' && 'Vídeo 360°'}
                      {tour.type === 'matterport' && 'Matterport'}
                      {tour.type === 'external' && 'Externo'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(tour.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
