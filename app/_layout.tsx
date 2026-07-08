import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, Text } from 'react-native';
import { StatusBar } from 'react-native';

// Tema y Contexto Visual
import { PALETTE } from '../src/constants/theme';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';

// Integración de Feedback Reactivo centralizada
import { useLogFeedback } from '../src/feedback';

// Boot de la aplicación
import { bootApplication } from '../src/core/boot';

// Hooks y Selectores
import { useWorkTracker } from '../src/core/hooks';
import { selectIsHydrated, selectNeedsOnboarding, selectNeedsDisclaimer } from '../src/core/selectors';
import { ScreenContainer, AppBrandTitle } from '../src/components/ui';

function GlobalFeedbackListener() {
  useLogFeedback();
  return null;
}

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { state } = useWorkTracker();
  const segments = useSegments();
  const router = useRouter();

  const isHydrated = selectIsHydrated(state);
  const needsOnboarding = selectNeedsOnboarding(state);
  const needsDisclaimer = selectNeedsDisclaimer(state);

  useEffect(() => {
    if (!isHydrated) return;

    const isSettingsPage = segments[0] === '(tabs)' && segments[1] === 'settings';
    const isDisclaimerPage = segments[0] === 'disclaimer';
    const isOnboardingPage = segments[0] === 'onboarding';

    // Settings es siempre permitido para recuperación
    if (isSettingsPage) return;

    if (needsOnboarding) {
      if (!isOnboardingPage) {
        router.replace('/onboarding');
      }
    } else if (needsDisclaimer) {
      if (!isDisclaimerPage) {
        router.replace('/disclaimer');
      }
    } else if (isOnboardingPage || isDisclaimerPage) {
      // Si ya completó ambos, salir de esas pantallas hacia el flujo principal
      router.replace('/(tabs)');
    }
  }, [isHydrated, needsOnboarding, needsDisclaimer, segments, router]);

  if (!isHydrated) {
    return null; // O un Splash screen si existiera. El root useEffect llama a bootApplication.
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [bootError, setBootError] = React.useState<string | null>(null);

  useEffect(() => {
    bootApplication().catch(err => {
      console.error('Fallo crítico arrancando la aplicación:', err);
      setBootError(String(err));
    });
  }, []);

  if (bootError) {
    return (
      <ThemeProvider>
        <ScreenContainer>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <AppBrandTitle />
            <Text style={{ color: PALETTE.deepRed, fontSize: 18, fontWeight: 'bold', marginTop: 40, textAlign: 'center' }}>
              Error Crítico de Inicio
            </Text>
            <Text style={{ color: PALETTE.silver, marginTop: 10, textAlign: 'center' }}>
              No se pudo inicializar la aplicación. Por favor, reinicia o contacta a soporte.
            </Text>
            <Text style={{ color: PALETTE.textMuted, fontSize: 12, marginTop: 20 }}>
              {bootError}
            </Text>
          </View>
        </ScreenContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={PALETTE.obsidian}
          translucent={false}
        />

        <GlobalFeedbackListener />

        <NavigationGuard>
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

            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, animation: 'fade' }}
            />

            <Stack.Screen
              name="disclaimer"
              options={{ headerShown: false, animation: 'fade' }}
            />
          </Stack>
        </NavigationGuard>
      </ToastProvider>
    </ThemeProvider>
  );
}
