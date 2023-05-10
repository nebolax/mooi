import { BrowserRouter, Route, Routes } from 'react-router-dom';
import logo from './logo.svg';
import { Box, Button, FormControlLabel, Radio, RadioGroup, ThemeProvider, createTheme } from '@mui/material';
import { useState } from 'react';


enum AnswerType {
  SELECT_ONE = 'select_one',
  SELECT_MULTIPLE = 'select_multiple',
  FILL_THE_BLANK = 'fill_the_blank',
}

enum MediaType {
  TEXT = 'text',
  AUDIO = 'audio',
  NONE = 'none',
}


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


interface QuestionProps {
  title: string;
  answerType: AnswerType;
  serializedAnswerOptions: string | null;
  mediaType: MediaType;
  filepath: string | null;
  nextStepCallback: (answer: string) => void;
}


const TEST_QUESTION_SELECT_ONE: QuestionProps = {
  title: 'Какой из этих городов не является столицей?',
  answerType: AnswerType.SELECT_ONE,
  serializedAnswerOptions: JSON.stringify(['Москва', 'Париж', 'Лондон', 'Берлин']),
  mediaType: MediaType.NONE,
  filepath: null,
  nextStepCallback: (answer: string) => console.log('answer', answer),
}


function QuestionComponent(props: QuestionProps) {
  const [answer, setAnswer] = useState<string | null>(null);
  let answersBlock: JSX.Element | null = null;
  if (props.answerType === AnswerType.SELECT_ONE) {
    const answerOptions = JSON.parse(props.serializedAnswerOptions!!);
    answersBlock = (
      <RadioGroup
        name="controlled-radio-buttons-group"
        value={answer ?? ''}
        onChange={(event) => setAnswer(event.target.value)}
      >
        {
          answerOptions.map(
            (answerOption: string, index: number) => <FormControlLabel
              key={index}
              value={index.toString()}
              control={<Radio />}
              label={answerOption}
            />
          )
        }
      </RadioGroup>
    );
  }
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Box
        sx={{ backgroundColor: "lightgreen" }}
        width={{ mobile: "95%", desktop: "50%" }}
        display="inline-block"
      >
        {
          [AnswerType.SELECT_ONE, AnswerType.SELECT_MULTIPLE].includes(props.answerType) &&
          <p>{props.title}</p>
        }
        {answersBlock}
        <Button
          disabled={answer === null}
          variant="contained"
          onClick={() => props.nextStepCallback(answer!!)}
          sx={{ float: "right" }}
        >
          Дальше
        </Button>
      </Box>
    </Box>
  );
}


function MainPage() {
  return (
    <Box>
      {/* <Button>Click me</Button> */}
      <QuestionComponent {...TEST_QUESTION_SELECT_ONE} />
    </Box>
  );
}


function ResultsPage() {
  return <h1>Results page</h1>
}


function NotFoundPage() {
  return <h1>Страница не найдена</h1>
}


function App() {
  console.log('envvvvv', process.env.NODE_ENV, process.env.PUBLIC_URL, process.env.TZ)
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/results/:uuid" element={<ResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
