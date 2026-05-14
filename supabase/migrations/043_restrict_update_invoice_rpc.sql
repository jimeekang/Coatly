-- Keep the draft invoice update RPC off the anonymous REST surface.

revoke all on function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb)
  from public;

grant execute on function public.update_invoice_with_line_items(uuid, uuid, jsonb, jsonb)
  to authenticated;
