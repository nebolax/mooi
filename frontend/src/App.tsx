import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import MainPage from './MainPage';
import SummarizedResultsPage from './SummarizedResultsPage';
import DetailedResultsPage from './DetailedResultsPage';


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
        main: '#b03434',
      },
      secondary: {
        main: '#28b5b0',
      },
    }, breakpoints: {
      values: {
        mobile: 0,
        desktop: 1024,
      },
    },
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
