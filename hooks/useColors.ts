import colors from '@/constants/colors';

/**
 * AuraFit is a dark-mode-first app.
 * Always returns the dark palette regardless of system appearance.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
