/**
 * WhatsApp Chat Widget for Staff
 *
 * Main component for staff to manage WhatsApp conversations
 */

import { useState, useEffect } from "react";
import { MessageSquare, Send, Phone, User, Search, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { TemplateSelector } from "./TemplateSelector";
import { QuickResponses } from "./QuickResponses";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Conversation {
  id: string;
  phoneNumber: string;
  contactName?: string;
  lastMessageAt?: Date;
  lastMessageFrom?: string;
  unreadCount: number;
  status: string;
  assignedTo?: string;
}

export function ChatWidget() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ["/api/whatsapp/conversations", filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }
      const res = await fetch(`/api/whatsapp/conversations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch selected conversation messages
  const { data: conversationData, isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/whatsapp/conversation", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const res = await fetch(`/api/whatsapp/conversation/${selectedConversation.id}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!selectedConversation,
    refetchInterval: 3000, // Poll every 3 seconds for active conversation
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: { phoneNumber: string; message: string }) => {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversation", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/whatsapp/conversation/${conversationId}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/conversations"] });
    },
  });

  // Auto-mark conversation as read when opened
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markAsRead.mutate(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    sendMessage.mutate({
      phoneNumber: selectedConversation.phoneNumber,
      message: messageText,
    });
  };

  const handleSelectTemplate = (templateText: string) => {
    setMessageText(templateText);
    setShowTemplates(false);
  };

  const conversations = conversationsData?.conversations || [];
  const messages = conversationData?.messages || [];

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv: Conversation) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      conv.contactName?.toLowerCase().includes(search) ||
      conv.phoneNumber.includes(search)
    );
  });

  const totalUnread = conversations.reduce((sum: number, conv: Conversation) => sum + conv.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations Sidebar */}
      <Card className="w-96 flex flex-col p-0">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">WhatsApp</h2>
            </div>
            {totalUnread > 0 && (
              <Badge variant="destructive">{totalUnread}</Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <Tabs value={filterStatus} onValueChange={setFilterStatus}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="active">Ativas</TabsTrigger>
              <TabsTrigger value="waiting">Aguardando</TabsTrigger>
              <TabsTrigger value="closed">Fechadas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {loadingConversations ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando conversas...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma conversa encontrada
            </div>
          ) : (
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation?.id}
              onSelect={setSelectedConversation}
            />
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col p-0">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.contactName || selectedConversation.phoneNumber}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{selectedConversation.phoneNumber}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                >
                  Templates
                </Button>
                <Badge variant={
                  selectedConversation.status === "active" ? "default" :
                  selectedConversation.status === "waiting" ? "secondary" :
                  "outline"
                }>
                  {selectedConversation.status === "active" ? "Ativa" :
                   selectedConversation.status === "waiting" ? "Aguardando" :
                   "Fechada"}
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <MessageThread
              messages={messages}
              isLoading={loadingMessages}
              phoneNumber={selectedConversation.phoneNumber}
            />

            {/* Template Selector (if visible) */}
            {showTemplates && (
              <div className="border-t p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Selecione um template</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <TemplateSelector onSelect={handleSelectTemplate} />
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  disabled={sendMessage.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
