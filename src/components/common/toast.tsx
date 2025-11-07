/*---------------------------------------
File: src/components/common/Toast.tsx
Description: Toast notification component with expandable details support
Author: Kyle Lovesy
Date: 28/10-2025 - 12.00
Version: 1.1.0
---------------------------------------*/

// React/React Native
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

// Third-party libraries
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Stores
import { useUIStore, ToastConfig } from '@/stores/use-ui-store';

// Hooks
import { useAppStyles } from '@/hooks/use-app-styles';

interface ToastItemProps {
  toast: ToastConfig;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { typography, borderRadius, spacing } = useAppStyles();
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Animated.Value instances are stable, no need for deps

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: '#E8F5E9',
          icon: '#4CAF50',
          text: '#1B5E20',
        };
      case 'error':
        return {
          bg: '#FFEBEE',
          icon: '#F44336',
          text: '#B71C1C',
        };
      case 'warning':
        return {
          bg: '#FFF3E0',
          icon: '#FF9800',
          text: '#E65100',
        };
      case 'info':
      default:
        return {
          bg: '#E3F2FD',
          icon: '#2196F3',
          text: '#0D47A1',
        };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert';
      case 'info':
      default:
        return 'information';
    }
  };

  const colors = getToastColors();
  const hasDetails = toast.details && toast.details.length > 0;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.bg,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name={getIcon()} size={24} color={colors.icon} />
        <View style={styles.content}>
          {toast.title && (
            <Text style={[typography.titleSmall, { color: colors.text }]}>{toast.title}</Text>
          )}
          <Text style={[typography.bodyMedium, { color: colors.text }]}>{toast.message}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {hasDetails && (
        <>
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.detailsToggleText, { color: colors.text }]}>
              {expanded ? 'Hide' : 'Show'} Details ({toast.details!.length})
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>

          {expanded && (
            <View style={[styles.detailsList, { borderTopColor: colors.icon }]}>
              {toast.details!.map((detail, index) => (
                <Text key={index} style={[styles.detailItem, { color: colors.text }]}>
                  • {detail}
                </Text>
              ))}
            </View>
          )}
        </>
      )}

      {toast.action && (
        <TouchableOpacity
          onPress={() => {
            toast.action?.onPress();
            handleDismiss();
          }}
          style={[styles.action, { borderTopColor: colors.icon }]}
          activeOpacity={0.7}
        >
          <Text style={[typography.labelMedium, { color: colors.icon }]}>{toast.action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export function ToastContainer() {
  const toasts = useUIStore(state => state.toasts);
  const dismissToast = useUIStore(state => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts
        .filter((toast): toast is ToastConfig & { id: string } => !!toast.id)
        .map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderTopWidth: 1,
    padding: 12,
  },
  closeButton: {
    padding: 4,
  },
  container: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 60,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  detailItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  detailsList: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailsToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
  },
  toast: {
    maxWidth: '90%',
    minWidth: 300,
  },
});
