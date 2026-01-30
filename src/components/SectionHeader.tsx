/**
 * Section Header Component
 * 
 * Consistent section title styling for grouped content.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  subtitle,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
