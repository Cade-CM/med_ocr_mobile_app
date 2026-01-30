/**
 * Reusable Card Component
 * 
 * Provides consistent card styling with shadow and optional
 * accent border for different visual states.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export type CardVariant = 'default' | 'warning' | 'success' | 'info' | 'error';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: number;
  style?: ViewStyle;
  noBorder?: boolean;
}

const VARIANT_STYLES: Record<CardVariant, { bg: string; borderColor?: string }> = {
  default: { bg: '#FFFFFF' },
  warning: { bg: '#FFF8E1', borderColor: '#FF9500' },
  success: { bg: '#E8F5E9', borderColor: '#34C759' },
  info: { bg: '#E3F2FD', borderColor: '#007AFF' },
  error: { bg: '#FFEBEE', borderColor: '#FF3B30' },
};

export function Card({
  children,
  variant = 'default',
  padding = 16,
  style,
  noBorder = false,
}: CardProps) {
  const variantStyle = VARIANT_STYLES[variant];

  const cardStyle: ViewStyle[] = [
    styles.card,
    { backgroundColor: variantStyle.bg, padding },
    variantStyle.borderColor && !noBorder && {
      borderLeftWidth: 4,
      borderLeftColor: variantStyle.borderColor,
    },
    style,
  ].filter(Boolean) as ViewStyle[];

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8,
  },
});
