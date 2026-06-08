import { WithSpringConfig } from 'react-native-reanimated';

/**
 * Devuelve la configuración global de resortes para mantener una 
 * experiencia táctil e interactiva coherente en toda la aplicación.
 */
export const getSpringConfig = (): WithSpringConfig => ({
  damping: 20,
  stiffness: 90,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
});
