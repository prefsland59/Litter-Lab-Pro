export const colors = {
  light: {
    background: '#F0F6FA', // very light blue-gray
    surface: '#FFFFFF',
    primary: '#7EC8E3', // baby blue
    accent: '#4A90D9', // medium blue for buttons/CTAs
    text: '#2C3E50', // dark blue-gray
    textSecondary: '#6B8299',
    border: '#D6E4EF',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
  dark: {
    background: '#1C2833', // dark blue-gray
    surface: '#243447',
    primary: '#7EC8E3',
    accent: '#4A90D9',
    text: '#ECF0F1', // off-white
    textSecondary: '#94A3B8',
    border: '#334155',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
};

export type AppColors = typeof colors.light;
