/**
 * Reusable Button Component
 * 
 * Provides consistent button styling across the app with variants
 * for primary, secondary, danger, and success actions.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT_COLORS: Record<ButtonVariant, { bg: string; text: string }> = {
  primary: { bg: '#007AFF', text: '#FFFFFF' },
  secondary: { bg: '#F0F0F0', text: '#333333' },
  danger: { bg: '#FF3B30', text: '#FFFFFF' },
  success: { bg: '#34C759', text: '#FFFFFF' },
  warning: { bg: '#FF9500', text: '#FFFFFF' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const colors = VARIANT_COLORS[variant];
  const isDisabled = disabled || loading;

  const buttonStyle: ViewStyle[] = [
    styles.button,
    { backgroundColor: colors.bg },
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const labelStyle: TextStyle[] = [
    styles.text,
    { color: colors.text },
    textStyle,
  ].filter(Boolean) as TextStyle[];

  const renderIcon = () => {
    if (!icon) return null;
    return (
      <MaterialIcons
        name={icon}
        size={20}
        color={colors.text}
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <>
          {iconPosition === 'left' && renderIcon()}
          <Text style={labelStyle}>{title}</Text>
          {iconPosition === 'right' && renderIcon()}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    minHeight: 50,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
