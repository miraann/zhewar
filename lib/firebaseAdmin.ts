import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  DEFAULT_NOTIFICATION_SOUND, NotificationSoundId, isNotificationSound, soundChannelId, soundResource,
} from '@/lib/notificationSounds';

const DEAD_TOKEN_CODES = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

function getApp(): App {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

async function sendPushToAdmins(
  tokens: string[],
  title: string,
  body: string,
  sound: NotificationSoundId,
  data?: Record<string, string>,
) {
  if (!tokens.length) return [];
  const messaging = getMessaging(getApp());
  const results = await Promise.allSettled(
    tokens.map((token) =>
      messaging.send({
        token,
        // Keep the `notification` block: when the app is swiped away, Android's
        // FCM SDK draws it in the tray itself without starting any app code. A
        // data-only message would need the app's JS, which isn't running then.
        notification: { title, body },
        data,
        android: {
          // Delivered immediately, even in Doze, since it shows a notification
          priority: 'high',
          notification: {
            // Android 8+ takes sound, importance and lock-screen visibility
            // from the channel; these fields cover Android 7 and older
            sound: soundResource(sound) ?? 'default',
            channelId: soundChannelId(sound),
            priority: 'max',
            visibility: 'public',
          },
        },
      }),
    ),
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error('FCM send failed for token ending', tokens[i].slice(-8), r.reason?.code ?? r.reason);
    }
  });

  return results;
}

export interface NotifyResult {
  total:  number;
  sent:   number;
  failed: number;
}

// Pushes to every registered admin device — or only `onlyToken`, when it is
// one of them — with the sound picked in Settings, and drops tokens FCM
// reports as no longer registered.
export async function notifyAdmins(
  title: string,
  body: string,
  data?: Record<string, string>,
  onlyToken?: string,
): Promise<NotifyResult> {
  const supabase = getSupabaseAdmin();

  let tokenQuery = supabase.from('admin_fcm_tokens').select('token');
  if (onlyToken) tokenQuery = tokenQuery.eq('token', onlyToken);

  const [{ data: tokenRows, error }, { data: profile }] = await Promise.all([
    tokenQuery,
    supabase.from('barber_profile').select('notification_sound').single(),
  ]);
  if (error) throw new Error(`admin_fcm_tokens read failed: ${error.message}`);

  const tokens = (tokenRows ?? []).map((r: { token: string }) => r.token);
  if (!tokens.length) return { total: 0, sent: 0, failed: 0 };

  const sound = isNotificationSound(profile?.notification_sound) ? profile.notification_sound : DEFAULT_NOTIFICATION_SOUND;
  const results = await sendPushToAdmins(tokens, title, body, sound, data);

  const deadTokens = results
    .map((r, i) => ({ r, token: tokens[i] }))
    .filter(({ r }) => r.status === 'rejected' && DEAD_TOKEN_CODES.includes(r.reason?.code))
    .map(({ token }) => token);
  if (deadTokens.length) {
    await supabase.from('admin_fcm_tokens').delete().in('token', deadTokens);
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return { total: tokens.length, sent, failed: tokens.length - sent };
}
