// Supabase Edge Function: push-notify
// Triggered after a ridership event is recorded.
// Looks up push tokens for parents of the child and sends via Expo Push API.
//
// Deploy with: supabase functions deploy push-notify
// Invoke via: supabase.functions.invoke('push-notify', { body: { ... } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  childId: string;
  childName: string;
  busId: string;
  eventType: 'boarded' | 'exited';
  stopName: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = (await req.json()) as PushPayload;
  const { childId, childName, busId, eventType, stopName } = payload;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY')!
  );

  // Find all parents linked to this child
  const { data: links } = await supabase
    .from('parent_children')
    .select('parent_id')
    .eq('child_id', childId);

  if (!links || links.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const parentIds = links.map((l) => l.parent_id);

  // Fetch push tokens for all parents
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('parent_id', parentIds);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const title =
    eventType === 'boarded'
      ? `${childName} boarded ${busId}`
      : `${childName} exited ${busId}`;

  const body = `${timeStr} · ${stopName}`;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data: { childId, busId, eventType, stopName },
    channelId: eventType === 'boarded' ? 'boarding' : 'proximity',
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return new Response(JSON.stringify({ sent: messages.length, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
