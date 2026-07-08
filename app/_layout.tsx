import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { View, Text, StatusBar } from 'react-native';

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

  // TEMP DEBUG: remover cuando se confirme el flujo de arranque.
  console.log('[NavigationGuard]', {
    isHydrated,
    needsOnboarding,
    needsDisclaimer,
    segments,
    bootState: state.meta.bootState,
    settings: state.domain.settings,
  });

  useEffect(() => {
    if (!isHydrated) return;

    const [firstSegment, secondSegment] = segments as readonly string[];

    const isSettingsPage = firstSegment === '(tabs)' && secondSegment === 'settings';
    const isDisclaimerPage = firstSegment === 'disclaimer';
    const isOnboardingPage = firstSegment === 'onboarding';

    const onboardingRoute = '/onboarding' as Href;
    const disclaimerRoute = '/disclaimer' as Href;
    const tabsRoute = '/' as Href;

    // Settings es siempre permitido para recuperación.
    if (isSettingsPage) return;

    if (needsOnboarding && !isOnboardingPage) {
      router.replace(onboardingRoute);
      return;
    }

    if (!needsOnboarding && needsDisclaimer && !isDisclaimerPage) {
      router.replace(disclaimerRoute);
      return;
    }

    if (!needsOnboarding && !needsDisclaimer && (isOnboardingPage || isDisclaimerPage)) {
      // Si ya completó ambos, salir de esas pantallas hacia el flujo principal.
      router.replace(tabsRoute);
    }
  }, [isHydrated, needsOnboarding, needsDisclaimer, segments, router]);

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: PALETTE.obsidian,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Text style={{ color: PALETTE.textPrimary, fontSize: 16, fontWeight: '700' }}>
          Cargando aplicación...
        </Text>
        <Text
          style={{
            color: PALETTE.textMuted,
            fontSize: 12,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          Esperando hidratación del estado inicial.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [bootError, setBootError] = React.useState<string | null>(null);

  useEffect(() => {
    // TEMP DEBUG: remover cuando se confirme el flujo de arranque.
    console.log('[RootLayout] bootApplication start');

    bootApplication()
      .then(() => {
        console.log('[RootLayout] bootApplication success');
      })
      .catch(err => {
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
            <Text style={{ color: PALETTE.textSecondary, marginTop: 10, textAlign: 'center' }}>
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
