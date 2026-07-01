---

# **INVENTARIO TÉCNICO: CAPA DE UI DE WTRACKER v2.1.0**

## 🗺️ **MAPA DE PANTALLAS Y NAVEGACIÓN**

```
ROOT LAYOUT (app/_layout.tsx)
│
├─ SafeAreaProvider
│  ├─ ThemeProvider (inyección global de colores)
│  │  └─ ToastProvider (notificaciones flotantes)
│  │     ├─ LoadingOverlay (splash de 2.5s)
│  │     └─ Stack Navigator
│  │         │
│  │         ├─ (tabs) TabLayout [Bottom Tab Navigator]
│  │         │   │
│  │         │   ├─ Hoy (index.tsx) ⭐ PRINCIPAL
│  │         │   │  ├─ OperationalHeroCard (máquina de estados)
│  │         │   │  ├─ DailySummaryBlock (horas/ganancias)
│  │         │   │  ├─ SystemHealthBlock (GPS/sync)
│  │         │   │  ├─ SessionTimeline (eventos)
│  │         │   │  │
│  │         │   │  └─ MODALES HIJOS
│  │         │   │     ├─ DailySetupModal (iniciar jornada)
│  │         │   │     ├─ LunchModal (registrar descanso)
│  │         │   │     └─ ExitDetectionModal (detectar salida)
│  │         │   │
│  │         │   ├─ Historial (history.tsx)
│  │         │   │  ├─ FilterPills (Todos/Semana/Mes)
│  │         │   │  └─ FlatList → SessionCards
│  │         │   │     └─ [TAP] → router.push(/session/{id})
│  │         │   │
│  │         │   ├─ Reportes (report.tsx)
│  │         │   │  ├─ PeriodSelector (navegación semanal)
│  │         │   │  ├─ SummaryCard (total semanal)
│  │         │   │  ├─ DocumentPreviewWidget
│  │         │   │  ├─ BreakdownGrid (desglose tarifario)
│  │         │   │  └─ ActionButtons (generar, compartir, enviar)
│  │         │   │
│  │         │   └─ Ajustes (settings.tsx)
│  │         │      ├─ Card: Perfil laboral
│  │         │      ├─ Card: Parámetros de jornada (🔒 protegida)
│  │         │      ├─ Card: Ubicación (health status)
│  │         │      ├─ Card: Acceso protegido (PIN SHA-256)
│  │         │      └─ ActionFooter: Guardar cambios
│  │         │
│  │         └─ session/[id] (SessionDetailScreen) 🎬 MODAL
│  │            ├─ HeroBlock (destino + badge integridad)
│  │            ├─ MetricsGrid (horas/ganancias)
│  │            ├─ TimelineBlock (eventos de jornada)
│  │            │
│  │            └─ MODALES HIJOS
│  │               ├─ EditSessionModal (editar horarios)
│  │               └─ DeleteSessionModal (confirmar eliminación)
│  │
│  └─ Toast Overlay (flotante)
```

---

## 📱 **TABLA DE PANTALLAS (SCREENS)**

| **Pantalla** | **Archivo** | **Navegación** | **Estado Local** | **Componentes Hijo** | **Modales** |
|---|---|---|---|---|---|
| **Hoy (Home)** | `app/(tabs)/index.tsx` | Tab: Home | `engineState`, `currentDestination`, `setupVisible`, `lunchVisible`, `exitVisible` | OperationalHeroCard, DailySummaryBlock, SystemHealthBlock, SessionTimeline | DailySetupModal, LunchModal, ExitDetectionModal |
| **Historial** | `app/(tabs)/history.tsx` | Tab: History | `filter` (Todos/Semana/Mes) | FilterPills, FlatList, SessionCard (AnimatedPressable) | — |
| **Reportes** | `app/(tabs)/report.tsx` | Tab: Reports | `isExporting`, `hasGenerated`, `forceMemoryError` | PeriodSelector, SummaryCard, DocumentPreviewWidget, BreakdownGrid, Button[] | — |
| **Ajustes** | `app/(tabs)/settings.tsx` | Tab: Settings | `isDirty`, `isUnlocked`, `pin`, `pinError`, `hasPermissions` | TextInput[], Button[], HealthRow[], SecureBlock | — |
| **Detalle Jornada** | `app/session/[id].tsx` | Modal (slide_from_bottom) | `isEditVisible`, `isDeleteVisible` | HeroBlock, MetricsGrid, TimelineBlock, Button[] | EditSessionModal, DeleteSessionModal |

---

## 🎨 **TABLA DE COMPONENTES REUTILIZABLES (UI)**

| **Componente** | **Archivo** | **Propósito** | **Props** | **Estados Internos** | **Dependencias** |
|---|---|---|---|---|---|
| **Button** | `src/components/ui/Button.tsx` | Botón interactivo con 4 variantes | `label, variant, isLoading, disabled, onPress, iconName` | `scale (Reanimated)` | useTheme, Haptics, Reanimated |
| **ScreenContainer** | `src/components/ui/ScreenContainer.tsx` | Wrapper con SafeArea y padding | `children, noPadding, style` | — | useTheme, SafeAreaView |
| **StatusPill** | `src/components/ui/StatusPill.tsx` | Badge de estado dinámico | `status (6 tipos), label` | — | useTheme, getSpringConfig |
| **IntegrityBadge** | `src/components/ui/IntegrityBadge.tsx` | Badge de validación/integridad | `type (5 tipos)` | — | useTheme, getSpringConfig |
| **DailySummaryBlock** | `src/components/ui/DailySummaryBlock.tsx` | Resumen horas + ganancias | `hours, earnings` | — | useTheme, getSpringConfig |
| **SystemHealthBlock** | `src/components/ui/SystemHealthBlock.tsx` | Monitor GPS + sincronización | `engineState` | `pulseOpacity (Reanimated)` | useTheme, getSpringConfig |
| **SessionTimeline** | `src/components/ui/SessionTimeline.tsx` | Timeline visual de eventos | `engineState` | — | useTheme, getSpringConfig |
| **OperationalHeroCard** | `src/components/ui/OperationalHeroCard.tsx` | Card principal con máquina de estados | `state, destination, timeString, earnings, onPrimaryAction, onSecondaryAction` | — | useTheme, StatusPill, Button, getStateConfig logic |
| **LoadingOverlay** | `src/components/ui/LoadingOverlay.tsx` | Modal de carga con spinner | `visible, message, isReconnecting` | `rotation, pulseOpacity (Reanimated)` | PALETTE (static), Reanimated |
| **AppBrandTitle** | `src/components/ui/AppBrandTitle.tsx` | Logo animado con glow | `subtitle` | `glowOpacity, glowScale, lineScale, titleLift, titleOpacity` | useTheme, Reanimated |
| **DocumentPreviewWidget** | `src/components/ui/DocumentPreviewWidget.tsx` | Preview de documento PDF simulado | `employeeName, dateRange, totalHours, totalEarnings` | — | useTheme, Reanimated |

---

## 🎭 **TABLA DE MODALES (MODALS)**

| **Modal** | **Archivo** | **Tipo** | **Disparador** | **Props** | **Acciones** | **Validación** |
|---|---|---|---|---|---|---|
| **DailySetupModal** | `src/components/modals/DailySetupModal.tsx` | Teclado (Keyboard-Aware) | `[Iniciar jornada]` en OperationalHeroCard (NO_INICIADA) | `visible, onCancel, onConfirm` | Ingresa destino + dirección (opcional) | `dest.trim()` requerido, length limits |
| **LunchModal** | `src/components/modals/LunchModal.tsx` | Radio buttons | Secundario en OperationalHeroCard (ACTIVA) | `visible, onCancel, onConfirm(minutes)` | Selecciona 0, 30, 45, 60 min | — |
| **ExitDetectionModal** | `src/components/modals/ExitDetectionModal.tsx` | Alerta (bottom sheet) | Automático en HoyScreen (SALIDA_DETECTADA) | `visible, exitTime, onContinueOperating, onCloseShift` | [Continuar] o [Finalizar] | — |
| **EditSessionModal** | `src/components/modals/EditSessionModal.tsx` | Teclado-Aware | `[Editar jornada]` en SessionDetailScreen | `visible, onCancel, onSave` | Edita horarios (in/out time) + nota | Detecta datos inválidos (??), muestra warning |
| **DeleteSessionModal** | `src/components/modals/DeleteSessionModal.tsx` | Confirmación (bottom sheet) | `[Eliminar]` en SessionDetailScreen | `visible, onCancel, onConfirm` | Confirma eliminación (destructivo) | — |

---

## 🔌 **RELACIÓN UI ↔ ESTADO (STATE MANAGEMENT)**

### **1. EngineState → UI Rendering**

```typescript
type EngineState =
  | 'NO_INICIADA'      → OperationalHeroCard: "Iniciar jornada" (primary action)
  | 'ESPERANDO_LLEGADA' → OperationalHeroCard: "Confirmar llegada" (pending...)
  | 'ASINCRONIA_CHECKIN' → OperationalHeroCard: "Confirmar manualmente" (warning)
  | 'NO_SHOW'          → OperationalHeroCard: "Iniciar manualmente" (danger)
  | 'EN_TRASLADO'      → OperationalHeroCard: "Confirmar llegada" (in transit)
  | 'ACTIVA'           → OperationalHeroCard: "Finalizar jornada" (active)
  | 'SALIDA_DETECTADA' → OperationalHeroCard: "Resolver" + ExitDetectionModal
  | 'CERRADA'          → OperationalHeroCard: "Nueva jornada" (closed)

Impacto en:
- StatusPill: label y color dinámicos
- SystemHealthBlock: pulso de GPS, colores de sincronización
- SessionTimeline: completitud de timeline
- Header Orb (HoyScreen): icono + glow animado
```

### **2. Context → Inyección Global**

```typescript
ThemeContext (useTheme)
  └─ { colors }
     ├─ Todos los componentes usan colors.mutedGold, colors.obsidian, etc.
     ├─ Cambio global = refactor cero
     └─ Permite future tema oscuro/claro

ToastContext (useToast)
  └─ { showToast(message, type) }
     ├─ DailySetupModal → showToast('Monitoreo activado')
     ├─ SettingsScreen → showToast('Configuración guardada')
     └─ SessionDetailScreen → showToast('Jornada actualizada')
```

### **3. Control Flow: HoyScreen**

```
[USUARIO]
    ↓
[Tap Button: "Iniciar jornada"]
    ↓
setIsSetupModalVisible(true)
    ↓
DailySetupModal renderiza
    ↓
[USUARIO ingresa destino "Taller central"]
    ↓
[Tap "Iniciar jornada" en modal]
    ↓
onConfirm(destination, address)
    ├─ setIsSetupModalVisible(false)
    ├─ setCurrentDestination(destination)
    ├─ setEngineState('ESPERANDO_LLEGADA') ⭐ CAMBIO CRÍTICO
    └─ showToast('Monitoreo activado', 'success')
    ↓
OperationalHeroCard re-renderiza con estado ESPERANDO_LLEGADA
    ├─ StatusPill: label = "En camino"
    ├─ Button primario: label = "Confirmar llegada"
    └─ Header Orb: icon = "pin-outline", color = slateBlue
```

### **4. Control Flow: SessionDetailScreen**

```
HistoryScreen [TAP Session Card]
    ↓
router.push(`/session/101`)
    ↓
SessionDetailScreen monta con id=101
    ├─ Renderiza HeroBlock (destino, badge)
    ├─ Renderiza MetricsGrid (horas, ganancias)
    ├─ Renderiza TimelineBlock (eventos)
    └─ Footer: [Editar] [Eliminar]
    ↓
[TAP "Editar jornada"]
    ├─ setIsEditVisible(true)
    └─ EditSessionModal renderiza
    ↓
[Usuario modifica horarios] → EditSessionModal valida
    ├─ Detecta datos inválidos (includes('??')) → muestra warning rojo
    ├─ Cambios válidos → mostrar banner "El cálculo será actualizado"
    └─ [TAP Guardar]
    ↓
onSave()
    ├─ setIsEditVisible(false)
    ├─ showToast('Jornada actualizada', 'success')
    └─ SessionDetailScreen re-renderiza (fake update)
```

---

## 🎬 **FLUJO DE TRANSICIONES Y ANIMACIONES**

### **Entrada de Pantallas (FadeInDown)**

```typescript
// Estándar en todas las screens
<Animated.View entering={FadeInDown.duration(400)}>
  {/* Header */}
</Animated.View>

<Animated.View entering={FadeInDown.delay(100)...springify()...}>
  {/* Contenido principal */}
</Animated.View>

<Animated.View entering={FadeInDown.delay(200)...}>
  {/* Bloques secundarios */}
</Animated.View>

// Cascada visual: header → hero → summary → health
```

### **Entrada de Modales (SlideInDown)**

```typescript
// En DailySetupModal, EditSessionModal
<Animated.View entering={SlideInDown.springify()...}>
  {/* Modal card slide desde arriba */}
</Animated.View>

// En ExitDetectionModal, DeleteSessionModal
<Animated.View entering={FadeInDown.springify()...}>
  {/* Modal card fade in desde abajo (overlay) */}
</Animated.View>
```

### **Estados Dinámicos (useSharedValue)**

```typescript
// HoyScreen - Header Orb glow
if (orb.glow) {
  glowScale.value = withRepeat(
    withTiming(1.15, { duration: 1500 }),
    -1,
    true
  );
}

// SystemHealthBlock - Pulso GPS
if (isTracking) {
  pulseOpacity.value = withRepeat(
    withTiming(0.3, { duration: 800 }),
    -1,
    true
  );
}

// Button - Spring presión
scale.value = withSpring(0.96);  // [TAP]
scale.value = withSpring(1);     // [RELEASE]
```

---

## 🚨 **RIESGOS UX DETECTADOS**

### **🔴 RIESGO UX-1: Validación de Entrada Insuficiente**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | DailySetupModal acepta cualquier string sin sanitización |
| **Línea** | `src/components/modals/DailySetupModal.tsx` línea 75 |
| **Impacto** | Usuario ingresa destino vacío: `"    "` (espacios) → se acepta |
| **UX Problem** | No hay feedback visual de validación en real-time |
| **Gravedad** | 🔴 **CRÍTICA** - Data corruption |
| **Recomendación** | Agregar validación inline: `dest.trim().length >= 3` |

```typescript
// Antes:
disabled={!dest.trim()}

// Después:
const isValidDestination = dest.trim().length >= 3;
<TextInput
  style={[
    styles.input,
    !isValidDestination && { borderColor: colors.deepRed }
  ]}
/>
<Text>{isValidDestination ? '✓' : '⚠️ 3+ caracteres'}</Text>
```

---

### **🔴 RIESGO UX-2: No hay Confirmación de Eliminación Visual**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | DeleteSessionModal se dispara sin advertencia clara |
| **Línea** | `app/session/[id].tsx` línea 204-209 |
| **Impacto** | Usuario accidental: [TAP "Eliminar"] → clic → POOF (jornada borrada) |
| **UX Problem** | No hay timeout para cancelar, no hay "Deshacer" |
| **Gravedad** | 🔴 **CRÍTICA** - Pérdida irreversible de datos |
| **Recomendación** | Agregar doble confirmación + timeout para cancelar |

```typescript
// Propuesta:
<DeleteSessionModal
  visible={isDeleteVisible}
  onCancel={...}
  onConfirm={...}
  timeoutMs={3000}  // Usuario tiene 3s para cancelar
/>

// O: Patrón Snackbar + undo
showToast('Jornada eliminada. [Deshacer]', 'error', {
  canUndo: true,
  onUndo: () => restoreSession(id)
})
```

---

### **🟠 RIESGO UX-3: Modal "Editar" No Guarda Cambios**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | EditSessionModal cierra sin persistencia real |
| **Línea** | `app/session/[id].tsx` línea 47-50 |
| **Impacto** | Usuario edita horarios → [TAP Guardar] → toast 'success' → pero no hay cambios en servidor |
| **UX Problem** | Falsa sensación de éxito, datos no persisten |
| **Gravedad** | 🟠 **ALTA** - Expectativa rota |
| **Recomendación** | Implementar API sync + error handling |

```typescript
// Antes:
const handleSaveEdit = () => {
  setIsEditVisible(false);
  showToast('Jornada actualizada', 'success');
};

// Después:
const handleSaveEdit = async () => {
  try {
    const result = await updateSessionAPI(sessionId, editData);
    if (result.success) {
      showToast('Jornada actualizada', 'success');
      setIsEditVisible(false);
    }
  } catch (e) {
    showToast('Error al guardar', 'error');
  }
};
```

---

### **🟠 RIESGO UX-4: Estados Modales Confusos en SettingsScreen**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Card "Parámetros de jornada" está gris (opacity: 0.7) pero parece interactivo |
| **Línea** | `app/(tabs)/settings.tsx` línea 183, 432-434 |
| **Impacto** | Usuario intenta editar campos bloqueados → nada pasa → confusión |
| **UX Problem** | Feedback visual es débil (solo opacity, no disabled state obvio) |
| **Gravedad** | 🟠 **MEDIA** - UX confusa |
| **Recomendación** | Agregar visual más clara: badge 🔒, desaturación, mensaje explicativo |

```typescript
// Antes:
<View style={[styles.card, !isUnlocked && styles.cardLocked]}>

// Después:
<View style={[
  styles.card,
  !isUnlocked && {
    opacity: 0.5,
    backgroundColor: colors.graphite,
    borderColor: colors.amberWarning,
    borderWidth: 2
  }
]}>
  {!isUnlocked && (
    <View style={styles.lockOverlay}>
      <Ionicons name="lock-closed" size={24} />
      <Text>Desbloquea para editar parámetros</Text>
    </View>
  )}
</View>
```

---

### **🟠 RIESGO UX-5: No hay Indicador de "Cambios sin Guardar"**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | SettingsScreen marca `isDirty` pero no hay warning al retroceder |
| **Línea** | `app/(tabs)/settings.tsx` línea 40 |
| **Impacto** | Usuario edita configuración → [TAP otra tab] → cambios se pierden silenciosamente |
| **UX Problem** | No hay confirmación "¿Descartar cambios?" |
| **Gravedad** | 🟠 **MEDIA** - Pérdida de trabajo |
| **Recomendación** | Agregar `beforeRemove` handler + AlertDialog |

```typescript
// Propuesta:
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    if (isDirty) {
      e.preventDefault();
      Alert.alert(
        '¿Descartar cambios?',
        'Tienes cambios sin guardar',
        [
          { text: 'Mantener', onPress: () => {} },
          { text: 'Descartar', onPress: () => navigation.dispatch(e.data.action) }
        ]
      );
    }
  });
  return unsubscribe;
}, [isDirty]);
```

---

### **🟠 RIESGO UX-6: Falta de Feedback en Operaciones Lentas**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | `verifyAdminPinSecurely` tarda 650ms, pero Button no está disabled durante validación |
| **Línea** | `app/(tabs)/settings.tsx` línea 60 |
| **Impacto** | Usuario toca [Desbloquear] múltiples veces → múltiples requests |
| **UX Problem** | No hay spinner, `isUnlocking` no deshabilita botón |
| **Gravedad** | 🟠 **MEDIA** - UX friction |
| **Recomendación** | Usar `isLoading` en Button + deshabilitar durante validación |

```typescript
// Antes:
<Button
  label="Desbloquear"
  variant="ghost"
  onPress={handleUnlock}
  isLoading={isUnlocking}
  disabled={!pin.trim() || isUnlocking}  // ✓ Ya está aquí, pero Button.tsx no lo respeta
/>

// Verificar Button.tsx línea 46:
const isDisabled = disabled || isLoading;  // ✓ Correcto, pero comprobar visualmente
```

---

### **🟠 RIESGO UX-7: Toast Context Pisa Toasts Anterior**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Si usuario dispara 2 toasts rápidamente, el segundo cancela el primero |
| **Línea** | `src/context/ToastContext.tsx` línea 55-58 |
| **Impacto** | Usuario realiza 2 acciones → solo ve el último toast |
| **UX Problem** | Información crítica se pierde |
| **Gravedad** | 🟠 **MEDIA** - UX, no crítica pero molesta |
| **Recomendación** | Implementar cola de toasts (FIFO stack) |

```typescript
// Propuesta:
const [toastQueue, setToastQueue] = useState<Toast[]>([]);

const showToast = (msg: string, type: ToastType = 'info') => {
  const id = Math.random();
  setToastQueue(q => [...q, { id, msg, type }]);
  
  setTimeout(() => {
    setToastQueue(q => q.filter(t => t.id !== id));
  }, 3500);
};

// Renderizar todos:
{toastQueue.map((t, idx) => (
  <Toast key={t.id} {...t} offset={idx * 100} />
))}
```

---

### **🟡 RIESGO UX-8: HistoryScreen Mock Data No Actualiza**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | `MOCK_HISTORY` es hardcoded, FilterPills cambian `filter` state pero no filtra real |
| **Línea** | `app/(tabs)/history.tsx` línea 20-66, 76, 183 |
| **Impacto** | Usuario filtra "Semana" → lista no cambia → confusión |
| **UX Problem** | UI pretende funcionar pero es dummy |
| **Gravedad** | 🟡 **MEDIA** - Prototipo en producción |
| **Recomendación** | Implementar filtro real o remover UI de filtro |

```typescript
// Opción 1: Filtro funcional
const filteredData = MOCK_HISTORY.filter(item => {
  if (filter === 'Semana') return daysBetween(item.date) <= 7;
  if (filter === 'Mes') return daysBetween(item.date) <= 30;
  return true;
});

// Opción 2: Remover UI de filtro
{/* Comentar FilterContainer si no está funcional */}
```

---

### **🟡 RIESGO UX-9: No hay Error State en ReportScreen**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Si generación de reporte falla, solo muestra toast `'error'`, no hay UI de error |
| **Línea** | `app/(tabs)/report.tsx` línea 38-51 |
| **Impacto** | Usuario genera → falla → [Compartir] botón deshabilitado pero sin contexto visual |
| **UX Problem** | No hay error state visible, confunde usuario |
| **Gravedad** | 🟡 **BAJA** - Mockup, funciona en demo |
| **Recomendación** | Agregar error banner visual |

```typescript
// Propuesta:
const [reportError, setReportError] = useState<string | null>(null);

{reportError && (
  <View style={[styles.errorBanner, { backgroundColor: colors.deepRed }]}>
    <Ionicons name="alert-circle-outline" size={16} color="#FFF" />
    <Text style={{ color: '#FFF' }}>{reportError}</Text>
    <Pressable onPress={() => setReportError(null)}>
      <Ionicons name="close" size={16} color="#FFF" />
    </Pressable>
  </View>
)}
```

---

### **🟡 RIESGO UX-10: Transiciones Confusas en SessionDetailScreen**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | SessionDetailScreen usa `presentation: 'modal'` pero es hard-coded en Stack options |
| **Línea** | `app/_layout.tsx` línea 42-48 |
| **Impacto** | Usuario abre jornada → [TAP cerrar] → slide down (ok) pero no hay X button en header |
| **UX Problem** | Inconsistencia: Modal UI pero header actúa como screen |
| **Gravedad** | 🟡 **BAJA** - UX menor |
| **Recomendación** | Agregar cerrar visual coherente con presentación modal |

```typescript
// SessionDetailScreen header es confuso:
// - Tiene backButton con icono close ✓
// - Pero está en header row, no prominente

// Mejor: hacer más evidente el close
<Pressable 
  onPress={handleBack} 
  style={[
    styles.backButton,
    { backgroundColor: colors.graphite } // Highlight
  ]}
>
  <Ionicons name="close" size={28} color={colors.mutedGold} />
</Pressable>
```

---

### **🟡 RIESGO UX-11: Inconsistencia de Variantes Button**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Button con `variant='ghost'` se usa para acciones principales (Desbloquear) |
| **Línea** | `app/(tabs)/settings.tsx` línea 354 |
| **Impacto** | Visual débil (sin fondo) para acción importante |
| **UX Problem** | Usuario puede pasar por alto el botón |
| **Gravedad** | 🟡 **BAJA** - Diseño |
| **Recomendación** | Usar `variant='secondary'` para desbloquear, `'ghost'` para acciones menores |

---

## 📊 **MATRIZ DE FLUJOS DE ESTADO**

```
HoyScreen State Machine:
┌─────────────────────────────────────────────────────────────────┐
│ engineState: 'NO_INICIADA'                                      │
│ currentDestination: ''                                          │
│ setupVisible: false, lunchVisible: false, exitVisible: false   │
└─────────────────────────────────────────────────────────────────┘
           │
           │ [TAP OperationalHeroCard.primaryAction]
           ↓
   setIsSetupModalVisible(true)
   DailySetupModal appears
           │
           ├─ [CANCEL] → setIsSetupModalVisible(false) → back to initial
           │
           └─ [CONFIRM destination] →
              ├─ setCurrentDestination(destination)
              ├─ setEngineState('ESPERANDO_LLEGADA')
              ├─ setIsSetupModalVisible(false)
              └─ showToast('success')
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ engineState: 'ESPERANDO_LLEGADA'                                │
│ currentDestination: 'Taller central - Dirección'               │
└─────────────────────────────────────────────────────────────────┘
           │
           │ [TAP primaryAction: "Confirmar llegada"]
           ↓
   setEngineState('ASINCRONIA_CHECKIN')  [Mock: simula problema GPS]
           │
           ├─ [primaryAction: "Confirmar manualmente"] →
           │  setEngineState('NO_SHOW')
           │
           └─ [secondaryAction: "Esperando señal"] →
              showToast('Esperando señal GPS...')
              
... y así sucesivamente...
```

---

## ✅ **BEST PRACTICES APLICADAS**

| **Práctica** | **Implementación** | **Ubicación** |
|---|---|---|
| ✅ **Componentes reutilizables** | Button, StatusPill, IntegrityBadge | `src/components/ui/` |
| ✅ **Inyección de contexto** | ThemeContext, ToastContext | `src/context/` |
| ✅ **Animaciones centralizadas** | getSpringConfig() en constants | `src/constants/animations.ts` |
| ✅ **Tipado estricto** | Props interfaces, enum-like strings | Todo el código |
| ✅ **Composición de componentes** | OperationalHeroCard usa Button + StatusPill | `src/components/ui/OperationalHeroCard.tsx` |
| ✅ **Validación visual** | IntegrityBadge, StatusPill estados | `src/components/ui/` |
| ✅ **Feedback háptico** | Haptics en buttons, tab presses | `app/(tabs)/_layout.tsx`, `src/components/ui/Button.tsx` |
| ✅ **SafeArea handling** | ScreenContainer wrapper | `src/components/ui/ScreenContainer.tsx` |
| ⚠️ **Validación de entrada** | Mínima, solo trim() | DailySetupModal, EditSessionModal |
| ❌ **Persistencia** | No implementada (mock only) | Todas las screens |

---

## 🎯 **RECOMENDACIONES DE REFACTORIZACIÓN INMEDIATA**

### **Prioridad 🔴 CRÍTICA (Semana 1)**

1. **Validación de entrada en DailySetupModal**
   - Añadir minLength=3, maxLength=50 en destino
   - Agregar feedback visual de validación en real-time

2. **Confirmación de eliminación con timeout**
   - DeleteSessionModal: agregar countdown 3s
   - Opción "Deshacer" con API restore

3. **Persistencia mínima**
   - AsyncStorage para MOCK_HISTORY
   - SQLite para datos reales (futuro)

---

### **Prioridad 🟠 ALTA (Semana 2-3)**

4. **Modal Toast Stack (no pisa anterior)**
   - Implementar cola FIFO de toasts
   - Máximo 3 toasts simultáneos

5. **EditSessionModal: Guardar real**
   - Conectar a API updateSession
   - Error handling + retry logic

6. **SettingsScreen: Confirmación unsaved changes**
   - beforeRemove listener en tab navigation
   - AlertDialog "¿Descartar cambios?"

---

### **Prioridad 🟡 MEDIA (Semana 3-4)**

7. **HistoryScreen: Filtro funcional**
   - Implementar filter lógica en FlatList
   - O remover UI de filtro si es dummy

8. **ReportScreen: Error state visual**
   - Agregar error banner + retry button
   - Simulador mejorante (forceMemoryError)

9. **SessionDetailScreen: Close button prominente**
   - Visual más clara para cerrar modal
   - Consistent con presentación modal

---

## 📈 **MATRIZ DE TESTING UX RECOMENDADA**

| **Escenario** | **Pasos** | **Expected** | **Status** |
|---|---|---|---|
| Inicio jornada válida | 1. [Hoy] 2. [Iniciar] 3. "Taller central" 4. [Iniciar jornada] | engineState='ESPERANDO_LLEGADA', toast success | ⚠️ |
| Inicio jornada vacío | 1. [Hoy] 2. [Iniciar] 3. (vacío) 4. [Iniciar jornada] | Button disabled, toast warning | ❌ |
| Cerrar sin confirmación | 1. [Session detail] 2. [Eliminar] 3. Toast | Modal cierre, toast 'eliminada' | ⚠️ |
| Editar horarios inválidos | 1. [Session detail] 2. [Editar] 3. Ingresar "??" 4. [Guardar] | Banner warning rojo | ✓ |
| PIN incorrecto | 1. [Ajustes] 2. [Desbloquear] 3. Ingresar "999" 4. [Desbloquear] | pinError=true, toast error | ✓ |
| Cambios sin guardar | 1. [Ajustes] 2. Editar nombre 3. [Tab otro] | Alert confirmación | ❌ |

---
