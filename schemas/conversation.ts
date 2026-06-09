import { z } from "zod";
import { CONVERSATION_CHANNELS, CONVERSATION_PRIORITIES } from "@/lib/conversations";

export const createConversationFormSchema = z.object({
  leadId: z.string().min(1, "Select a lead"),
  subject: z.string().trim().max(240, "Keep the subject under 240 characters"),
  channel: z.enum(CONVERSATION_CHANNELS),
  priority: z.enum(CONVERSATION_PRIORITIES),
});

export type CreateConversationFormValues = z.infer<typeof createConversationFormSchema>;
