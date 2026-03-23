'use client';

import { useEffect, useRef, useState } from 'react';
import type { AbnLookupData } from '@/lib/abn-lookup';
import { normalizeAbn } from '@/lib/abn-lookup';

type AbnLookupState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: AbnLookupData; error: null }
  | { status: 'error'; data: null; error: string };

const idleState: AbnLookupState = {
  status: 'idle',
  data: null,
  error: null,
};

export function useAbnLookup(abn: string) {
  const normalizedAbn = normalizeAbn(abn);
  const [state, setState] = useState<AbnLookupState>(idleState);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (normalizedAbn.length !== 11) {
      isFirstRender.current = false;
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setState({ status: 'loading', data: null, error: null });

      try {
        const response = await fetch(`/api/abn-lookup?abn=${normalizedAbn}`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });

        const payload = (await response.json()) as
          | { data?: AbnLookupData; error?: string }
          | undefined;

        if (!response.ok || !payload?.data) {
          setState({
            status: 'error',
            data: null,
            error: payload?.error ?? 'ABN details could not be loaded.',
          });
          return;
        }

        setState({ status: 'success', data: payload.data, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;

        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'ABN details could not be loaded.',
        });
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [normalizedAbn]);

  if (normalizedAbn.length !== 11) {
    return idleState;
  }

  return state;
}
