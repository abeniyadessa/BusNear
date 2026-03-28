import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LogIn, LogOut, AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { RidershipEvent, ServiceAlert } from '@/types';

interface EventsFeedProps {
  ridershipEvents: RidershipEvent[];
  serviceAlerts: ServiceAlert[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatTime(ts);
}

export default function EventsFeed({ ridershipEvents, serviceAlerts }: EventsFeedProps) {
  const hasAlerts = serviceAlerts.some((a) => !a.read);

  return (
    <View style={styles.container}>
      {hasAlerts && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Alerts</Text>
          {serviceAlerts
            .filter((a) => !a.read)
            .map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertIcon}>
                  <AlertTriangle size={16} color="#C45D00" />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMessage} numberOfLines={2}>
                    {alert.message}
                  </Text>
                  <Text style={styles.alertTime}>{formatRelative(alert.createdAt)}</Text>
                </View>
              </View>
            ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        {ridershipEvents.length === 0 ? (
          <Text style={styles.emptyText}>No recent activity</Text>
        ) : (
          ridershipEvents.slice(0, 5).map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View
                style={[
                  styles.eventIcon,
                  {
                    backgroundColor:
                      event.eventType === 'boarded' ? '#E8F8EE' : '#EEF2FF',
                  },
                ]}
              >
                {event.eventType === 'boarded' ? (
                  <LogIn size={14} color="#1B7A3D" />
                ) : (
                  <LogOut size={14} color={Colors.info} />
                )}
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventText}>
                  <Text style={styles.eventName}>{event.childName}</Text>
                  {' '}
                  {event.eventType === 'boarded' ? 'boarded' : 'exited'}
                  {' '}
                  {event.busId}
                </Text>
                <Text style={styles.eventDetail}>
                  {formatTime(event.occurredAt)} • Near {event.stopName}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8EE',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE4B8',
  },
  alertIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFEED4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  alertTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  eventIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  eventName: {
    fontWeight: '600' as const,
  },
  eventDetail: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
