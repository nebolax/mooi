import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import MainPage from './MainPage';
import SummarizedResultsPage from './SummarizedResultsPage';
import DetailedResultsPage from './DetailedResultsPage';
import { BLUE_COLOR, BURGUNDY_COLOR } from './types';


declare module '@mui/material/styles' {
  interface BreakpointOverrides {
    xs: false; // removes the `xs` breakpoint
    sm: false;
    md: false;
    lg: false;
    xl: false;
    mobile: true; // adds the `mobile` breakpoint
    desktop: true;
  }
}

const theme = createTheme(
  {
    palette: {
      primary: {
        main: BURGUNDY_COLOR,
      },
      secondary: {
        main: BLUE_COLOR,
      },
    }, breakpoints: {
      values: {
        mobile: 0,
        desktop: 1024,
      },
    }, typography: {
      fontFamily: 'Roboto',
    }
  }
);


function NotFoundPage() {
  return <h1>Страница не найдена</h1>
}


function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/results/:userUUID" element={<SummarizedResultsPage />} />
          <Route path="/results/:userUUID/detailed" element={<DetailedResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
