/**
 * Reusable Empty State Component
 * 
 * Displays a centered message with icon for empty lists
 * or error states, with optional action button.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, ButtonVariant } from './Button';

export interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionVariant?: ButtonVariant;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  iconSize = 80,
  iconColor = '#CCC',
  title,
  message,
  actionLabel,
  actionVariant = 'primary',
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <MaterialIcons name={icon} size={iconSize} color={iconColor} />
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant={actionVariant}
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
  },
  actionButton: {
    marginTop: 24,
  },
});
