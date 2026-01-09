import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  phoneNumber: string;
  contactName?: string;
  lastMessageAt?: Date;
  lastMessageFrom?: string;
  unreadCount: number;
  status: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation)}
          className={cn(
            "w-full p-4 hover:bg-muted/50 transition-colors text-left",
            selectedId === conversation.id && "bg-muted"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium truncate">
                  {conversation.contactName || conversation.phoneNumber}
                </h4>
                {conversation.unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 shrink-0">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {conversation.phoneNumber}
              </p>
              {conversation.lastMessageAt && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
