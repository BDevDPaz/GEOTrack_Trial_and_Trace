import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';

export type TimelineEvent = {
  id: string;
  title: string;
  time: string;
  subtitle?: string;
  type: 'start' | 'arrival' | 'warning' | 'close' | 'note';
};

interface SessionTimelineProps {
  events: TimelineEvent[];
}

export function SessionTimeline({ events }: SessionTimelineProps) {
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  const getEventStyle = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'start': return { dotColor: colors.mutedGold, hasBorder: false };
      case 'arrival': return { dotColor: colors.successGreen, hasBorder: false };
      case 'warning': return { dotColor: colors.amberWarning, hasBorder: false };
      case 'note': return { dotColor: colors.slateBlue, hasBorder: false };
      case 'close': return { dotColor: colors.carbonMist, hasBorder: true };
      default: return { dotColor: colors.textMuted, hasBorder: false };
    }
  };

  return (
    <View style={[styles.timelineBlock, { backgroundColor: colors.graphite }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Actividad de la jornada
      </Text>

      {events.length === 0 ? (
        <Animated.Text
          entering={FadeInDown.duration(400)}
          style={[styles.emptyText, { color: colors.textMuted }]}
        >
          Aún no hay actividad.
        </Animated.Text>
      ) : (
        <View style={styles.timeline}>
          {events.map((event, index) => {
            const { dotColor, hasBorder } = getEventStyle(event.type);
            const isLast = index === events.length - 1;

            return (
              <Animated.View
                key={event.id}
                entering={FadeInDown.delay(100 + index * 100)
                  .springify()
                  .damping(springConfig.damping ?? 20)
                  .stiffness(springConfig.stiffness ?? 150)}
                style={styles.timelineNode}
              >
                <View
                  style={[
                    styles.nodeDot,
                    { backgroundColor: dotColor },
                    hasBorder && { borderWidth: 1, borderColor: colors.steelLine },
                  ]}
                />
                
                {!isLast && (
                  <View style={[styles.nodeLine, { backgroundColor: colors.steelLine }]} />
                )}
                
                <View style={styles.nodeContent}>
                  <Text style={[styles.nodeTitle, { color: colors.textPrimary }]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.nodeTime, { color: colors.textSecondary }]}>
                    {event.time} {event.subtitle ? `• ${event.subtitle}` : ''}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineBlock: {
    marginHorizontal: SPACING.xl,
    padding: 18,
    borderRadius: RADIUS.cards,
    marginBottom: SPACING.xl,
  },
  sectionTitle: { ...FONT.h3, fontSize: 16, marginBottom: SPACING.md },
  emptyText: { ...FONT.body, fontSize: 14, fontStyle: 'italic' },
  timeline: { marginTop: SPACING.sm },
  timelineNode: { flexDirection: 'row', marginBottom: SPACING.lg, position: 'relative' },
  nodeContent: { flex: 1, paddingBottom: 4 },
  nodeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    marginRight: SPACING.md,
    zIndex: 2,
  },
  nodeLine: {
    position: 'absolute',
    left: 6,
    top: 16,
    bottom: -20,
    width: 2,
    zIndex: 1,
  },
  nodeTitle: { ...FONT.bodyStrong },
  nodeTime: { ...FONT.caption, marginTop: 2 },
});
