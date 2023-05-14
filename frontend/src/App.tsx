import { BrowserRouter, Route, Routes } from 'react-router-dom';
import logo from './logo.svg';
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Radio, RadioGroup, TextField, ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useState } from 'react';


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


const TEST_QUESTION_SELECT_MULTIPLE: QuestionProps = {
  title: 'Почему вам нравится наша компания?',
  answerType: AnswerType.SELECT_MULTIPLE,
  serializedAnswerOptions: JSON.stringify(['Качественные товары', 'Низкие цены', 'Быстрая доставка', 'Хороший сервис']),
  mediaType: MediaType.NONE,
  filepath: null,
  nextStepCallback: (answer: string) => console.log('answer', answer),
}


const TEST_QUESTION_FILL_THE_BLANK: QuestionProps = {
  title: 'Ваш любимый язык программирования - <пропуск>. Надеемся, что у вас хорошее настроение. Хорошего дня!',
  answerType: AnswerType.FILL_THE_BLANK,
  serializedAnswerOptions: null,
  mediaType: MediaType.NONE,
  filepath: null,
  nextStepCallback: answer => console.log('answer', answer),
}


const TEST_QUESTION_AUDIO: QuestionProps = {
  title: 'Прослушайте аудио и выберите правильный ответ.',
  answerType: AnswerType.SELECT_ONE,
  serializedAnswerOptions: JSON.stringify(['Кювет', 'Кувшин', 'Кувейт', 'Кувейт']),
  mediaType: MediaType.AUDIO,
  filepath: 'http://localhost:5000/api/media/barev-dzes.mp3',
  nextStepCallback: answer => console.log('answer', answer),
}


const TEST_QUESTION_TEXT: QuestionProps = {
  title: 'Прочитайте текст и выберите правильный ответ.',
  answerType: AnswerType.SELECT_ONE,
  serializedAnswerOptions: JSON.stringify(['Аккумулятор', 'Кружка', 'Сапоги']),
  mediaType: MediaType.TEXT,
  filepath: 'http://localhost:5000/api/media/vek-volkodav.txt',
  nextStepCallback: answer => console.log('answer', answer),
}


function QuestionComponent(props: QuestionProps) {
  const [singleAnswer, setSingleAnswer] = useState<number | null>(null);
  const [multipleAnswer, setMultipleAnswer] = useState<number[]>([]);
  const [fillTheBlankAnswer, setFillTheBlankAnswer] = useState<string>('');
  const [textBlockContent, setTextBlockContent] = useState<string>('');
  let stringifiedAnswer: string | null;
  let titleBlock: JSX.Element | null = null;
  let answersBlock: JSX.Element | null = null;
  let mediablock: JSX.Element | null = null;
  useEffect(() => {
    if (props.mediaType == MediaType.TEXT) {
      fetch(props.filepath!!).then(response => response.text()).then(text => setTextBlockContent(text))
    }
  }, [])
  if (props.mediaType === MediaType.AUDIO) {
    mediablock = (
      <audio controls>
        <source src={props.filepath!!} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    );
  } else if (props.mediaType == MediaType.TEXT) {
    mediablock = (
      <pre>{textBlockContent}</pre>
    )
  }
  if (props.answerType === AnswerType.SELECT_ONE) {
    titleBlock = (
      <Box>
        <p>{props.title}</p>
        {mediablock}
      </Box>
    );
    const answerOptions = JSON.parse(props.serializedAnswerOptions!!);
    stringifiedAnswer = singleAnswer?.toString() ?? null;
    answersBlock = (
      <RadioGroup
        name="controlled-radio-buttons-group"
        value={singleAnswer}
        onChange={(event) => setSingleAnswer(parseInt(event.target.value))}
      >
        {
          answerOptions.map(
            (answerOption: string, index: number) => <FormControlLabel
              key={index}
              value={index}
              control={<Radio />}
              label={answerOption}
            />
          )
        }
      </RadioGroup>
    );
  } else if (props.answerType === AnswerType.SELECT_MULTIPLE) {
    titleBlock = <Box>
      <p>{props.title}</p>
      {mediablock}
    </Box>
    const answerOptions = JSON.parse(props.serializedAnswerOptions!!);
    stringifiedAnswer = multipleAnswer.length > 0 ? multipleAnswer.join(',') : null;
    answersBlock = (
      <FormGroup>
        {
          answerOptions.map(
            (answerOption: string, index: number) => <FormControlLabel
              key={index}
              value={index.toString()}
              control={<Checkbox
                checked={multipleAnswer.includes(index)}
                onChange={() => {
                  if (multipleAnswer.includes(index)) {
                    multipleAnswer.splice(multipleAnswer.indexOf(index), 1);
                  } else {
                    multipleAnswer.push(index);
                    multipleAnswer.sort((a, b) => a - b);
                  }
                  setMultipleAnswer([...multipleAnswer]);
                }}
              />}
              label={answerOption}
            />
          )
        }
      </FormGroup>
    );
  } else {  // AnswerType.FILL_THE_BLANK
    stringifiedAnswer = fillTheBlankAnswer === '' ? null : fillTheBlankAnswer;
    const blankIndex = props.title.indexOf('<пропуск>');
    const titleParts = [
      props.title.slice(0, blankIndex),
      props.title.slice(blankIndex + 3),
    ];
    titleBlock = <Box>
      <p>
        {titleParts[0]}
        <input
          type="text"
          size={Math.max(fillTheBlankAnswer.length, 1)}
          value={fillTheBlankAnswer}
          onChange={(event) => { setFillTheBlankAnswer(event.target.value) }}
        />
        {titleParts[1]}
      </p>
      {mediablock}
    </Box>
  }
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Box
        sx={{ backgroundColor: "lightgreen" }}
        width={{ mobile: "95%", desktop: "50%" }}
        display="inline-block"
      >
        {titleBlock}
        {answersBlock}
        <Button
          disabled={stringifiedAnswer === null}
          variant="contained"
          onClick={() => props.nextStepCallback(stringifiedAnswer!!)}
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
      <QuestionComponent {...TEST_QUESTION_TEXT} />
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
