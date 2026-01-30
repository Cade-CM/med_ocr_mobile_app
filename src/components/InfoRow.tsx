/**
 * Reusable Info Row Component
 * 
 * Displays an icon with label/value, commonly used for
 * settings rows and detail displays.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface InfoRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  label?: string;
  value: string | React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
  borderBottom?: boolean;
}

export function InfoRow({
  icon,
  iconColor = '#007AFF',
  label,
  value,
  onPress,
  showChevron = false,
  rightElement,
  style,
  borderBottom = true,
}: InfoRowProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        borderBottom && styles.borderBottom,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      
      <View style={styles.textContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        {typeof value === 'string' ? (
          <Text style={styles.value} numberOfLines={2}>{value}</Text>
        ) : (
          value
        )}
      </View>
      
      {rightElement}
      
      {showChevron && (
        <MaterialIcons name="chevron-right" size={24} color="#CCC" />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});
