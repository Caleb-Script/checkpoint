// /web/src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: { main: '#0a84ff' }, // iOS Blue
    secondary: { main: '#30d158' }, // iOS Green
    background: { default: '#f5f5f7', paper: '#ffffff' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: [
      '-apple-system',
      'system-ui',
      'BlinkMacSystemFont',
      'SF Pro Text',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 18 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 20 } } },
    MuiAppBar: { styleOverrides: { root: { backdropFilter: 'blur(10px)' } } },
  },
});

export default theme;
