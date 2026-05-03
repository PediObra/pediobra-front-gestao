import { api } from "./client";
import type {
  InternalMessage,
  MessageTargetType,
  MessageThreadResponse,
} from "./types";

export interface ListMessagesParams {
  targetType: MessageTargetType;
  targetId: number;
  page?: number;
  limit?: number;
}

export interface CreateMessagePayload {
  targetType: MessageTargetType;
  targetId: number;
  body: string;
}

export const messagesService = {
  list: (params: ListMessagesParams) =>
    api.get<MessageThreadResponse>("/messages", { query: params }),

  create: (payload: CreateMessagePayload) =>
    api.post<InternalMessage>("/messages", payload),

  markRead: (threadId: number) =>
    api.patch<{ threadId: number; lastReadAt: string }>(
      `/messages/threads/${threadId}/read`,
      {},
    ),
};
