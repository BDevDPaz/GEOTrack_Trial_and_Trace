# GEOTrack Trial and Trace

Aplicación móvil desarrollada con **Expo**, **React Native** y **TypeScript** para gestión de asistencia, trazabilidad de jornadas, geolocalización, sesiones laborales, reportes y validación operativa.

El proyecto está orientado a ofrecer una base robusta para control de asistencia georreferenciada, registro de sesiones de trabajo, cálculo operativo y generación de reportes, con énfasis en:

- flujo offline/local,
- persistencia segura,
- auditoría técnica,
- estabilidad del runtime,
- navegación controlada,
- pruebas automatizadas,
- validaciones de Gold Master.

---

## Estado actual del proyecto

Estado del repositorio:

- Rama principal: `main`
- Expo SDK actual: `54.0.35`
- Auditoría npm: `0 vulnerabilities`
- TypeScript typecheck: aprobado
- ESLint strict: aprobado, sin warnings
- Prettier: aprobado
- Tests: `14 test suites passed`
- Pruebas totales: `66 tests passed`
- Gold Master audit: aprobado
- Dependencias circulares: no detectadas
- Expo Doctor: `18/18 checks passed`
- Auditoría de dead code con Knip: disponible como revisión separada no bloqueante

Validación profesional actual:

```bash
npm run gm:deep
```

Resultado esperado:

```text
typecheck      OK
lint:strict    OK
format:check   OK
test           OK
audit:gm       OK
lint:cycles    OK
expo-doctor    OK
```

---

## Objetivo del proyecto

GEOTrack Trial and Trace busca proveer una app móvil confiable para registrar, validar y auditar jornadas laborales desde un dispositivo móvil.

El diseño técnico prioriza:

- separación entre UI, dominio, efectos y runtime;
- almacenamiento local con SQLite;
- uso de adaptadores para servicios externos o nativos;
- endurecimiento de navegación inicial;
- cálculo de horas y estimaciones operativas;
- trazabilidad mediante logs y auditorías;
- capacidad de validación antes de release mediante un pipeline Gold Master.

---

## Tecnologías principales

- Expo
- React Native
- TypeScript
- Expo Router
- SQLite
- AsyncStorage
- Jest
- ESLint
- Prettier
- Madge
- Knip
- Expo Doctor
- npm overrides

---

## Funcionalidades principales

### Gestión de sesiones laborales

- Inicio, seguimiento y cierre de sesiones.
- Confirmación de llegada.
- Estados de sesión controlados por dominio.
- Historial de sesiones.
- Pantalla de detalle por sesión.
- Edición y eliminación controlada de sesiones.
- Persistencia local mediante SQLite.
- Adaptadores para separar runtime, base de datos y motor de negocio.

### Geolocalización y asistencia

- Validaciones relacionadas con geofencing.
- Cálculo de distancia y radio de tolerancia.
- Flujo de ubicación endurecido mediante pruebas.
- Integración con servicios de background.
- Manejo de eventos asociados a asistencia georreferenciada.
- Detección y manejo de condiciones operativas alrededor de ubicación.

### Reportes

- Generación de reportes operativos.
- Soporte para cálculos relacionados con horas y nómina.
- Utilidades separadas para fechas, payroll y geolocalización.
- Adaptador de reportes aislado del core de dominio.

### Notificaciones

- Servicios para recordatorios y notificaciones.
- Adaptador runtime para desacoplar implementación nativa.
- Pruebas dedicadas para comportamiento de notificaciones.

### Navegación y UX inicial

- Protección de rutas mediante lógica de guardia de navegación.
- Flujo controlado para:
  - disclaimer,
  - onboarding,
  - tabs principales,
  - settings como ruta de recuperación.
- Uso de Expo Router.
- Redirecciones tipadas.
- Estado inicial rehidratado antes de permitir navegación principal.

### UI y sistema visual

- Componentes UI reutilizables.
- Tokens centralizados de tema.
- Tipografía y espaciado consistentes.
- Componentes de estado operativo, tarjetas, badges, modales y bloques de resumen.
- Auditoría de sistema visual documentada en `DESIGN_SYSTEM_AUDIT.md`.

### Auditoría y hardening

- Auditorías técnicas en `scripts/audit`.
- Gold Master audit automatizado.
- Pruebas dedicadas para:
  - reducer,
  - effects,
  - engine,
  - selectors,
  - geolocation,
  - navigation,
  - notifications,
  - logging bridge,
  - utilities.
- Validación de dependencias circulares con Madge.
- Validación de salud Expo con Expo Doctor.
- Auditoría de dead code con Knip como herramienta de mantenimiento separada.

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

Verifica dependencias Expo:

```bash
npx expo install --check
```

Verifica salud general del proyecto Expo:

```bash
npx expo-doctor
```

---

## Ejecución en desarrollo

Inicia Expo:

```bash
npm start
```

También puedes usar directamente:

```bash
npx expo start
```

Ejecutar en Android:

```bash
npm run android
```

Ejecutar en iOS:

```bash
npm run ios
```

Ejecutar en web:

```bash
npm run web
```

> Nota: si Metro indica que está corriendo en modo CI y quieres watch/reload interactivo, asegúrate de no iniciar Expo con `CI=true`.

---

## Scripts disponibles

### Desarrollo

```bash
npm start
npm run android
npm run ios
npm run web
```

### TypeScript

```bash
npm run typecheck
```

Ejecuta:

```bash
tsc --noEmit
```

### Lint base Expo

```bash
npm run lint
```

Ejecuta:

```bash
expo lint
```

### Lint estricto

```bash
npm run lint:strict
```

Ejecuta:

```bash
eslint . --max-warnings=0
```

Este comando es bloqueante: cualquier warning de ESLint hace fallar la validación.

### Fix automático de ESLint

```bash
npm run lint:fix
```

Ejecuta:

```bash
eslint . --fix
```

### Formato con Prettier

Aplicar formato:

```bash
npm run format
```

Validar formato:

```bash
npm run format:check
```

### Tests

```bash
npm test
```

Ejecuta:

```bash
jest --coverage --no-watchman
```

### Auditoría Gold Master

```bash
npm run audit:gm
```

Ejecuta:

```bash
tsx scripts/audit/gold-master.ts
```

### Gold Master principal

```bash
npm run gm
```

Ejecuta:

```bash
npm run typecheck && npm run lint:strict && npm run format:check && npm run test && npm run audit:gm
```

Este es el pipeline principal de validación antes de considerar estable un cambio.

### Gold Master profundo

```bash
npm run gm:deep
```

Ejecuta:

```bash
npm run gm && npm run lint:cycles && npx expo-doctor
```

Este pipeline añade:

- validación de dependencias circulares,
- revisión de salud Expo.

### Dependencias circulares

```bash
npm run lint:cycles
```

Ejecuta:

```bash
madge --circular --extensions ts,tsx src app
```

Resultado esperado:

```text
No circular dependency found
```

### Auditoría de dead code

```bash
npm run audit:deadcode
```

También disponible como:

```bash
npm run lint:deadcode
```

Ejecuta:

```bash
knip
```

Esta auditoría está separada del pipeline bloqueante porque puede requerir revisión humana en proyectos Expo/React Native. Knip puede detectar archivos, exports o dependencias aparentemente no usados que en algunos casos existen por convención, configuración, tooling o trabajo futuro.

---

## Validaciones actuales recomendadas

Antes de hacer commit o abrir Pull Request:

```bash
npm run gm:deep
```

Validación esperada:

```text
typecheck      OK
lint:strict    OK
format:check   OK
test           OK
audit:gm       OK
lint:cycles    OK
expo-doctor    OK
```

Para revisar deuda técnica estructural:

```bash
npm run audit:deadcode
```

Para revisar vulnerabilidades:

```bash
npm audit --omit=dev
```

Resultado esperado actual:

```text
found 0 vulnerabilities
```

---

## Gold Master audit

El proyecto incluye un sistema de auditoría técnica en:

```text
scripts/audit/
```

Auditorías disponibles:

```text
android
concurrency
database
geofencing
logger
payroll
security
time
ui
```

Ejecutar auditoría completa:

```bash
npm run audit:gm
```

Ejecutar auditorías individuales:

```bash
npm run audit:android
npm run audit:concurrency
npm run audit:db
npm run audit:geo
npm run audit:logs
npm run audit:payroll
npm run audit:security
npm run audit:time
npm run audit:ui
```

La auditoría genera:

```text
audit-report.json
audit-report.md
```

Estos archivos se consideran artefactos generados.

---

## Política respecto a Knip

Knip se usa como herramienta de auditoría para detectar:

- archivos no usados,
- dependencias no usadas,
- devDependencies no usadas,
- exports no usados,
- tipos exportados no usados,
- dependencias no listadas,
- exports duplicados.

Sin embargo, en este proyecto Knip no forma parte del flujo bloqueante `gm` ni `gm:deep`.

Motivo:

- Expo y React Native pueden usar dependencias por configuración o convención.
- Expo Router usa rutas basadas en archivos.
- Algunos módulos pueden estar preparados para integración futura.
- Algunos exports pueden existir como API interna o pública del dominio.
- La eliminación automática de código sin triage puede ser riesgosa.

Uso recomendado:

```bash
npm run audit:deadcode
```

Luego clasificar hallazgos en:

```text
1. borrar ahora
2. mantener por convención/framework
3. mantener por roadmap
4. ignorar mediante configuración futura
5. convertir en issue técnico
```

No usar automáticamente:

```bash
knip --fix
```

sin revisión previa.

---

## Seguridad de dependencias

El proyecto mantiene Expo en la versión:

```text
54.0.35
```

Para resolver vulnerabilidades transitivas sin forzar una actualización mayor de Expo, se usan `overrides` controlados en `package.json`:

```json
"overrides": {
  "postcss": "8.5.10",
  "uuid": "11.1.1"
}
```

Esta estrategia evita el uso de:

```bash
npm audit fix --force
```

salvo que se esté trabajando explícitamente en una rama de migración mayor.

---

## No usar sin una rama dedicada

Evitar en `main`:

```bash
npm audit fix --force
```

Motivo:

- puede forzar upgrades mayores;
- puede cambiar versiones de Expo o dependencias críticas;
- puede introducir incompatibilidades sin migración controlada.

Si se necesita hacer una migración mayor:

```bash
git switch -c chore/expo-major-upgrade
```

y validar progresivamente.

---

## Estructura general del proyecto

```text
app/
  _layout.tsx
  disclaimer.tsx
  onboarding.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    history.tsx
    report.tsx
    settings.tsx
  session/
    [id].tsx

assets/
  images/

scripts/
  audit/
    audits/
    core/
    gold-master.ts
  images/

src/
  components/
    modals/
    ui/
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
```

---

## Áreas relevantes

### `app/`

Contiene la estructura de rutas de Expo Router:

- layout raíz,
- disclaimer,
- onboarding,
- tabs principales,
- historial,
- reportes,
- configuración,
- detalle de sesión.

### `src/components/`

Contiene componentes reutilizables de UI y modales operativos.

Subdirectorios principales:

```text
src/components/ui
src/components/modals
```

### `src/constants/`

Contiene tokens y constantes compartidas:

- tema,
- iconos,
- animaciones.

### `src/context/`

Contiene providers de contexto global:

- tema,
- toasts/notificaciones visuales.

### `src/core/`

Contiene el núcleo de dominio:

- contratos,
- reducer,
- effects,
- engine,
- hooks,
- runtime adapters,
- selectors,
- estado inicial,
- pruebas del core.

### `src/core/runtime/`

Contiene adaptadores que aíslan el dominio de implementaciones concretas:

- ubicación,
- logging,
- notificaciones,
- reportes,
- seguridad,
- persistencia de sesión.

### `src/database/`

Contiene la capa SQLite.

Archivo principal:

```text
src/database/db.ts
```

### `src/feedback/`

Contiene puente de logs hacia feedback visual y pruebas asociadas.

### `src/services/`

Contiene servicios operativos:

- background tasks,
- location manager,
- notifications,
- report generator.

### `src/utils/`

Contiene utilidades compartidas:

- fechas,
- setup de Day.js,
- geolocalización,
- i18n,
- logger,
- payroll,
- proveedor de tiempo.

### `scripts/audit/`

Contiene el sistema de auditoría técnica del proyecto.

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
npm run gm:deep
```

Opcionalmente revisar dead code:

```bash
npm run audit:deadcode
```

Revisar estado:

```bash
git status
git diff --check
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
chore(scope): mantenimiento, tooling o dependencias
docs: cambios de documentación
style: formato sin cambio funcional
test(scope): pruebas
refactor(scope): refactor sin cambio funcional
```

Ejemplos:

```text
chore: stabilize gold master quality pipeline
style: apply prettier formatting
docs: update project README
fix(app): harden startup navigation and theme tokens
test(core): add reducer coverage
```

---

## Flujo recomendado antes de release

Ejecutar:

```bash
git status
npm install
npx expo install --check
npm run gm:deep
npm audit --omit=dev
```

Resultado esperado:

```text
working tree clean
dependencies up to date
typecheck OK
lint OK
format OK
tests OK
gold master OK
no circular dependencies
expo doctor OK
0 vulnerabilities
```

Si se desea revisar deuda técnica adicional:

```bash
npm run audit:deadcode
```

---

## Comandos útiles de mantenimiento

Ver archivos modificados:

```bash
git diff --name-only
```

Ver ramas remotas no fusionadas a `main`:

```bash
git branch -r --no-merged main
```

Ver últimos commits:

```bash
git log --oneline --decorate -10
```

Ver estado de dependencias relevantes:

```bash
npm ls postcss uuid expo
```

Ver vulnerabilidades:

```bash
npm audit
npm audit --omit=dev
```

Ver estructura del proyecto:

```bash
tree --gitignore
```

---

## Reportes generados

La auditoría Gold Master genera:

```text
audit-report.json
audit-report.md
```

La cobertura de Jest genera:

```text
coverage/
```

Expo puede generar:

```text
.expo/
```

Estos archivos o carpetas no deben tratarse como fuente principal del proyecto.

---

## Estado estable esperado

Después de un ciclo de validación exitoso, el repositorio debería mostrar:

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
npm run gm:deep
```

debería finalizar con:

```text
Gold Master audit passed
No circular dependency found
18/18 checks passed
```

---

## Licencia

Pendiente de definir.

```

```
