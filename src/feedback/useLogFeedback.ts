import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useToast } from '../context/ToastContext';
import { useWorkTracker } from '../core/hooks/useWorkTracker';
import { selectPendingFeedback } from '../core/selectors';

/**
 * HOOK DE FEEDBACK REACTIVO (UX)
 * Actúa como puente entre la cola canónica de notificaciones del motor y el renderizador visual.
 * La UI ya no decide qué mostrar ni cuándo; solo procesa de forma autómata (FIFO)
 * las directivas de la capa de infraestructura/dominio.
 */
export const useLogFeedback = () => {
  const { showToast } = useToast();
  const { state, dispatch } = useWorkTracker();
  
  // Selector puro que observa la cola de retroalimentación en tiempo real
  const pendingFeedback = selectPendingFeedback(state);

  useEffect(() => {
    // Si la cola está vacía, no hay nada que procesar
    if (pendingFeedback.length === 0) {
      return;
    }

    // Procesamos estrictamente el elemento más antiguo de la cola (FIFO)
    const currentFeedback = pendingFeedback[0];

    // 1. Renderizado Visual según el contrato del payload
    if (currentFeedback.kind === 'toast') {
      // Mapeo estricto del tono canónico al tipo visual esperado por ToastContext
      const toastType = currentFeedback.tone === 'success' ? 'success' :
                        currentFeedback.tone === 'error' ? 'error' :
                        currentFeedback.tone === 'warning' ? 'warning' : 'info';
      
      showToast(currentFeedback.message, toastType);
    } 
    else if (currentFeedback.kind === 'dialog') {
      // Para diálogos bloqueantes usamos la API nativa para asegurar la interrupción visual
      Alert.alert(
        currentFeedback.title || 'Atención',
        currentFeedback.message,
        [
          { 
            text: 'OK', 
            style: currentFeedback.destructive ? 'destructive' : 'default' 
          }
        ]
      );
    }

    // 2. Extracción de la Cola (Desencolado formal)
    // Se avisa al motor que la intención visual ha sido consumida para que mute el estado.
    dispatch({
      type: 'FEEDBACK_DISMISSED',
      feedbackId: currentFeedback.id,
    });

  }, [pendingFeedback, showToast, dispatch]);
};
