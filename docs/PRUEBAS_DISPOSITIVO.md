# Pruebas en dispositivo — GEOTrack (Fase A + nómina semanal)

Rama: `fix/eas-build-and-background-tasks`. Usar el APK de *preview*.
Marca cada casilla y anota la versión del APK, el teléfono y la versión de Android.

| Dato | Valor |
|---|---|
| APK / commit | |
| Teléfono / Android | |
| Fecha | |
| Probado por | |

## 0. Preparación
- [ ] Antes de instalar: anota la tarifa actual en Ajustes y toma captura del Historial (montos de 2–3 jornadas).
- [ ] Ten al menos 1 jornada cerrada en la app actual (para probar las migraciones con datos reales).
- [ ] Ubicación del teléfono en "Precisa" y batería **sin** optimización para GEOTrack.

## 1. Instalar encima de la app actual (migraciones v1–v3)
- [ ] Instala el APK **sin desinstalar** la versión anterior. La app abre sin errores.
- [ ] Las jornadas anteriores siguen en el Historial (mismo número y fechas).
- [ ] v2: en Ajustes aparece "Distancia de aviso al iniciar (m)" con **2000**.
- [ ] v3 (tarifa congelada): abre una jornada vieja → muestra "Tarifa: $X/h" igual a la tarifa que anotaste.
- [ ] Cambia la tarifa en Ajustes → las jornadas viejas **no** cambian su tarifa ni su monto.
- [ ] Cierra y abre la app de nuevo: no se repite ninguna migración ni hay errores en el registro.

## 2. Dirección incorrecta
- [ ] Iniciar jornada con una dirección inventada (ej. "asdfgh 999") → sale **"Dirección no encontrada, revísala"** y **no** inicia.
- [ ] Al corregir el texto, el mensaje de error desaparece.
- [ ] Dirección vacía → no deja iniciar.

## 3. Dirección encontrada / dirección lejana
- [ ] Dirección real cercana → sale **"Confirma la dirección"** con la dirección que entendió la app. "Corregir" regresa al formulario; "Confirmar" inicia.
- [ ] Dirección real a **más de 2 km** → después de confirmar sale **"¿Estás seguro?"** con los km. "Corregir" no inicia; "Iniciar igual" sí.
- [ ] Cambia la distancia en Ajustes (ej. 500 m) y comprueba que el aviso respeta el nuevo valor.
- [ ] La geocerca queda en la dirección real (no en Los Ángeles): verifica en el detalle / registro las coordenadas destino.

## 4. Geocerca real: entrada y salida
- [ ] Inicia lejos y llega al lugar → entrada automática (hora de llegada registrada, notificación).
- [ ] Sal del radio configurado → salida detectada; se pide/hace la confirmación de salida según lo configurado.
- [ ] La revisión de salida usa el radio de Ajustes (prueba con un radio distinto de 200 m).
- [ ] Solo hay **una** geocerca activa (sin notificaciones duplicadas).

## 5. Salida con la app cerrada (arreglo isDeleted)
- [ ] Con jornada activa, **cierra la app** (deslizar desde recientes) y sal del radio.
- [ ] Al volver: la salida quedó registrada (tarea en segundo plano funcionó).
- [ ] En el registro **no** aparece el error de columna `isDeleted`.
- [ ] Repite con el teléfono bloqueado 10+ minutos.

## 6. Permiso de ubicación negado
- [ ] Niega el permiso de ubicación → al iniciar sale el mensaje de permiso y **no** inicia.
- [ ] Concede el permiso desde Ajustes del sistema → ya deja iniciar.

## 7. GPS sin respuesta
- [ ] Modo avión / interior sin señal (o GPS apagado con permiso concedido) → deja iniciar **sin** aviso de distancia, tras confirmar la dirección.
- [ ] Al recuperar señal, la geocerca funciona normal.

## 8. Horas extra semanales (> 40 h): pantalla vs PDF vs Historial
Crea (o edita) jornadas en una misma semana lunes–domingo, por ejemplo 5 × 8 h + sábado 6 h (46 h).
- [ ] Reporte "Semana Actual"/"Semana Pasada": total en pantalla = **Pago Estimado del PDF**.
- [ ] Suma de montos del Historial de esa semana = el mismo total.
- [ ] La jornada del sábado muestra un monto con OT (6 h × tarifa × 1.5).
- [ ] Caso 5 × 9 h: 5 h de OT diario, sin OT semanal extra (sin doble conteo).

## 9. Semana que cruza de mes ("Mes en Curso")
Ej.: ~30 h al final del mes anterior y ~15 h al inicio del mes, en la misma semana.
- [ ] "Mes en Curso" solo lista las jornadas del mes actual.
- [ ] Las horas del mes actual que pasan de 40 en esa semana salen como OT (ej. 5 h).
- [ ] Pantalla = PDF = suma del Historial del mes.

## 10. Tarifa en el detalle de jornada
- [ ] Cada jornada muestra "Tarifa: $X/h" (en inglés: "Rate: $X/h").
- [ ] Una jornada creada después de cambiar la tarifa muestra la tarifa nueva; las anteriores, la vieja.

## Resultado
| Sección | OK / Falla | Notas |
|---|---|---|
| 1 Migraciones | | |
| 2 Dirección incorrecta | | |
| 3 Dirección / lejanía | | |
| 4 Geocerca | | |
| 5 App cerrada | | |
| 6 Permiso negado | | |
| 7 GPS sin respuesta | | |
| 8 OT semanal | | |
| 9 Cruce de mes | | |
| 10 Tarifa | | |
