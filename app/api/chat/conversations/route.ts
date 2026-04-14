import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  chatPersistenceService,
  isMissingChatPersistenceTableError,
} from "@/services/chat/chat-persistence.service";
import type { ApiError, ChatConversationListResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const payload: ApiError = {
        error: "Unauthorized.",
        details: "Sign in to load previous chats.",
      };

      return NextResponse.json(payload, { status: 401 });
    }

    try {
      const conversations = await chatPersistenceService.listConversations({
        userId: user.id,
        limit: 30,
      });

      const payload: ChatConversationListResponse = { conversations };
      return NextResponse.json(payload, { status: 200 });
    } catch (error) {
      if (isMissingChatPersistenceTableError(error)) {
        const payload: ChatConversationListResponse = {
          conversations: [],
          note:
            "Run `supabase/migrations/20260411_create_chat_history.sql` to persist and load previous chats from the database.",
        };

        return NextResponse.json(payload, { status: 200 });
      }

      throw error;
    }
  } catch (error) {
    const payload: ApiError = {
      error: "Unable to load previous chats.",
      details: getErrorMessage(error),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
