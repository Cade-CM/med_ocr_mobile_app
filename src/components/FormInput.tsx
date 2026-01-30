/**
 * Reusable Form Input Component
 * 
 * Provides consistent form input styling with label,
 * optional required indicator, and password toggle.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
}

export function FormInput({
  label,
  required = false,
  showPasswordToggle = false,
  error,
  containerStyle,
  secureTextEntry,
  ...textInputProps
}: FormInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const shouldHideText = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            showPasswordToggle && styles.inputWithToggle,
            error && styles.inputError,
          ]}
          placeholderTextColor="#999"
          secureTextEntry={shouldHideText}
          {...textInputProps}
        />
        
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <MaterialIcons
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={22}
              color="#666"
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  inputWithToggle: {
    paddingRight: 50,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  toggleButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
});
