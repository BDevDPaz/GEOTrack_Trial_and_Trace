---

# **INVENTARIO TÉCNICO: ARQUITECTURA DE WTRACKER v2.1.0**

## 🏗️ **DIAGRAMA JERÁRQUICO DEL SISTEMA**

```
WTracker (Expo + React Native)
│
├─ CAPA DE PRESENTACIÓN (app/)
│  ├─ _layout.tsx (Root Layout - Inyección de Providers)
│  ├─ (tabs)/ (Tab Navigator - 4 pantallas principales)
│  │  ├─ index.tsx (HoyScreen - Operaciones activas)
│  │  ├─ history.tsx (HistoryScreen - Historial de jornadas)
│  │  ├─ report.tsx (ReportScreen - Reportes semanales)
│  │  ├─ settings.tsx (SettingsScreen - Configuración/Seguridad)
│  │  └─ _layout.tsx (Tabs Layout Configuration)
│  └─ session/[id].tsx (Detalle dinámico de jornada)
│
├─ CAPA DE CONTEXTO Y ESTADO GLOBAL (src/context/)
│  ├─ ThemeContext.tsx (Inyección dinámica de colores)
│  └─ ToastContext.tsx (Sistema de notificaciones flotantes)
│
├─ CAPA DE COMPONENTES (src/components/)
│  ├─ ui/ (Componentes atómicos y de bloque)
│  │  ├─ Button.tsx (Botón interactivo con variantes)
│  │  ├─ ScreenContainer.tsx (Wrapper de pantalla con SafeArea)
│  │  ├─ AppBrandTitle.tsx (Animación de logo con glow)
│  │  ├─ OperationalHeroCard.tsx (Card principal con máquina de estados)
│  │  ├─ StatusPill.tsx (Badge de estado dinámico)
│  │  ├─ IntegrityBadge.tsx (Badge de integridad/validación)
│  │  ├─ DailySummaryBlock.tsx (Resumen de horas y ganancias)
│  │  ├─ SystemHealthBlock.tsx (Monitor de GPS y sincronización)
│  │  ├─ SessionTimeline.tsx (Timeline de eventos de jornada)
│  │  ├─ LoadingOverlay.tsx (Modal de carga con spinner)
│  │  └─ DocumentPreviewWidget.tsx (Preview de documentos)
│  │
│  └─ modals/ (Diálogos interactivos)
│     ├─ DailySetupModal.tsx (Iniciar jornada)
│     ├─ LunchModal.tsx (Registrar descanso/almuerzo)
│     ├─ ExitDetectionModal.tsx (Alertar salida de zona)
│     ├─ EditSessionModal.tsx (Editar horarios de jornada)
│     └─ DeleteSessionModal.tsx (Confirmar eliminación)
│
├─ CAPA DE CONSTANTES Y TOKENS (src/constants/)
│  ├─ theme.ts (Paleta, radios, espacios, tipografía)
│  ├─ icons.ts (Diccionario centralizado de iconografía)
│  └─ animations.ts (Configuración global de física Reanimated)
│
└─ CONFIGURACIÓN BASE
   ├─ package.json (Dependencias)
   ├─ app.json (Expo config)
   ├─ tsconfig.json (TypeScript strict)
   ├─ babel.config.js (Reanimated plugin)
   └─ metro.config.js (Metro bundler)
```

---

## 📋 **TABLA DE MÓDULOS Y RESPONSABILIDADES**

| **Módulo** | **Ruta** | **Responsabilidad** | **Tipo** | **Dependencias Clave** |
|---|---|---|---|---|
| **RootLayout** | `app/_layout.tsx` | Inyecta providers globales (Theme, Toast), carga inicial | Screen | SafeAreaProvider, Expo Router, ThemeProvider, ToastProvider |
| **TabLayout** | `app/(tabs)/_layout.tsx` | Configura Bottom Tab Navigator con 4 pestañas | Layout | useTheme, ICONS, Haptics |
| **HoyScreen** | `app/(tabs)/index.tsx` | Pantalla principal: máquina de estados de jornada, hero card, resúmenes | Screen | OperationalHeroCard, DailySummaryBlock, SystemHealthBlock, SessionTimeline, Modals |
| **HistoryScreen** | `app/(tabs)/history.tsx` | Listado de jornadas históricas con badges de integridad | Screen | IntegrityBadge, FlatList, Router navigation |
| **ReportScreen** | `app/(tabs)/report.tsx` | Generación de reportes semanales, simulador de exportación | Screen | DocumentPreviewWidget, Button variants |
| **SettingsScreen** | `app/(tabs)/settings.tsx` | PIN seguro (SHA-256), permisos, configuración tarifaria | Screen | Crypto (expo-crypto), Button, Input |
| **SessionDetailScreen** | `app/session/[id].tsx` | Detalle de jornada individual con edición/eliminación | Screen (Modal) | EditSessionModal, DeleteSessionModal, IntegrityBadge |
| **ThemeContext** | `src/context/ThemeContext.tsx` | Proveedor global de colores (PALETTE) | Context | useMemo, createContext |
| **ToastContext** | `src/context/ToastContext.tsx` | Notificaciones flotantes animadas (éxito, error, warning, info) | Context | Reanimated, useTheme |
| **Button** | `src/components/ui/Button.tsx` | Botón reutilizable con 4 variantes + animación de escala | Component | useTheme, Haptics, Reanimated |
| **ScreenContainer** | `src/components/ui/ScreenContainer.tsx` | Wrapper con SafeAreaView y padding controlable | Component | useTheme, SafeAreaView |
| **AppBrandTitle** | `src/components/ui/AppBrandTitle.tsx` | Logo animado con glow y línea pulsante | Component | useTheme, Reanimated animations |
| **OperationalHeroCard** | `src/components/ui/OperationalHeroCard.tsx` | Card principal con máquina de 8 estados (NO_INICIADA → CERRADA) | Component | StatusPill, Button, getStateConfig logic |
| **StatusPill** | `src/components/ui/StatusPill.tsx` | Badge dinámico con 6 estados: idle, pending, active, warning, error, closed | Component | useTheme, getSpringConfig |
| **IntegrityBadge** | `src/components/ui/IntegrityBadge.tsx` | Badge de validación: valid, manual, auto, warning, error | Component | useTheme, getSpringConfig |
| **DailySummaryBlock** | `src/components/ui/DailySummaryBlock.tsx` | Resumen de horas y ganancias estimadas del día | Component | useTheme, getSpringConfig |
| **SystemHealthBlock** | `src/components/ui/SystemHealthBlock.tsx` | Monitor de GPS y sincronización con pulsación dinámica | Component | useTheme, EngineState |
| **SessionTimeline** | `src/components/ui/SessionTimeline.tsx` | Timeline visual de eventos clave de jornada | Component | useTheme, EngineState |
| **LoadingOverlay** | `src/components/ui/LoadingOverlay.tsx` | Modal de carga con spinner rotativo y estado de reconexión | Component | PALETTE (static), Reanimated |
| **DailySetupModal** | `src/components/modals/DailySetupModal.tsx` | Modal para iniciar jornada (destino + dirección) | Modal | KeyboardAwareScrollView, useTheme |
| **LunchModal** | `src/components/modals/LunchModal.tsx` | Modal para registrar descanso (0, 30, 45, 60 min) | Modal | useTheme, Button |
| **ExitDetectionModal** | `src/components/modals/ExitDetectionModal.tsx` | Alerta de salida de zona con opciones de continuar/cerrar | Modal | useTheme, Button |
| **EditSessionModal** | `src/components/modals/EditSessionModal.tsx` | Modal para editar horarios de jornada registrada | Modal | KeyboardAwareScrollView, useTheme, TextInput |
| **DeleteSessionModal** | `src/components/modals/DeleteSessionModal.tsx` | Diálogo de confirmación para eliminar jornada | Modal | useTheme, Button |
| **theme.ts** | `src/constants/theme.ts` | Definición de PALETTE (colores), RADIUS, SPACING, FONT | Constants | — |
| **icons.ts** | `src/constants/icons.ts` | Diccionario ICONS para tabs (tabs) y sistema (system) | Constants | — |
| **animations.ts** | `src/constants/animations.ts` | getSpringConfig() - configuración centralizada de física Reanimated | Constants | — |

---

## 🔄 **FLUJO DE DATOS Y PATRONES DE COMUNICACIÓN**

### **1. FLUJO GLOBAL DE ESTADO**

```
RootLayout (Provider Injection)
    ↓
SafeAreaProvider
    ├─ ThemeProvider (colores globales)
    │   └─ ToastProvider (notificaciones)
    │       └─ Stack Navigator
    │           ├─ (tabs)/ TabLayout
    │           │   ├─ HoyScreen
    │           │   ├─ HistoryScreen
    │           │   ├─ ReportScreen
    │           │   └─ SettingsScreen
    │           └─ session/[id] SessionDetailScreen
```

### **2. MÁQUINA DE ESTADOS DE JORNADA (EngineState)**

```typescript
type EngineState = 
  | 'NO_INICIADA'         // Estado inicial
  | 'ESPERANDO_LLEGADA'   // Usuario en trayecto
  | 'ASINCRONIA_CHECKIN'  // GPS inestable en llegada
  | 'NO_SHOW'             // No se registró llegada
  | 'EN_TRASLADO'         // Trasladándose entre zonas
  | 'ACTIVA'              // Jornada en curso
  | 'SALIDA_DETECTADA'    // GPS detectó salida
  | 'CERRADA'             // Jornada finalizada

Transiciones:
NO_INICIADA 
  ↓ [Iniciar jornada]
ESPERANDO_LLEGADA
  ↓ [GPS confirms arrival]
ACTIVA  OR  ASINCRONIA_CHECKIN
  ↓ [Manual confirm]
ACTIVA
  ↓ [GPS detects exit]
SALIDA_DETECTADA
  ↓ [User closes]
CERRADA
```

### **3. FLUJO DE DATOS EN OPERACIONES**

#### **Iniciar Jornada**
```
HoyScreen (state: engineState='NO_INICIADA')
  ↓
[Tap "Iniciar jornada"]
  ↓
DailySetupModal (collect destination + address)
  ↓
[Confirm]
  ↓
setEngineState('ESPERANDO_LLEGADA')
  ↓
showToast('Jornada iniciada', 'success')
```

#### **Registrar Descanso**
```
HoyScreen (state: engineState='ACTIVA')
  ↓
[Tap "Añadir nota"]
  ↓
LunchModal (select 0, 30, 45, 60 min)
  ↓
[Confirm]
  ↓
showToast('Descanso registrado: X minutos', 'success')
```

#### **Detectar Salida**
```
SystemHealthBlock (monitors EngineState)
  ↓
[GPS triggers exit event]
  ↓
setEngineState('SALIDA_DETECTADA')
  ↓
ExitDetectionModal (¿continuar o cerrar?)
  ↓
User action → ACTIVA or CERRADA
```

---

## 🎨 **ARQUITECTURA DE DISEÑO (Luxury Glass Dark)**

### **Sistema de Tokens Centralizados**

```typescript
// src/constants/theme.ts
PALETTE = {
  obsidian: '#0A0A0C'       // Fondo principal
  graphite: '#121214'       // Fondos secundarios
  carbonMist: '#1C1C1F'     // Capas elevadas (cards)
  steelLine: '#2A2A2E'      // Bordes y divisores
  textPrimary: '#FFFFFF'
  textSecondary: '#A1A1AA'
  textMuted: '#52525B'
  mutedGold: '#D4AF37'      // ACENTO PRINCIPAL
  successGreen: '#27AE60'
  amberWarning: '#F2994A'
  deepRed: '#EB5757'
  slateBlue: '#546E7A'
}

RADIUS = { round: 9999, cards: 16, inputs: 12 }
SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
FONT = { h1, h2, h3, bodyStrong, body, caption, label }
```

### **Inyección Dinámica (useTheme Hook)**

```typescript
// En CUALQUIER componente:
const { colors } = useTheme();

// Uso:
<View style={{ backgroundColor: colors.obsidian }}>
  <Text style={{ color: colors.mutedGold }}>Hola</Text>
</View>
```

### **Física de Animaciones Centralizada**

```typescript
// src/constants/animations.ts
getSpringConfig() = {
  damping: 20,
  stiffness: 90,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2
}

// Usado en: FadeInDown, SlideInDown, LinearTransition
// Garantiza consistencia táctil en toda la app
```

---

## 🔌 **DEPENDENCIAS CLAVE DEL PROYECTO**

| **Librería** | **Versión** | **Propósito** | **Uso en WTracker** |
|---|---|---|---|
| **React Native** | 0.74.5 | Framework móvil | Base de toda la UI |
| **Expo** | ~51.0.8 | SDK multiplataforma | Orquestación, assets, permisos |
| **Expo Router** | ~3.5.14 | Enrutamiento basado en archivos | Navegación (tabs + modal stack) |
| **React Native Reanimated** | ~3.10.1 | Animaciones nativas 60fps | Transiciones, springs, interpolaciones |
| **React Native Safe Area Context** | 4.10.5 | SafeArea handling | Layouts seguros en notches |
| **@expo/vector-icons** | ^14.0.0 | Ionicons 5+ | Toda la iconografía de la UI |
| **expo-haptics** | ~13.0.1 | Feedback háptico | Vibración en botones y transiciones |
| **expo-crypto** | ~13.0.2 | Funciones criptográficas | Hash SHA-256 para PIN |
| **react-native-keyboard-aware-scroll-view** | ^0.9.5 | Keyboard handling en modales | Desplazamiento automático en inputs |
| **TypeScript** | ~5.3.3 | Tipado estricto | Desarrollo type-safe |

---

## 🎯 **PATRONES ARQUITECTÓNICOS DETECTADOS**

### **1. Feature-Sliced Design (FSD)**
- **Estructura clara**: `app/` (rutas), `src/components/`, `src/context/`, `src/constants/`
- **Separación de responsabilidades**: UI atómica vs. modales vs. contexto vs. tokens

### **2. Domain-Driven Design (DDD)**
- **Dominio principal**: `Jornada` (EngineState con 8 estados)
- **Entidades**: Session, Badge, Toast
- **Casos de uso**: Iniciar, Registrar descanso, Detectar salida, Editar, Eliminar

### **3. React Context API (Inyección de Dependencias)**
- **ThemeContext**: Inyecta colores a nivel global
- **ToastContext**: Inyecta notificaciones globales
- **Sin Redux/Zustand**: Manejo de estado simplificado

### **4. Composición de Componentes**
- **Componentes atómicos** (Button, StatusPill, IntegrityBadge)
- **Componentes de bloque** (DailySummaryBlock, SystemHealthBlock)
- **Componentes complejos** (OperationalHeroCard con máquina de estados)

### **5. Centralización de Configuración**
- **Tokens de diseño** en `constants/theme.ts`
- **Iconografía** en `constants/icons.ts`
- **Física de animación** en `constants/animations.ts`
- **Garantiza**: Consistencia visual y cambios globales sin refactorización

---

## ⚠️ **RIESGOS ARQUITECTÓNICOS CRÍTICOS**

### **🔴 RIESGO 1: Falta de Persistencia de Datos**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | No hay AsyncStorage, SQLite o persistencia observable |
| **Impacto** | Todas las jornadas se pierden al reiniciar la app (demo simulado) |
| **Líneas afectadas** | `app/(tabs)/history.tsx` → MOCK_HISTORY hardcoded |
| **Gravedad** | 🔴 **CRÍTICA** - Aplicación no es funcional sin persistencia |
| **Recomendación** | Implementar: SQLite (local) + AsyncStorage (caché) o Firebase/Supabase |

---

### **🔴 RIESGO 2: Lógica de Máquina de Estados Dispersa**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | `EngineState` definida en `OperationalHeroCard.tsx` pero usada en 5+ componentes |
| **Impacto** | Cambios en transiciones requieren editar múltiples archivos |
| **Líneas afectadas** | `app/(tabs)/index.tsx`, `SystemHealthBlock`, `SessionTimeline`, etc. |
| **Gravedad** | 🟠 **ALTA** - Acoplamiento implícito |
| **Recomendación** | Crear `src/domain/journeyStateMachine.ts` centralizado |

```typescript
// Propuesta:
export const journeyStates = {
  NO_INICIADA: {...},
  ESPERANDO_LLEGADA: {...},
  // ... con transiciones válidas
} as const
```

---

### **🔴 RIESGO 3: Falta de Validación de Entrada**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Modales aceptan input sin sanitización (DailySetupModal, EditSessionModal) |
| **Impacto** | Inyección de datos malintencionados en campos de destino/dirección |
| **Líneas afectadas** | `DailySetupModal.tsx` línea ~75, `EditSessionModal.tsx` línea ~80 |
| **Gravedad** | 🟠 **ALTA** - Seguridad de datos |
| **Recomendación** | Añadir validadores: `trim()`, `maxLength`, regex patterns |

---

### **🟠 RIESGO 4: Toast Context Pisa Toast Anterior**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | `ToastContext.tsx` línea 55 limpia `timerRef` sin verificar estado previo |
| **Impacto** | Si se dispara rápidamente 2 toasts, el segundo cancela el primero |
| **Líneas afectadas** | `src/context/ToastContext.tsx` línea 55-58 |
| **Gravedad** | 🟠 **MEDIA** - UX, no crítica |
| **Recomendación** | Implementar cola de toasts o stack |

---

### **🟠 RIESGO 5: No hay Error Boundary**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Error en componente profundo derriba toda la app |
| **Impacto** | Crash sin graceful fallback |
| **Líneas afectadas** | `app/_layout.tsx` no tiene ErrorBoundary |
| **Gravedad** | 🟠 **MEDIA** - Producción |
| **Recomendación** | Implementar `expo-error-boundary` o componente custom |

---

### **🟠 RIESGO 6: Animaciones Reanimated Sin Cleanup**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | `useSharedValue` en componentes modales no limpian al desmontar |
| **Impacto** | Memory leak potencial si se abren/cierran modales repetidamente |
| **Líneas afectadas** | Todos los modales en `src/components/modals/` |
| **Gravedad** | 🟡 **BAJA** - Solo con uso prolongado |
| **Recomendación** | Revisar lifecycle con `runOnJS` + cleanup en modales |

---

### **🟡 RIESGO 7: Ausencia de Tests**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | No hay `__tests__/`, `*.test.ts`, ni Jest configurado |
| **Impacto** | Refactorización = riesgo de regresiones |
| **Líneas afectadas** | Todo el repo |
| **Gravedad** | 🟡 **BAJA-MEDIA** - Proyecto en Gold Master, pero crítico para mantenimiento |
| **Recomendación** | Configurar Jest + testing-library/react-native |

---

### **🟡 RIESGO 8: Documentación API Incompleta**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Componentes sin JSDoc, interfaces sin descripciones |
| **Impacto** | Onboarding lento, cambios arriesgados |
| **Líneas afectadas** | Todos los componentes |
| **Gravedad** | 🟡 **BAJA** - Convención |
| **Recomendación** | Agregar JSDoc a interfaces y funciones exportadas |

---

### **🟡 RIESGO 9: Hardcoding de Valores Demo**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | PIN SHA-256 hardcoded, mock history, valores de tarifa fijos |
| **Impacto** | No escalable a usuarios reales |
| **Líneas afectadas** | `settings.tsx` línea 17, `history.tsx` línea 23, `report.tsx` línea 154 |
| **Gravedad** | 🟡 **BAJA** - Demo/Prototipo |
| **Recomendación** | Crear archivo `.env` + configuración por usuario |

---

### **🟡 RIESGO 10: No hay Versionado de API de Contexto**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Si estructura de contexto cambia, rompe componentes que la usan |
| **Impacto** | Refactorización = búsqueda y replace en 20+ archivos |
| **Líneas afectadas** | Cualquier cambio en `useTheme()` o `useToast()` |
| **Gravedad** | 🟡 **BAJA** - Diseño, prevención |
| **Recomendación** | Crear `hooks/index.ts` que centralice exports de contexto |

---

## 📊 **MATRIZ DE DEPENDENCIAS ENTRE MÓDULOS**

```
HoyScreen
  ├─ useTheme() → ThemeContext
  ├─ useToast() → ToastContext
  ├─ OperationalHeroCard → useTheme, Button, StatusPill
  ├─ DailySummaryBlock → useTheme
  ├─ SystemHealthBlock → useTheme, EngineState
  ├─ SessionTimeline → useTheme, EngineState
  ├─ DailySetupModal → useTheme, Button, TextInput
  ├─ LunchModal → useTheme, Button
  └─ ExitDetectionModal → useTheme, Button

HistoryScreen
  ├─ useTheme() → ThemeContext
  ├─ IntegrityBadge → useTheme
  ├─ Router.push() → Expo Router
  └─ MOCK_HISTORY (hardcoded)

SettingsScreen
  ├─ useTheme() → ThemeContext
  ├─ useToast() → ToastContext
  ├─ Crypto.digestStringAsync() → expo-crypto
  └─ Button → useTheme

SessionDetailScreen
  ├─ useTheme() → ThemeContext
  ├─ useToast() → ToastContext
  ├─ EditSessionModal → useTheme, Button
  ├─ DeleteSessionModal → useTheme, Button
  └─ IntegrityBadge → useTheme
```

---

## 🔐 **PUNTOS CRÍTICOS DE CONTROL**

| **Punto Crítico** | **Ubicación** | **Función** | **Estado Actual** |
|---|---|---|---|
| **Máquina de Estados** | `OperationalHeroCard.tsx:export type EngineState` | Define ciclo de vida de jornada | ✅ Implementada |
| **Inyección de Tema** | `ThemeContext.tsx:useTheme()` | Propaga colores globales | ✅ Implementada |
| **Notificaciones** | `ToastContext.tsx:showToast()` | Feedback de usuario | ✅ Implementada con Reanimated |
| **Validación de PIN** | `settings.tsx:verifyAdminPinSecurely()` | Seguridad de configuración | ⚠️ Hardcoded (demo) |
| **Persistencia** | **FALTA** | Guardar/cargar jornadas | ❌ **NO IMPLEMENTADA** |
| **Sincronización GPS** | **FALTA** | Detección de ubicación | ❌ **NO IMPLEMENTADA** |
| **Caché de Reportes** | **FALTA** | Exportación PDF/CSV | ❌ **SIMULADA** |

---

## 🏁 **RESUMEN EJECUTIVO**

### **Fortalezas**
✅ **Arquitectura limpia**: FSD + DDD bien aplicados  
✅ **Design System centralizado**: Tema, animaciones, iconografía  
✅ **UX premium**: Animaciones fluidas con Reanimated v3  
✅ **TypeScript strict**: Tipado completo en toda la codebase  
✅ **Componentes reutilizables**: UI coherente y mantenible  

### **Vulnerabilidades Críticas**
🔴 **Sin persistencia**: App es demo, pierde datos al cerrar  
🔴 **Máquina de estados dispersa**: Lógica acoplada a componentes  
🔴 **Sin validación de entrada**: Campos de texto sin sanitización  

### **Deuda Técnica**
🟠 **Toast pisa anterior**: Necesita cola/stack  
🟠 **Sin Error Boundary**: App derriba sin fallback  
🟠 **Sin tests**: Refactorización = riesgo  

### **Mejoras Recomendadas (Roadmap)**
1. **Fase 1**: Implementar persistencia (SQLite + AsyncStorage)
2. **Fase 2**: Extraer máquina de estados a módulo dedicado
3. **Fase 3**: Agregar validación y sanitización en todos los inputs
4. **Fase 4**: Implementar Error Boundary y logging
5. **Fase 5**: Tests unitarios + E2E

---

¿Deseas que profundice en algún aspecto específico? Puedo generar inventarios adicionales para:
- **Componentes individuales** (análisis línea por línea)
- **Flujos de usuario** (mapeo detallado de interacciones)
- **Riesgos de seguridad** (análisis de vulnerabilidades)
- **Plan de refactorización** (pasos concretos)
