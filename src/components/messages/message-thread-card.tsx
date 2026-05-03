"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { messagesService } from "@/lib/api/messages";
import type { MessageTargetType } from "@/lib/api/types";
import { formatMessageTimestamp, initials } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageThreadCardProps = {
  targetType: MessageTargetType;
  targetId: number;
};

export function MessageThreadCard({
  targetType,
  targetId,
}: MessageThreadCardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const readSnapshotRef = useRef<string | null>(null);
  const queryParams = useMemo(
    () => ({ targetType, targetId, page: 1, limit: 50 }),
    [targetId, targetType],
  );
  const queryKey = queryKeys.messages.thread(queryParams);

  const query = useQuery({
    queryKey,
    queryFn: () => messagesService.list(queryParams),
    enabled: Number.isFinite(targetId) && targetId > 0,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      messagesService.create({
        targetType,
        targetId,
        body,
      }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: queryKeys.messages.all() });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError
          ? error.displayMessage
          : "Não foi possível enviar a mensagem.",
      );
    },
  });

  const { isPending: isMarkingRead, mutate: markRead } = useMutation({
    mutationFn: (threadId: number) => messagesService.markRead(threadId),
  });

  const messages = query.data?.messages.data ?? [];
  const latestMessageId = messages[messages.length - 1]?.id ?? 0;

  useEffect(() => {
    const threadId = query.data?.thread.id;
    if (!threadId || isMarkingRead) return;

    const snapshot = `${threadId}:${latestMessageId}`;
    if (readSnapshotRef.current === snapshot) return;

    readSnapshotRef.current = snapshot;
    markRead(threadId);
  }, [isMarkingRead, latestMessageId, markRead, query.data?.thread.id]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    createMutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagens</CardTitle>
        <CardDescription>
          Conversa interna ligada a este pedido ou entrega.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Carregando mensagens...
          </p>
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            {query.error instanceof ApiError
              ? query.error.displayMessage
              : "Não foi possível carregar as mensagens."}
          </p>
        ) : messages.length ? (
          <div className="space-y-1.5 rounded-md bg-muted/20 p-3">
            {messages.map((message, index) => {
              const isMine = message.authorUserId === user?.id;
              const previousMessage = messages[index - 1];
              const startsGroup =
                !previousMessage ||
                previousMessage.authorUserId !== message.authorUserId;
              const authorName = isMine
                ? "Você"
                : (message.authorUser?.name ?? "Participante");
              const timestamp = formatMessageTimestamp(message.createdAt);

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-full items-end gap-2",
                    isMine ? "justify-end" : "justify-start",
                  )}
                >
                  {!isMine ? (
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        startsGroup
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "opacity-0",
                      )}
                      aria-hidden={!startsGroup}
                    >
                      {startsGroup ? initials(authorName) : null}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-md px-3 py-2 text-sm shadow-sm",
                      isMine
                        ? "bg-amber-500/20"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {!isMine && startsGroup ? (
                      <p className="mb-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        {authorName}
                      </p>
                    ) : null}
                    <p className="break-words leading-5">
                      {message.body}
                      {timestamp ? (
                        <span className="ml-2 whitespace-nowrap text-[11px] leading-none text-muted-foreground">
                          {timestamp}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma mensagem ainda.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escreva uma mensagem"
            maxLength={2000}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!body.trim() || createMutation.isPending}
            >
              <Send className="size-4" />
              Enviar mensagem
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
