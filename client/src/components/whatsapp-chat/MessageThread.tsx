import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, Clock, AlertCircle, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  messageType: string;
  status?: string;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  phoneNumber: string;
}

export function MessageThread({ messages, isLoading, phoneNumber }: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getStatusIcon = (message: Message) => {
    if (message.direction === "inbound") return null;

    if (message.readAt) {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    if (message.deliveredAt) {
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    }
    if (message.sentAt) {
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }
    if (message.status === "failed") {
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    }
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">
          Carregando mensagens...
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          Nenhuma mensagem ainda. Envie a primeira!
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.direction === "outbound" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-2",
                  message.direction === "outbound"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.direction === "inbound" && (
                  <div className="flex items-center gap-1 mb-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {phoneNumber}
                    </span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs opacity-70">
                    {format(new Date(message.createdAt), "HH:mm")}
                  </span>
                  {getStatusIcon(message)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
