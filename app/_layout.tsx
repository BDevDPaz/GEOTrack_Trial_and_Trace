import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

// Tema y Contexto Visual
import { PALETTE } from '../src/constants/theme';
import { ToastProvider } from '../src/context/ToastContext';

// Integración de Feedback Reactivo centralizada
import { useLogFeedback } from '../src/feedback';

// Boot de la aplicación
import { bootApplication } from '../src/core/boot';

function GlobalFeedbackListener() {
  useLogFeedback();
  return null;
}

export default function RootLayout() {
  useEffect(() => {
    bootApplication().catch(err => {
      console.error('Fallo crítico arrancando la aplicación:', err);
    });
  }, []);

  return (
    <ToastProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={PALETTE.obsidian} 
        translucent={false}
      />
      
      <GlobalFeedbackListener />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: PALETTE.obsidian },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
        
        <Stack.Screen 
          name="session/[id]" 
          options={{ 
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
      </Stack>
    </ToastProvider>
  );
}
