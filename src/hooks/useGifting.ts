import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useSound } from "./useSound";

interface SendGiftInput {
  recipient_id: string;
  gift_type_id: string;
  post_id?: string;
  comment_id?: string;
}

export function useSendGift() {
  const queryClient = useQueryClient();
  const { play } = useSound();

  return useMutation({
    meta: { blocking: true },
    mutationFn: async (input: SendGiftInput) => {
      const { data, error } = await supabase.functions.invoke("process-gift", {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.gift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      play("gift-sent");
    },
  });
}
