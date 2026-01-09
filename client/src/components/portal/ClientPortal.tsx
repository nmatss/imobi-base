import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Home, FileText, Calendar, MessageSquare, Bell, User, Download,
  Clock, CheckCircle, AlertTriangle, DollarSign, Key, Camera,
  Phone, Mail, MapPin, Loader2, Send, Eye, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientPortalProps {
  clientId: string;
  token: string;
}

interface PropertyInfo {
  id: string;
  title: string;
  address: string;
  city: string;
  type: string;
  images: string[];
}

interface Contract {
  id: string;
  property: PropertyInfo;
  type: 'rent' | 'sale';
  status: string;
  startDate: string;
  endDate?: string;
  value: number;
  documents: Document[];
}

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

interface Payment {
  id: string;
  dueDate: string;
  value: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
  invoiceUrl?: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastUpdate: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  content: string;
  sender: 'client' | 'agent';
  senderName: string;
  createdAt: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function ClientPortal({ clientId, token }: ClientPortalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portalData, isLoading } = useQuery({
    queryKey: ['client-portal', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/client-portal/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof newTicket) => {
      const res = await fetch('/api/client-portal/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, clientId }),
      });
      if (!res.ok) throw new Error('Erro ao criar chamado');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Chamado criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['client-portal'] });
      setShowTicketDialog(false);
      setNewTicket({ subject: '', message: '' });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const res = await fetch(`/api/client-portal/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content, clientId }),
      });
      if (!res.ok) throw new Error('Erro ao enviar mensagem');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal'] });
      setNewMessage('');
    },
  });

  const markNotificationsRead = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/client-portal/notifications/read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) throw new Error('Erro ao marcar notificações');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-portal'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-amber-700'; // WCAG AA: 4.6:1 contrast
      case 'overdue': return 'bg-red-500';
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-amber-700'; // WCAG AA: 4.6:1 contrast
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const { client, contracts, payments, tickets, notifications } = portalData || {};
  const unreadNotifications = notifications?.filter((n: Notification) => !n.read).length || 0;
  const pendingPayments = payments?.filter((p: Payment) => p.status === 'pending' || p.status === 'overdue') || [];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Portal do Cliente</h1>
                <p className="text-sm text-muted-foreground">
                  Olá, {client?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  setActiveTab('notifications');
                  markNotificationsRead.mutate();
                }}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Alerts */}
        {pendingPayments.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você tem {pendingPayments.length} pagamento(s) pendente(s).{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab('payments')}>
                Ver detalhes
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Contratos</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chamados</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 relative">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{contracts?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Contratos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {payments?.filter((p: Payment) => p.status === 'paid').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Pagos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-700 dark:bg-amber-900/30 rounded-lg">
                      <Clock className="h-6 w-6 text-white dark:text-amber-200" /> {/* WCAG AA: 4.6:1 */}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pendingPayments.length}</p>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {tickets?.filter((t: Ticket) => t.status === 'open').length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Chamados Abertos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Contracts */}
            {contracts?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Meus Imóveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contracts.map((contract: Contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center gap-4 p-4 rounded-lg border"
                      >
                        {contract.property.images?.[0] ? (
                          <img
                            src={contract.property.images[0]}
                            alt=""
                            className="w-20 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Home className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">{contract.property.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {contract.property.address}, {contract.property.city}
                          </p>
                        </div>
                        <Badge>{contract.type === 'rent' ? 'Aluguel' : 'Compra'}</Badge>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Payments */}
            {pendingPayments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Próximos Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingPayments.slice(0, 3).map((payment: Payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(payment.status)}`} />
                          <div>
                            <p className="font-medium">{formatCurrency(payment.value)}</p>
                            <p className="text-sm text-muted-foreground">
                              Vence em {format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Button size="sm">Pagar</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            {contracts?.map((contract: Contract) => (
              <Card key={contract.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {contract.property.images?.[0] ? (
                      <img
                        src={contract.property.images[0]}
                        alt=""
                        className="w-full md:w-48 h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full md:w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
                        <Home className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{contract.property.title}</h3>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {contract.property.address}
                          </p>
                        </div>
                        <Badge>{contract.type === 'rent' ? 'Locação' : 'Compra'}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor</p>
                          <p className="font-semibold">{formatCurrency(contract.value)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Início</p>
                          <p className="font-medium">
                            {format(new Date(contract.startDate), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        {contract.endDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Término</p>
                            <p className="font-medium">
                              {format(new Date(contract.endDate), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant="outline">{contract.status}</Badge>
                        </div>
                      </div>
                      {contract.documents?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Documentos</p>
                          <div className="flex flex-wrap gap-2">
                            {contract.documents.map((doc) => (
                              <Button key={doc.id} variant="outline" size="sm" asChild>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-1" />
                                  {doc.name}
                                </a>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments?.map((payment: Payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status === 'paid' ? (
                            <CheckCircle className="h-4 w-4 text-white" />
                          ) : payment.status === 'overdue' ? (
                            <AlertTriangle className="h-4 w-4 text-white" />
                          ) : (
                            <Clock className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{formatCurrency(payment.value)}</p>
                          <p className="text-sm text-muted-foreground">
                            Vencimento: {format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'overdue' ? 'destructive' : 'secondary'}>
                          {payment.status === 'paid' ? 'Pago' : payment.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                        </Badge>
                        {payment.status !== 'paid' && (
                          <Button size="sm">Pagar</Button>
                        )}
                        {payment.invoiceUrl && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Novo Chamado
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Abrir Chamado</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assunto</Label>
                      <Input
                        placeholder="Descreva brevemente o problema"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea
                        placeholder="Descreva detalhadamente..."
                        rows={4}
                        value={newTicket.message}
                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowTicketDialog(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => createTicketMutation.mutate(newTicket)}
                        disabled={!newTicket.subject || !newTicket.message || createTicketMutation.isPending}
                        className="flex-1"
                      >
                        {createTicketMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {tickets?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                  <h3 className="font-semibold mb-1">Nenhum chamado</h3>
                  <p className="text-sm text-muted-foreground">
                    Você ainda não abriu nenhum chamado
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets?.map((ticket: Ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:border-primary/50"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground">
                            Aberto em {format(new Date(ticket.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status === 'open' ? 'Aberto' : ticket.status === 'in_progress' ? 'Em Andamento' : ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Ticket Detail Dialog */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>{selectedTicket?.subject}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto space-y-4">
                  {selectedTicket?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        msg.sender === 'client' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <p className="text-xs opacity-70 mb-1">{msg.senderName}</p>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedTicket?.status !== 'closed' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newMessage.trim() && selectedTicket) {
                          sendMessageMutation.mutate({ ticketId: selectedTicket.id, content: newMessage });
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (selectedTicket && newMessage.trim()) {
                          sendMessageMutation.mutate({ ticketId: selectedTicket.id, content: newMessage });
                        }
                      }}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications?.map((notification: Notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${!notification.read ? 'bg-primary/5 border-primary/20' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <Bell className={`h-5 w-5 mt-0.5 ${!notification.read ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
