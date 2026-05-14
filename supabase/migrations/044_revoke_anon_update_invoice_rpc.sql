-- Explicitly remove anonymous execute from the draft invoice update RPC.

revoke execute on function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb)
  from anon;
