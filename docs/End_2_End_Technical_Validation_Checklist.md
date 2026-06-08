### Checklist de Validación Técnica End-to-End
#### ✅ 1. Ciclo de Vida y Rehidratación
 * [ ] **Arranque en Frío:** Inicia la app. La UI debe mostrar el *Hero Card* en NO_INICIADA (o en su estado respectivo si había algo guardado).
 * [ ] **Persistencia de Sesión Activa:** Inicia una jornada manual. Cierra la aplicación por completo (mata el proceso) y vuelve a abrirla. El motor debe disparar APP_BOOT_STARTED, leer SQLite y la UI debe reaccionar automáticamente mostrando la sesión como ACTIVA.
#### ✅ 2. Motor de Localización (Geocerca)
 * [ ] **Auto Check-in:** Simula entrar al radio del sitio. El sistema debe disparar SESSION_AUTO_CHECKIN_GPS, actualizando el tiempo de inicio sin interacción humana.
 * [ ] **Salida Detectada:** Simula salir del radio. El estado visual debe cambiar de ACTIVA a SALIDA_DETECTADA de forma inmediata.
 * [ ] **Auto Check-out (Failsafe):** Tras 15 minutos en estado de salida detectada, el background task debe despachar el evento que cierra la sesión de forma automática.
#### ✅ 3. Reglas de Negocio y Seguridad
 * [ ] **Edición Manual Protegida:** Intenta crear o editar una jornada que se traslape (*overlap*) con los horarios de una sesión anterior. El sistema debe rechazarlo, emitiendo un log de advertencia que la UI mostrará como un Toast ámbar sin que la app colapse.
 * [ ] **Acceso Administrativo:** Ve a Ajustes. Ingresa el PIN por defecto. Debe aparecer el estado VERIFICANDO... y luego desbloquear el panel. Si ingresas un PIN erróneo, debe mostrar el estado denegado.
 * [ ] **Persistencia de Settings:** Cambia el nombre del empleado o la tarifa por hora, guarda los cambios y reinicia la app. Los nuevos valores deben mantenerse.
#### ✅ 4. Reportes y Observabilidad
 * [ ] **Generación de Reporte:** Selecciona "Semana Actual" y pulsa compilar. El adaptador debe generar el PDF usando las horas extra calculadas *al vuelo* por los selectores, y mostrar la opción nativa de "Compartir" o "Enviar Email".
 * [ ] **Feedback Deduplicado:** Revisa la respuesta visual ante múltiples errores consecutivos. El *logger adapter* debe silenciar eventos de "background task" (sin mostrar Toasts molestos) y agrupar visualmente mensajes idénticos usando su dedupeKey.
### Criterio de Salida Cumplido
El motor central **WorkTrackerEngine** ha reemplazado operativamente a todos los scripts dispersos. La interfaz gráfica se ha convertido en una capa "tonta" pero hermosa, que reacciona a la perfección sin almacenar reglas de negocio, logrando un código limpio, predecible y listo para escalar a nivel empresarial.

