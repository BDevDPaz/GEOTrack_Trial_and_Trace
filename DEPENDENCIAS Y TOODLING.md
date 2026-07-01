---

# **INVENTARIO TÉCNICO: PACKAGE.JSON Y TOOLING DE WTRACKER v2.1.0**

## 📦 **TABLA DE DEPENDENCIAS CLAVE**

| **Paquete** | **Versión** | **Tipo** | **Propósito** | **Riesgo** | **Estado** | **Recomendación** |
|---|---|---|---|---|---|---|
| **expo** | ~51.0.8 | dep | SDK principal (entrada a RN) | ⚠️ MEDIO | ✅ Actual | Mantener actualizado cada 2 semanas |
| **react** | 18.2.0 | dep | Core UI library | 🟡 BAJO | ✅ Actual | Versión LTS estable |
| **react-native** | 0.74.5 | dep | Motor rendering nativo | 🔴 CRÍTICO | ⚠️ En soporte | Upgrade a 0.75+ en Q3 2026 |
| **expo-router** | ~3.5.14 | dep | Navegación basada en archivos | ⚠️ MEDIO | ✅ Actual | Próximas features en 3.6+ |
| **react-native-reanimated** | ~3.10.1 | dep | Animaciones 60fps nativas | 🟡 BAJO | ✅ Actual | Babel plugin crítico (línea 7 babel.config.js) |
| **@expo/vector-icons** | ^14.0.0 | dep | Ionicons v5+ (UI) | 🟡 BAJO | ✅ Actual | Soporte completo |
| **expo-crypto** | ~13.0.2 | dep | SHA-256 (PIN settings) | 🟡 BAJO | ✅ Actual | Funcionalidad específica |
| **expo-haptics** | ~13.0.1 | dep | Feedback háptico | 🟡 BAJO | ✅ Actual | Micro-interacciones |
| **react-native-keyboard-aware-scroll-view** | ^0.9.5 | dep | Keyboard handling en modales | 🔴 CRÍTICO | ⚠️ Desactualizado | Última actualización: 2021 |
| **react-native-safe-area-context** | 4.10.5 | dep | SafeArea (notches, home bar) | 🟡 BAJO | ✅ Actual | Estable y mantenido |
| **react-native-screens** | 3.31.1 | dep | Optimización navegación | 🟡 BAJO | ✅ Actual | Parte core de expo-router |
| **react-native-web** | ~0.19.10 | dep | Compatibilidad web | 🟡 BAJO | ⚠️ Parcial | Solo dev/test |
| **typescript** | ~5.3.3 | devDep | Tipado estricto | 🟡 BAJO | ✅ Actual | Versión stable |
| **@babel/core** | ^7.20.0 | devDep | Transpilación JS | 🟡 BAJO | ✅ Actual | Parte de Expo |
| **@types/react** | ~18.2.45 | devDep | Tipos de React | 🟡 BAJO | ✅ Actual | Sincronizado con React 18.2 |

---

## 🚨 **RIESGOS CRÍTICOS IDENTIFICADOS**

### **🔴 RIESGO T-1: React Native 0.74.5 Próximo a EOL**

| **Aspecto** | **Detalle** |
|---|---|
| **Versión actual** | 0.74.5 (released Feb 2024) |
| **Soporte** | Vence: Nov 2024 (6 meses) |
| **Problema** | Próximas security patches solo en 0.75+ |
| **Impacto** | Después de Nov 2024 → vulnerabilidades sin parches |
| **Línea** | `package.json` línea 23 |
| **Gravedad** | 🔴 **CRÍTICA** - Security EOL |
| **Recomendación** | Planificar upgrade a 0.75+ antes de Q4 2024 |

```json
// Versión a considerar en Fase de Upgrade:
// "react-native": "0.75.0" (próximo LTS)
// Timing: Agosto 2026 (post-beta testing)
```

**Migration Path:**
```bash
# 1. Audit breaking changes
# https://github.com/facebook/react-native/releases/tag/v0.75.0

# 2. Update deps
npm install react-native@0.75.0

# 3. Clear caches
expo prebuild --clean

# 4. Test on actual devices (iOS + Android)
npm run ios
npm run android

# 5. Run full test suite (cuando exista)
npm run test
```

---

### **🔴 RIESGO T-2: react-native-keyboard-aware-scroll-view Abandonado**

| **Aspecto** | **Detalle** |
|---|---|
| **Paquete** | react-native-keyboard-aware-scroll-view |
| **Versión** | ^0.9.5 |
| **Última actualización** | 2021-05-30 (3+ años atrás) |
| **Estado** | ⚠️ Mantenimiento mínimo |
| **Uso** | `src/components/modals/DailySetupModal.tsx` línea 13 |
| **Problema** | Incompatibilidades con RN 0.74+ |
| **Impacto** | Keyboard no se oculta correctamente en Android en modales |
| **Gravedad** | 🔴 **CRÍTICA** - UX en modales |
| **Recomendación** | Reemplazar con `expo-keyboard` o `react-native-keyboard-controller` |

```json
// Opción 1: Usar expo-keyboard (nativo en Expo)
{
  "expo-keyboard": "~13.0.0"  // Oficial
}

// Opción 2: Reemplazo moderno (más control)
{
  "react-native-keyboard-controller": "^1.12.0"  // Mantenido activamente
}
```

**Migración:**
```typescript
// Antes (DailySetupModal.tsx):
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Después:
import Keyboard from 'expo-keyboard';
import { useEffect } from 'react';

export function DailySetupModal(...) {
  useEffect(() => {
    // Manejar keyboard manually
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => { ... });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => { ... });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Modal content */}
    </ScrollView>
  );
}
```

---

### **🔴 RIESGO T-3: Sin Testing Framework**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | No hay Jest, Vitest, o testing-library en devDependencies |
| **Línea** | `package.json` (no existe) |
| **Impacto** | No se pueden escribir tests unitarios/E2E |
| **Gravedad** | 🔴 **CRÍTICA** - Sin pruebas automáticas |
| **Recomendación** | Agregar Jest + testing-library/react-native |

```json
// Agregar a devDependencies:
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0",
    "@testing-library/jest-native": "^5.4.3",
    "jest-expo": "~50.0.0",
    "ts-jest": "^29.1.1"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**jest.config.js:**
```javascript
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.(test|spec).ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
};
```

---

### **🔴 RIESGO T-4: Sin Linting (ESLint)**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | No hay ESLint configurado para enforcing code style |
| **Línea** | `package.json` (no existe) |
| **Impacto** | Inconsistencia de código, bugs por estilos divergentes |
| **Gravedad** | 🔴 **CRÍTICA** - Code quality |
| **Recomendación** | Agregar ESLint + Prettier |

```json
{
  "devDependencies": {
    "eslint": "^8.55.0",
    "@react-native-community/eslint-config": "^3.2.0",
    "prettier": "^3.1.1",
    "eslint-plugin-react-native": "^4.1.0",
    "eslint-plugin-react-hooks": "^4.6.0"
  },
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  }
}
```

**.eslintrc.json:**
```json
{
  "extends": [
    "@react-native-community",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

---

### **🔴 RIESGO T-5: Sin Seguridad (npm audit)**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | No hay scripts de auditoría o automatización de seguridad |
| **Línea** | `package.json` (no existe) |
| **Impacto** | Vulnerabilidades desconocidas en dependencias |
| **Gravedad** | 🔴 **CRÍTICA** - Security |
| **Recomendación** | Agregar npm audit + automatización CI |

```json
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "audit:severe": "npm audit --audit-level=high && exit 1 || exit 0"
  }
}
```

**Pre-commit hook (.husky/pre-commit):**
```bash
#!/bin/sh
npm run lint
npm run audit
```

---

### **🟠 RIESGO T-6: Versioning Inconsistente**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Mix de `~`, `^`, y fixed versions sin consistencia |
| **Línea** | `package.json` líneas 12-28 |
| **Impacto** | Semver interpretation issues, inconsistent installs |
| **Gravedad** | 🟠 **MEDIA** - Dependency management |
| **Recomendación** | Estandarizar versioning strategy |

```json
// ANTES (inconsistente):
{
  "@expo/vector-icons": "^14.0.0",    // Permite minor/patch
  "expo": "~51.0.8",                   // Solo permite patch
  "react-native-reanimated": "~3.10.1" // Solo permite patch
}

// DESPUÉS (consistente - tilde para estabilidad):
{
  "@expo/vector-icons": "~14.0.0",
  "expo": "~51.0.8",
  "react": "~18.2.0",
  "react-native": "~0.74.5",
  "react-native-reanimated": "~3.10.1"
}
```

**Razón:** `~` es más conservador en ecosistema React Native donde breaking changes ocurren en minor versions.

---

### **🟠 RIESGO T-7: Sin Type Checking en CI**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | TypeScript configurado pero no se ejecuta en build/CI |
| **Línea** | `package.json` (sin script `tsc --noEmit`) |
| **Impacto** | Type errors pasan a runtime sin detectar |
| **Gravedad** | 🟠 **MEDIA** - Type safety |
| **Recomendación** | Agregar script de verificación |

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch"
  }
}
```

---

### **🟠 RIESGO T-8: Babel Plugin Order Crítico**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | `react-native-reanimated/plugin` DEBE ser último en babel.config.js |
| **Línea** | `babel.config.js` línea 7 (✓ Correcto) |
| **Impacto** | Si se reordena, Reanimated worklets se rompen |
| **Gravedad** | 🟠 **MEDIA** - Build integrity |
| **Recomendación** | Documentar esto en comentario (ya está ✓) |

```javascript
// babel.config.js - CORRECTO ✓
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ✅ CORRECTO: react-native-reanimated/plugin DEBE ser el último
      'react-native-reanimated/plugin',
    ],
  };
};

// ❌ INCORRECTO (si se agrega otro plugin después):
// plugins: [
//   'react-native-reanimated/plugin',
//   'otro-plugin',  // ← ROMPE Reanimated
// ]
```

---

### **🟡 RIESGO T-9: Sin Hot Reload Configuration**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Metro bundler usa default, sin optimizaciones |
| **Línea** | `metro.config.js` (configuración mínima) |
| **Impacto** | Rebuild lento en desarrollo (especialmente Android) |
| **Gravedad** | 🟡 **BAJA** - DX (developer experience) |
| **Recomendación** | Optimizar metro config |

```javascript
// metro.config.js - MEJORADO
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCLIBuild: process.env.EXPO_BUILD_ENVIRONMENT !== 'local',
});

// Optimizaciones
config.watchFolders = [
  // Incluir solo carpetas necesarias para reducir I/O
];

config.resolver.blockList = [
  /node_modules\/.*\/\.git$/,
  /node_modules\/.*\/__tests__$/,
  /node_modules\/.*\.test\.js$/,
];

module.exports = config;
```

---

### **🟡 RIESGO T-10: Sin Documentación de Dependencias**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Cada dependencia sin comentario de propósito |
| **Línea** | `package.json` (no hay comentarios) |
| **Impacto** | Confusión sobre qué hace cada paquete |
| **Gravedad** | 🟡 **BAJA** - Onboarding |
| **Recomendación** | Agregar archivo DEPENDENCIES.md |

```markdown
# DEPENDENCIES.md

## Production Dependencies

### Core Framework
- **expo** (~51.0.8): SDK principal y entry point
- **react-native** (~0.74.5): Motor rendering nativo (iOS/Android)
- **react** (~18.2.0): React core library

### Navigation & Routing
- **expo-router** (~3.5.14): File-based routing (similar a Next.js)
- **react-native-screens** (3.31.1): Navigator optimization
- **react-native-safe-area-context** (4.10.5): SafeArea (notches, home indicator)

### UI & Animations
- **react-native-reanimated** (~3.10.1): 60fps animations (worklet-based)
- **@expo/vector-icons** (~14.0.0): Ionicons v5+ icon library

### Utilities
- **expo-crypto** (~13.0.2): SHA-256 hashing (used in settings PIN)
- **expo-haptics** (~13.0.1): Haptic feedback (vibration)
- **expo-font** (~12.0.10): Custom font loading
- **expo-constants** (~16.0.2): App constants access
- **expo-linking** (~6.3.1): Deep linking
- **expo-status-bar** (~1.12.1): Status bar management

### Forms & Input
- **react-native-keyboard-aware-scroll-view** (^0.9.5): ⚠️ DEPRECATED - Keyboard handling in modals
  - [Issue](https://github.com/APSL/react-native-keyboard-aware-scroll-view/issues/xxx)
  - Plan to replace with expo-keyboard or react-native-keyboard-controller

### Web Support
- **react-native-web** (~0.19.10): Web compatibility layer (development only)
- **react-dom** (18.2.0): React web target

## Development Dependencies

### Language & Types
- **typescript** (~5.3.3): Type safety
- **@types/react** (~18.2.45): React type definitions

### Build Tools
- **@babel/core** (^7.20.0): JavaScript transpiler
- babel-preset-expo: Expo preset for Babel

## Missing/Recommended Dependencies

- **jest**: Testing framework (MISSING)
- **eslint**: Linting (MISSING)
- **prettier**: Code formatting (MISSING)
- **husky**: Git hooks (MISSING)
- **react-native-pdf**: PDF export (MISSING - for reports)
```

---

## 📊 **TABLA DE SCRIPTS**

| **Script** | **Comando** | **Propósito** | **Fase** | **Estado** |
|---|---|---|---|---|
| **start** | `expo start` | Inicia dev server (selecciona iOS/Android/Web) | Dev | ✅ |
| **ios** | `expo start --ios` | Inicia en simulador iOS | Dev | ✅ |
| **android** | `expo start --android` | Inicia en simulador Android | Dev | ✅ |
| **web** | `expo start --web` | Inicia en navegador | Dev | ⚠️ Limitado |
| **test** | ❌ NO EXISTE | Ejecutar tests | Test | 🔴 |
| **lint** | ❌ NO EXISTE | Validar código | Lint | 🔴 |
| **type-check** | ❌ NO EXISTE | Verificar tipos TS | Build | 🔴 |
| **build:ios** | ❌ NO EXISTE | Build para App Store | Build | 🔴 |
| **build:android** | ❌ NO EXISTE | Build para Play Store | Build | 🔴 |
| **audit** | ❌ NO EXISTE | Auditoría de seguridad | Security | 🔴 |

---

## 🔧 **TOOLING DE CALIDAD (ESTADO)**

| **Herramienta** | **Estado** | **Propósito** | **Crítica** | **Recomendación** |
|---|---|---|---|---|
| **TypeScript** | ✅ Instalado | Tipado estricto | 🔴 SÍ | Agregar `type-check` script |
| **Babel** | ✅ Configurado | Transpilación JS | 🔴 SÍ | Mantener (Expo dependency) |
| **ESLint** | ❌ NO | Linting | 🔴 SÍ | **Instalar inmediatamente** |
| **Prettier** | ❌ NO | Formatting | 🟡 | Instalar junto con ESLint |
| **Jest** | ❌ NO | Testing | 🔴 SÍ | **Instalar y configurar** |
| **Husky** | ❌ NO | Git hooks | 🟡 | Instalar para CI/CD |
| **GitHub Actions** | ❌ NO | CI/CD | 🔴 SÍ | Crear workflows |
| **npm audit** | ❌ NO | Security scanning | 🔴 SÍ | Ejecutar manualmente |
| **SonarQube** | ❌ NO | Code quality | 🟡 | Considerar para producción |

---

## 📋 **CONFIGURACIÓN TSCONFIG.JSON (ANÁLISIS)**

```json
{
  "extends": "expo/tsconfig.base",      // ✅ Hereda config base de Expo
  "compilerOptions": {
    "strict": true,                     // ✅ CRÍTICO: Tipado estricto
    "jsx": "react-native",              // ✅ Correcto para RN
    "allowSyntheticDefaultImports": true, // ✅ Interop ES modules
    "esModuleInterop": true,            // ✅ CommonJS ↔ ES6
    "skipLibCheck": true,               // ⚠️ RIESGO: Salta validación de librerías
    "forceConsistentCasingInFileNames": true // ✅ Previene bugs en diferentes OSes
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

### **Recomendación de Cambios:**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": false,              // ❌ CAMBIAR: Valida tipos de libs
    "forceConsistentCasingInFileNames": true,
    
    // Agregar para mejor DX:
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "lib": ["es2020", "dom"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@context/*": ["src/context/*"],
      "@constants/*": ["src/constants/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build"
  ]
}
```

---

## 📋 **CONFIGURACIÓN APP.JSON (ANÁLISIS)**

```json
{
  "expo": {
    "name": "W Tracker",                    // ✅ Display name
    "slug": "wtracker",                     // ✅ URL slug
    "version": "2.1.0",                     // ⚠️ Manual - sincronizar con package.json
    "orientation": "portrait",              // ✅ Correcto para tracking
    "userInterfaceStyle": "dark",           // ✅ Luxury Glass Dark theme
    
    "ios": {
      "supportsTablet": true,               // ✅ iPad support
      "bundleIdentifier": "com.wtracker.app" // ✅ Único para App Store
    },
    
    "android": {
      "adaptiveIcon": { ... },              // ✅ Dynamic icons (Android 8+)
      "package": "com.wtracker.app"         // ✅ Único para Play Store
    },
    
    "plugins": [
      "expo-router",                        // ✅ File-based routing
      "expo-font"                           // ✅ Custom fonts
    ],
    
    "experiments": {
      "typedRoutes": true                   // ✅ Type-safe routing
    }
  }
}
```

### **Recomendación:**

```json
{
  "expo": {
    // ... existing ...
    
    // Agregar:
    "sdkVersion": "51",                     // Explícito: match expo version
    "privacy": "private",
    "runtimeVersion": {
      "policy": "appVersion"               // Updates automáticos por versión
    },
    
    // Para build:
    "owner": "BDevDPaz",
    "ios": {
      // ... existing ...
      "supportsTablet": true,
      "buildNumber": "1",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "WTracker necesita ubicación para geocercado",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "WTracker necesita ubicación en background"
      }
    },
    "android": {
      // ... existing ...
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

---

## 🏗️ **PROPUESTA DE ESTRUCTURA MEJORADA (package.json)**

```json
{
  "name": "wtracker",
  "version": "2.1.0",
  "description": "Enterprise-grade mobile app for autonomous time tracking, geofencing, and forensic job audit",
  "main": "expo-router/entry",
  "private": true,
  
  "scripts": {
    // Development
    "start": "expo start",
    "start:web": "expo start --web",
    "start:ios": "expo start --ios",
    "start:android": "expo start --android",
    
    // Building
    "build": "eas build",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "prebuild": "expo prebuild --clean",
    
    // Quality
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    // Security
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    
    // CI/CD
    "ci": "npm run type-check && npm run lint && npm run test && npm run audit"
  },
  
  "dependencies": {
    "@expo/vector-icons": "~14.0.0",
    "expo": "~51.0.8",
    "expo-constants": "~16.0.2",
    "expo-crypto": "~13.0.2",
    "expo-font": "~12.0.10",
    "expo-haptics": "~13.0.1",
    "expo-linking": "~6.3.1",
    "expo-router": "~3.5.14",
    "expo-status-bar": "~1.12.1",
    "react": "~18.2.0",
    "react-dom": "~18.2.0",
    "react-native": "~0.74.5",
    "react-native-keyboard-aware-scroll-view": "^0.9.5",
    "react-native-reanimated": "~3.10.1",
    "react-native-safe-area-context": "~4.10.5",
    "react-native-screens": "~3.31.1",
    "react-native-web": "~0.19.10"
  },
  
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@react-native-community/eslint-config": "^3.2.0",
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^12.4.0",
    "@types/jest": "^29.5.11",
    "@types/react": "~18.2.45",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "jest": "^29.7.0",
    "jest-expo": "~50.0.0",
    "prettier": "^3.1.1",
    "ts-jest": "^29.1.1",
    "typescript": "~5.3.3"
  },
  
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  
  "expo": {
    "plugins": [
      "expo-router"
    ]
  }
}
```

---

## 📋 **MATRIZ DE IMPLEMENTACIÓN DE TOOLING**

| **Herramienta** | **Prioridad** | **Semana** | **Paquetes** | **Configuración** | **Effort** |
|---|---|---|---|---|---|
| **ESLint + Prettier** | 🔴 CRÍTICA | Semana 1 | eslint, prettier, @react-native-community/eslint-config | .eslintrc.json, .prettierrc | 4 horas |
| **Jest + Testing Library** | 🔴 CRÍTICA | Semana 2 | jest, jest-expo, @testing-library/react-native, ts-jest | jest.config.js, setupTests.ts | 8 horas |
| **Husky + Lint-staged** | 🟠 ALTA | Semana 3 | husky, lint-staged | .husky/pre-commit, .lintstagedrc | 2 horas |
| **GitHub Actions CI** | 🟠 ALTA | Semana 3 | (ninguno - config) | .github/workflows/ci.yml | 4 horas |
| **Upgrade React Native** | 🟠 ALTA | Q3 2026 | react-native@0.75+ | Testing exhaustivo | 2-3 días |
| **Reemplazar KeyboardAware** | 🟠 ALTA | Semana 4 | expo-keyboard o react-native-keyboard-controller | Refactor modales | 6 horas |
| **SonarQube/CodeClimate** | 🟡 MEDIA | Q2 2026 | (cloud service) | sonar-project.properties | 4 horas |

---

## 🚀 **CHECKLIST DE DEPENDENCIAS PARA PRODUCCIÓN**

```markdown
## Pre-Production Security Checklist

- [ ] Ejecutar `npm audit` - 0 vulnerabilidades CRÍTICAS
- [ ] Ejecutar `npm audit` - 0 vulnerabilidades ALTAS (máximo 1-2 MEDIAS con justificación)
- [ ] Verificar todas las versiones están actualizadas a latest compatible
- [ ] Documentar TODAS las dependencias en DEPENDENCIES.md
- [ ] Verificar bundle size (`expo-optimize`)
- [ ] Testear en dispositivos reales (iOS 14+, Android 8+)
- [ ] Verificar que React Native 0.74.5 está soportado hasta Nov 2024
- [ ] Planificar upgrade a RN 0.75 antes de EOL
- [ ] Reemplazar react-native-keyboard-aware-scroll-view (deprecated)

## Pre-Production Quality Checklist

- [ ] 100% `npm run type-check` sin errores
- [ ] 100% `npm run lint` sin errores
- [ ] >80% test coverage (`npm run test:coverage`)
- [ ] CI/CD green en GitHub Actions
- [ ] No console.logs en producción
- [ ] Error boundary implementado

## Pre-Production Performance Checklist

- [ ] Bundle size < 30MB (iOS), < 40MB (Android)
- [ ] App size < 100MB (iOS), < 150MB (Android)
- [ ] Startup time < 3 segundos
- [ ] Memory usage baseline documentado
- [ ] Profiling en device real realizado
```

---
