import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  chatPersistenceService,
  isMissingChatPersistenceTableError,
} from "@/services/chat/chat-persistence.service";
import type { ApiError } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const payload: ApiError = {
        error: "Unauthorized.",
        details: "Sign in to load the conversation history.",
      };

      return NextResponse.json(payload, { status: 401 });
    }

    try {
      const messages = await chatPersistenceService.listMessages({
        conversationId,
        userId: user.id,
      });

      return NextResponse.json({ conversationId, messages }, { status: 200 });
    } catch (error) {
      if (isMissingChatPersistenceTableError(error)) {
        return NextResponse.json(
          {
            conversationId,
            messages: [],
            note:
              "Run `supabase/migrations/20260411_create_chat_history.sql` to persist messages in the database.",
          },
          { status: 200 },
        );
      }

      throw error;
    }
  } catch (error) {
    const payload: ApiError = {
      error: "Unable to load the conversation.",
      details: getErrorMessage(error),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
