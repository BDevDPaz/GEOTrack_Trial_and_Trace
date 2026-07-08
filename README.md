# GEOTrack Trial and Trace

Aplicación móvil desarrollada con Expo y React Native para gestión de asistencia, trazabilidad de jornadas, geolocalización, sesiones laborales, reportes y validación operativa.

El proyecto está orientado a ofrecer una base robusta para control de asistencia georreferenciada, registro de sesiones de trabajo, cálculo operativo y generación de reportes, con énfasis en flujo offline/local, auditoría técnica y estabilidad del runtime.

---

## Estado actual del proyecto

Estado del repositorio:

- Rama principal: `main`
- Última versión marcada: `v1.0.1`
- Expo SDK actual: `54.0.35`
- Auditoría npm: `0 vulnerabilities`
- Tests: `14 test suites passed`
- Pruebas totales: `66 tests passed`
- Lint: aprobado
- TypeScript typecheck: aprobado

Últimas mejoras integradas:

- Consolidación de ramas pendientes en `main`.
- Limpieza de ramas locales y remotas ya fusionadas.
- Hardening del flujo de navegación inicial.
- Uso de rutas tipadas con `Href` en `expo-router`.
- Alineación de colores con tokens semánticos del tema.
- Mejora de resiliencia en persistencia de onboarding/disclaimer.
- Actualización de documentación.
- Corrección de vulnerabilidades moderadas transitivas mediante `overrides` controlados.
- Prevención de upgrade mayor forzado de Expo.

---

## Tecnologías principales

- Expo
- React Native
- TypeScript
- Expo Router
- SQLite
- AsyncStorage
- Jest
- Expo Lint
- npm overrides

---

## Funcionalidades principales

### Gestión de sesiones laborales

- Inicio, seguimiento y cierre de sesiones.
- Confirmación de llegada.
- Estados de sesión controlados por dominio.
- Persistencia local mediante SQLite.
- Adaptadores para separación entre runtime, base de datos y motor de negocio.

### Geolocalización y asistencia

- Validaciones relacionadas con geofencing.
- Flujo de ubicación endurecido mediante pruebas.
- Integración con servicios de background.
- Manejo de eventos asociados a asistencia georreferenciada.

### Reportes

- Generación de reportes operativos.
- Soporte para cálculos relacionados con horas y nómina.
- Utilidades separadas para lógica de fechas, payroll y geolocalización.

### Navegación y UX inicial

- Protección de rutas mediante `NavigationGuard`.
- Flujo controlado para:
  - onboarding,
  - disclaimer,
  - tabs principales,
  - pantalla de settings como ruta de recuperación.
- Redirecciones tipadas usando `Href` de `expo-router`.
- Tokens semánticos de color para textos primarios y secundarios.

### Auditoría y hardening

- Pruebas dedicadas para reducer, effects, selectors, geolocation, notifications y navegación.
- Scripts de auditoría técnica en `scripts/audit`.
- Correcciones aplicadas evitando cambios destructivos o upgrades mayores innecesarios.

---

## Instalación

Clona el repositorio:

```bash
git clone git@github.com:BDevDPaz/GEOTrack_Trial_and_Trace.git
cd GEOTrack_Trial_and_Trace
```

Instala dependencias:

```bash
npm install
```

---

## Ejecución en desarrollo

Inicia Expo:

```bash
npx expo start
```

Según el entorno, puedes abrir la app en:

- Android
- iOS
- Expo Go
- Development build

---

## Scripts disponibles

Ejecutar pruebas:

```bash
npm test
```

Ejecutar lint:

```bash
npm run lint
```

Ejecutar typecheck:

```bash
npm run typecheck
```

Auditoría de dependencias de producción:

```bash
npm audit --omit=dev
```

Ver árbol de dependencias auditadas:

```bash
npm ls postcss uuid expo @expo/metro-config @expo/config-plugins xcode
```

> Nota: actualmente no existe un script `build` definido en `package.json`.

---

## Validaciones actuales

La última validación realizada fue exitosa:

```bash
npm audit --omit=dev
```

Resultado:

```text
found 0 vulnerabilities
```

```bash
npm test
```

Resultado:

```text
Test Suites: 14 passed, 14 total
Tests:       66 passed, 66 total
Snapshots:   0 total
```

```bash
npm run lint
```

Resultado:

```text
passed
```

```bash
npm run typecheck
```

Resultado:

```text
passed
```

---

## Seguridad de dependencias

El proyecto mantiene Expo en la versión `54.0.35`.

Para resolver vulnerabilidades moderadas transitivas sin forzar una actualización mayor de Expo, se usan `overrides` en `package.json`:

```json
"overrides": {
  "postcss": "8.5.10",
  "uuid": "11.1.1"
}
```

Esto corrige vulnerabilidades reportadas en dependencias transitivas usadas por paquetes internos de Expo:

- `postcss`
- `uuid`

La corrección fue aplicada sin usar:

```bash
npm audit fix --force
```

Esto evita una actualización automática mayor hacia Expo SDK 57 sin una migración controlada.

---

## Flujo Git recomendado

Antes de comenzar trabajo nuevo:

```bash
git switch main
git pull --ff-only origin main
git fetch --all --prune
```

Crear una rama nueva:

```bash
git switch -c tipo/descripcion-corta
```

Ejemplo:

```bash
git switch -c chore/update-docs
```

Validar antes de commitear:

```bash
git diff --check
npm audit --omit=dev
npm test
npm run lint
npm run typecheck
```

Commit recomendado:

```bash
git add .
git commit -m "tipo(scope): descripción breve"
```

Publicar rama:

```bash
git push origin nombre-de-rama
```

Abrir Pull Request hacia:

```text
base: main
compare: nombre-de-rama
```

---

## Convención de commits

Se recomienda usar una convención similar a Conventional Commits:

```text
feat(scope): nueva funcionalidad
fix(scope): corrección de bug
chore(scope): mantenimiento o dependencias
docs: cambios de documentación
test(scope): pruebas
refactor(scope): refactor sin cambio funcional
```

Ejemplos recientes:

```text
docs: update project README
chore(deps): override vulnerable transitive dependencies
fix(app): harden startup navigation and theme tokens
```

---

## Estructura general del proyecto

```text
app/
  _layout.tsx
  onboarding.tsx
  disclaimer.tsx
  (tabs)/
  session/

src/
  components/
  constants/
  context/
  core/
    contracts/
    effects/
    hooks/
    reducer/
    runtime/
    selectors/
    state/
  database/
  feedback/
  services/
  utils/

scripts/
  audit/
  fix/
  images/
```

---

## Áreas relevantes

### `app/`

Contiene la estructura de rutas de Expo Router, layout raíz, onboarding, disclaimer, tabs y pantallas de sesión.

### `src/core/`

Contiene el motor principal de estado, reducer, effects, contratos, runtime adapters, selectors y pruebas asociadas.

### `src/services/`

Contiene servicios operativos como background tasks, localización, notificaciones y reportes.

### `src/database/`

Contiene la capa de persistencia SQLite.

### `src/utils/`

Contiene utilidades de fechas, geolocalización, payroll, logging y proveedor de tiempo.

### `scripts/audit/`

Contiene auditorías técnicas para Android, concurrencia, base de datos, geofencing, logger, payroll, seguridad, tiempo y UI.

---

## Notas de mantenimiento

### No usar directamente

```bash
npm audit fix --force
```

salvo que se esté trabajando explícitamente en una rama de migración mayor de Expo.

### Para revisar vulnerabilidades

```bash
npm audit
npm audit --omit=dev
```

### Para revisar dependencias críticas

```bash
npm ls postcss uuid expo @expo/metro-config @expo/config-plugins xcode
```

### Para comprobar estado Git

```bash
git status
git branch -a
git branch -r --no-merged main
git log --oneline --decorate -5
```

---

## Versión estable

La versión estable marcada actualmente es:

```text
v1.0.1
```

El tag fue publicado en GitHub y representa el estado posterior a la consolidación de `main` y hardening inicial.

---

## Estado final recomendado

Antes de continuar desarrollo, el repositorio debe mostrar:

```bash
git status
```

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

Y:

```bash
npm audit --omit=dev
```

```text
found 0 vulnerabilities
```

---

## Licencia

Pendiente de definir.