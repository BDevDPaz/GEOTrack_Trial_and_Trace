# Pruebas en dispositivo — GEOTrack (Fases A–D + nómina semanal)

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

## 11. Migración v4 y jornadas huérfanas (B4)
- [ ] Instalar encima de una versión v3 con datos: la app abre, historial intacto.
- [ ] Jornadas eliminadas antes de v4 siguen ocultas (heurística por auditoría: revisar casos dudosos).
- [ ] Una jornada abierta > 12 h se cierra sola al abrir la app (motivo STALE en auditoría). No llega notificación (decisión).

## 12. PDF de integridad (B6)
- [ ] Badge del detalle y color en PDF coinciden (misma clasificación).
- [ ] Eliminadas aparecen en rojo a $0; título del PDF "GEOTRACK".

## 13. Confirmación de salida por N lecturas (C5)
- [ ] Salir > 50 m del radio y quedarse fuera: salida confirmada tras ~3 lecturas (~1–2,5 min).
- [ ] Salir y volver en < 1 min: NO se detecta salida (log AMARILLO EXIT_NOT_CONFIRMED).
- [ ] Quedarse justo en el borde (radio … radio+50 m): no confirma (banda de histéresis).
- [ ] En pausa, salir de la zona no dispara nada.
- [ ] Con la app en segundo plano/cerrada: verificar que el SO deja terminar la confirmación (riesgo).

## 14. Tránsito encadenado (C7) e id de jornada
- [ ] "Otro trabajo" (botón y notificación) cierra la actual (motivo TRANSIT) y abre tramo TRAVEL.
- [ ] Hueco < 30 min: el tramo empieza al fin del anterior; > 30 min: empieza ahora.
- [ ] Al configurar destino del tramo, se guarda y la geocerca SESSION_<id> coincide con el id del historial.
- [ ] Almuerzo: solo se descuenta una vez por día (el segundo se ignora y no se vuelve a preguntar).

## 15. Cancelar trayecto (C8)
- [ ] En GEOFENCE_CREATED / TRAVEL sin llegada aparece "Cancelar trayecto", pide confirmación y deja la app en reposo.
- [ ] Tras llegar ya no aparece.

## 16. Idioma de modales (D9)
- [ ] Con idioma "en", modales de nota, borrar, editar, salida y almuerzo salen en inglés.
- [ ] Textos de la tarjeta principal (salvo "Cancelar trayecto") siguen en español (pendiente).

## 17. PIN de administrador (D10) — requiere build nuevo (expo-secure-store)
- [ ] Instalación limpia: onboarding pide crear PIN (4–8 dígitos, confirmación).
- [ ] Usuario existente: Ajustes muestra "CREAR PIN" la primera vez.
- [ ] "1234"/"0000" ya NO desbloquean (salvo que sea el PIN elegido).
- [ ] 5 PIN erróneos → bloqueo 5 min con mensaje; tras el bloqueo vuelve a aceptar.
- [ ] Cambiar tarifa/multiplicador crea entrada RATE_CHANGED en auditoría con valores anterior → nuevo.
- [ ] Olvido de PIN: no hay recuperación (solo borrar datos de la app). Confirmar si es aceptable.

## 18. Recordatorio de almuerzo (D11)
- [ ] Por defecto desactivado: no llega nada.
- [ ] Activar en Ajustes (hora 12:00 u otra), guardar, reiniciar app: el ajuste persiste.
- [ ] Llegar al trabajo antes de la hora: llega la notificación a la hora.
- [ ] Registrar almuerzo / pausar / cerrar antes de la hora: no llega.
- [ ] Guardar ajustes también conserva "lecturas de salida" y radio (antes se reseteaban).

## 19. Dirección inversa (D12)
- [ ] Al crear jornada con GPS, el PDF muestra "Configurada en: <dirección>".
- [ ] En modo avión / sin red: la jornada se crea igual y el PDF no muestra la línea.

## 20. Recordatorio diario no borra el de almuerzo
1. Activar el recordatorio de almuerzo (p. ej. 12:00) y luego cambiar/guardar el recordatorio diario.
2. Esperado: ambos siguen programados; a la hora llega el aviso de almuerzo. (Solo se cancela el id `geotrack_daily_reminder`).

## 21. Salida en segundo plano (~30 s)
1. Jornada ACTIVE_WORK, app en segundo plano/pantalla apagada. Alejarse a > radio + 50 m.
2. Esperado: el EXIT del SO cuenta como 1ª lectura; con 2 lecturas más a ~15 s llega el aviso de salida en ~30 s (con N=3). La hora de salida es la del primer EXIT.
3. Repetir quedándose en la franja radio…radio+50 m: no debe confirmar.
4. Repetir en PAUSA: no debe confirmar nada.

## 22. App matada durante la confirmación
1. Provocar el EXIT y, antes de 30 s, forzar el cierre de la app (o que el SO la mate).
2. Reabrir fuera del sitio: aparece la confirmación de salida con la hora del primer EXIT; la jornada sigue abierta hasta que el usuario decide.
3. Repetir reabriendo dentro del sitio: no aparece nada, la jornada continúa.
4. Reabrir sin GPS / en la franja ±50 m: no pasa nada; se vuelve a intentar al volver a primer plano. Más de 12 h después se descarta.

## 23. Textos de la tarjeta principal y almuerzo real
1. Cambiar idioma a inglés: la tarjeta principal (estado, botones, TIEMPO/GANANCIA) y los botones de Control Operativo salen en inglés.
2. Terminar una jornada indicando 30 min de almuerzo. Reabrir la app (migración v5): el resumen semanal descuenta 30 min (no 60) y el registro tiene inicio/fin de almuerzo reales (fin = hora del registro, inicio = 30 min antes).

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
| 11 Migración v4 / huérfanas | | |
| 12 PDF integridad | | |
| 13 Salida N lecturas | | |
| 14 Tránsito encadenado | | |
| 15 Cancelar trayecto | | |
| 16 Idioma modales | | |
| 17 PIN admin | | |
| 18 Recordatorio almuerzo | | |
| 19 Dirección inversa | | |
| 20 Recordatorio diario vs almuerzo | | |
| 21 Salida segundo plano ~30 s | | |
| 22 App matada / salida pendiente | | |
| 23 i18n tarjeta + almuerzo real | | |
