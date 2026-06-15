import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configuration de l'affichage des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// Demande la permission et enregistre le token
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications uniquement sur appareil physique.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission notifications refusée.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name:       'Rappels entretien',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Sauvegarde le token dans Supabase
  await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);

  return token;
}

// Planifie une notification locale pour un rappel
export async function scheduleReminderNotification(
  title: string,
  body:  string,
  date:  Date,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data:  { type: 'reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

// Notification immédiate (pour test ou rappel urgent)
export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // immédiat
  });
}

// Annule toutes les notifications planifiées
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Planifie les notifications pour tous les rappels actifs
export async function scheduleAllReminders(reminders: Array<{
  id:                string;
  next_due_date:     string | null;
  maintenance_types: { name: string };
  vehicles:          { brand: string; model: string };
}>) {
  // Annule les anciennes notifs
  await cancelAllNotifications();

  for (const reminder of reminders) {
    if (!reminder.next_due_date) continue;

    const dueDate = new Date(reminder.next_due_date);
    const now     = new Date();

    // Notif J-7
    const sevenDaysBefore = new Date(dueDate);
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
    if (sevenDaysBefore > now) {
      await scheduleReminderNotification(
        `⚠️ Rappel dans 7 jours`,
        `${reminder.maintenance_types.name} — ${reminder.vehicles.brand} ${reminder.vehicles.model}`,
        sevenDaysBefore,
      );
    }

    // Notif le jour J
    if (dueDate > now) {
      await scheduleReminderNotification(
        `🔔 Entretien aujourd'hui`,
        `${reminder.maintenance_types.name} — ${reminder.vehicles.brand} ${reminder.vehicles.model}`,
        dueDate,
      );
    }
  }
}
