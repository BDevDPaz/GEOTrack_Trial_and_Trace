import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

// Tema y Contexto Visual Puro
import { PALETTE } from '../src/constants/theme';
import { ToastProvider } from '../src/context/ToastContext';

// Integración de Feedback Reactivo (Fase 12)
import { useLogFeedback } from '../src/feedback/useLogFeedback';

/**
 * Componente auxiliar estricto para montar el listener de feedback global.
 * Se aisla aquí porque requiere que ToastProvider ya esté montado en el árbol
 * para poder consumir `useToast()` internamente.
 */
function GlobalFeedbackListener() {
  useLogFeedback();
  return null;
}

/**
 * ROOT LAYOUT (Punto de entrada de la UI)
 * 100% libre de MockDataContext y deuda técnica.
 * Expone únicamente la navegación real, el tema y la capa de notificaciones visuales.
 */
export default function RootLayout() {
  return (
    <ToastProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={PALETTE.obsidian} 
        translucent={false}
      />
      
      {/* El puente reactivo entre el Engine Canónico y el ToastContext */}
      <GlobalFeedbackListener />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: PALETTE.obsidian },
          animation: 'slide_from_right',
        }}
      >
        {/* Pestañas Principales */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
        
        {/* Vista de Detalle Modal Nativa */}
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
