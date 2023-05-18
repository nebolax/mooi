import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import logo from './logo.svg';
import { Backdrop, Box, Button, Checkbox, CircularProgress, FormControlLabel, FormGroup, FormLabel, Paper, Radio, RadioGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useState } from 'react';


let SERVER_ADDRESS: string;
if (process.env.NODE_ENV === 'development') {
  SERVER_ADDRESS = 'http://localhost:5000/api';
} else {
  SERVER_ADDRESS = window.location.origin + '/api';
}


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

enum LanguageLevel {
  A_0 = 1,
  A1_1 = 2,
  A1_2 = 3,
  A2_1 = 4,
  A2_2 = 5,
  B1_1 = 6,
  B1_2 = 7,
  B1_3 = 8,
  B2_1 = 9,
  B2_2 = 10,
}

enum QuestionCategory {
  GRAMMAR = 'grammar',
  VOCABULARY = 'vocabulary',
  READING = 'reading',
  LISTENING = 'listening',
}

const QuestionCategoryRu = {
  [QuestionCategory.GRAMMAR]: 'Грамматика',
  [QuestionCategory.VOCABULARY]: 'Лексика',
  [QuestionCategory.READING]: 'Чтение',
  [QuestionCategory.LISTENING]: 'Аудирование',
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

function getLanguageLevelName(enumValue: number): string | undefined {
  const enumKey = Object.keys(LanguageLevel).find((key) => LanguageLevel[key as keyof typeof LanguageLevel] === enumValue);
  return (enumKey as string).replaceAll('_', '.');
}


interface InProgressQuestionProps {
  nextStepCallback: (answer: string) => void;
}

interface QuestionResultProps {
  givenAnswer: string;
  correctAnswer: string;
  nextStepCallback: () => void;
  previousStepCallback: () => void;
  nextStepAllowed: boolean;
  previousStepAllowed: boolean;
}


interface QuestionProps {
  title: string;
  answerType: AnswerType;
  serializedAnswerOptions: string | null;
  mediaType: MediaType;
  filepath: string | null;
  inProgressProps: InProgressQuestionProps | null;
  resultProps: QuestionResultProps | null;
}


const TEST_QUESTION_SELECT_ONE: QuestionProps = {
  title: 'Какой из этих городов не является столицей?',
  answerType: AnswerType.SELECT_ONE,
  serializedAnswerOptions: JSON.stringify(['Москва', 'Париж', 'Лондон', 'Берлин']),
  mediaType: MediaType.NONE,
  filepath: null,
  inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
  resultProps: null,
}


const TEST_QUESTION_SELECT_MULTIPLE: QuestionProps = {
  title: 'Почему вам нравится наша компания?',
  answerType: AnswerType.SELECT_MULTIPLE,
  serializedAnswerOptions: JSON.stringify(['Качественные товары', 'Низкие цены', 'Быстрая доставка', 'Хороший сервис']),
  mediaType: MediaType.NONE,
  filepath: null,
  inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
  resultProps: null,
}


const TEST_QUESTION_FILL_THE_BLANK: QuestionProps = {
  title: 'Ваш любимый язык программирования - <пропуск>. Надеемся, что у вас хорошее настроение. Хорошего дня!',
  answerType: AnswerType.FILL_THE_BLANK,
  serializedAnswerOptions: null,
  mediaType: MediaType.NONE,
  filepath: null,
  inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
  resultProps: null,
}


const TEST_QUESTION_AUDIO: QuestionProps = {
  title: 'Прослушайте аудио и выберите правильный ответ.',
  answerType: AnswerType.SELECT_ONE,
  serializedAnswerOptions: JSON.stringify(['Кювет', 'Кувшин', 'Кувейт']),
  mediaType: MediaType.AUDIO,
  filepath: 'barev-dzes.mp3',
  inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
  resultProps: null,
}


const TEST_QUESTION_TEXT: QuestionProps = {
  title: 'Прочитайте текст и выберите правильный ответ.',
  answerType: AnswerType.SELECT_ONE,
  serializedAnswerOptions: JSON.stringify(['Аккумулятор', 'Кружка', 'Сапоги']),
  mediaType: MediaType.TEXT,
  filepath: 'vek-volkodav.txt',
  inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
  resultProps: null,
}


const TEST_QUESTION_SELECT_MULTIPLE_RESULT: QuestionProps = {
  title: 'Почему вам нравится наша компания?',
  answerType: AnswerType.SELECT_MULTIPLE,
  serializedAnswerOptions: JSON.stringify(['Качественные товары', 'Низкие цены', 'Быстрая доставка', 'Хороший сервис']),
  mediaType: MediaType.NONE,
  filepath: null,
  inProgressProps: null,
  resultProps: {
    givenAnswer: '0,1',
    correctAnswer: '0,1,2',
    nextStepCallback: () => console.log('next step'),
    previousStepCallback: () => console.log('previous step'),
    nextStepAllowed: true,
    previousStepAllowed: false,
  },
}


const TEST_QUESTION_FILL_THE_BLANK_RESULT: QuestionProps = {
  title: 'Ваш любимый язык программирования - <пропуск>. Надеемся, что у вас хорошее настроение. Хорошего дня!',
  answerType: AnswerType.FILL_THE_BLANK,
  serializedAnswerOptions: null,
  mediaType: MediaType.NONE,
  filepath: null,
  inProgressProps: null,
  resultProps: {
    givenAnswer: 'Python',
    correctAnswer: 'JavaScript',
    nextStepCallback: () => console.log('next step'),
    previousStepCallback: () => console.log('previous step'),
    nextStepAllowed: true,
    previousStepAllowed: false,
  },
}


function QuestionComponent(props: QuestionProps) {
  let [singleAnswer, setSingleAnswer] = useState<number | null>(null);
  let [multipleAnswer, setMultipleAnswer] = useState<number[]>([]);
  let [fillTheBlankAnswer, setFillTheBlankAnswer] = useState<string>('');

  let [correctSingleAnswer, setCorrectSingleAnswer] = useState<number | null>(null);
  let [correctMultipleAnswer, setCorrectMultipleAnswer] = useState<number[]>([]);
  let [correctFillTheBlankAnswer, setCorrectFillTheBlankAnswer] = useState<string>('');

  const [textBlockContent, setTextBlockContent] = useState<string>('');
  let stringifiedAnswer: string | null;
  let titleBlock: JSX.Element | null = null;
  let answersBlock: JSX.Element | null = null;
  let mediablock: JSX.Element | null = null;
  if (props.resultProps !== null) {
    if (props.answerType === AnswerType.SELECT_ONE) {
      singleAnswer = parseInt(props.resultProps.givenAnswer);
      correctSingleAnswer = parseInt(props.resultProps.correctAnswer);
    } else if (props.answerType === AnswerType.SELECT_MULTIPLE) {
      multipleAnswer = props.resultProps.givenAnswer.split(',').map((answer) => parseInt(answer));
      correctMultipleAnswer = props.resultProps.correctAnswer.split(',').map((answer) => parseInt(answer));
    } else if (props.answerType === AnswerType.FILL_THE_BLANK) {
      fillTheBlankAnswer = props.resultProps.givenAnswer;
      correctFillTheBlankAnswer = props.resultProps.correctAnswer;
    }
  }
  console.log('props', props)
  useEffect(() => {
    if (props.mediaType == MediaType.TEXT) {
      fetch(props.filepath!!).then(response => response.text()).then(text => setTextBlockContent(text))
    }
  })
  if (props.mediaType === MediaType.AUDIO) {
    mediablock = (
      <audio controls>
        <source src={props.filepath!!} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    );
  } else if (props.mediaType == MediaType.TEXT) {
    mediablock = (
      <pre style={{whiteSpace: "pre-wrap"}}>
        {textBlockContent}
      </pre>
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
              sx={{ backgroundColor: correctSingleAnswer === index ? "lightgreen" : "none" }}
              disabled={props.resultProps !== null}
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
              sx={{
                backgroundColor: correctMultipleAnswer.includes(index) ? "lightgreen" : "none",
                marginBottom: "10px",
              }}
              control={<Checkbox
                disabled={props.resultProps !== null}
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
      props.title.slice(blankIndex + '<пропуск>'.length),
    ];
    const givenAnswerField: JSX.Element = (
      <input
        type="text"
        size={Math.max(fillTheBlankAnswer.length - 5, 1)}
        value={fillTheBlankAnswer}
        onChange={(event) => { setFillTheBlankAnswer(event.target.value) }}
        disabled={props.resultProps !== null}
        style={{ backgroundColor: props.resultProps === null ? "none" : fillTheBlankAnswer === correctFillTheBlankAnswer ? "lightgreen" : "pink" }}
      />
    );
    const correctAnswerField: JSX.Element = (
      <input
        type="text"
        size={Math.max(correctFillTheBlankAnswer.length - 5, 1)}
        value={correctFillTheBlankAnswer}
        disabled={true}
        style={{ backgroundColor: "lightgreen" }}
      />
    );
    titleBlock = <Box>
      <p>
        {titleParts[0]}
        {givenAnswerField}
        {props.resultProps !== null && props.resultProps.givenAnswer !== props.resultProps.correctAnswer && correctAnswerField}
        {titleParts[1]}
      </p>
      {mediablock}
    </Box>
  }
  const inProgressNavigation: JSX.Element | null = (props.inProgressProps &&
    <Button
      disabled={stringifiedAnswer === null}
      variant="contained"
      onClick={() => {
        const answer = stringifiedAnswer!!;
        setFillTheBlankAnswer('');
        setMultipleAnswer([]);
        setSingleAnswer(null);
        props.inProgressProps!!.nextStepCallback(answer)
      }}
      sx={{ float: "right" }}
    >
      Дальше
    </Button>
  );
  const resultsNavigation: JSX.Element | null = (props.resultProps &&
    <Box>
      <Button
        disabled={!props.resultProps!!.previousStepAllowed}
        variant="contained"
        onClick={() => { props.resultProps!!.previousStepCallback() }}
        sx={{ float: "left" }}
      >
        Назад
      </Button>
      <Button
        disabled={!props.resultProps!!.nextStepAllowed}
        variant="contained"
        onClick={() => { props.resultProps!!.nextStepCallback() }}
        sx={{ float: "right" }}
      >
        Вперед
      </Button>
    </Box>
  );
  return (
    // <Box display="flex" flexDirection="column" alignItems="center">
    <Box
    // sx={{ backgroundColor: "lightgreen" }}
    // width={{ mobile: "95%", desktop: "50%" }}
    // display="inline-block"
    >
      {titleBlock}
      {answersBlock}
      {inProgressNavigation}
      {resultsNavigation}
    </Box>
    // </Box>
  );
}


interface StartPageProps {
  startCallback: (name: string, email: string, startLevelName: string) => void;
}


function StartPage(props: StartPageProps) {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [startLevelName, setStartLevelSerialized] = useState<string>('');
  return (
    <Box
    // display="flex" flexDirection="column" alignItems="center"
    >
      {/* <Box
        // sx={{ backgroundColor: "lightgreen" }}
        width={{ mobile: "95%", desktop: "30%" }}
        display="inline-block"
      > */}
      <FormGroup>
        <TextField
          label="Ваше полное имя"
          variant="filled"
          required={true}
          sx={{ marginBottom: "20px" }}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="Ваш email"
          variant="filled"
          required={true}
          sx={{ marginBottom: "20px" }}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormGroup>
      <FormLabel id="level-selection-label" required={true}>Ваш текущий уровень</FormLabel>
      <RadioGroup
        aria-labelledby='level-selection-label'
        value={startLevelName}
        onChange={(event) => setStartLevelSerialized(event.target.value)}
      >
        {
          Object.entries(LanguageLevel).map(
            ([key, value]) => {
              if (typeof key === 'string' && typeof value == 'string') return null;
              return <FormControlLabel
                key={key}
                value={key}
                control={<Radio />}
                label={value === LanguageLevel.A_0 ? 'Не знаю' : key.replaceAll('_', '.')}
              />
            }
          )
        }
      </RadioGroup>
      <Button
        variant="contained"
        sx={{ float: "right" }}
        disabled={startLevelName === '' || name === '' || email === ''}
        onClick={() => props.startCallback(name, email, startLevelName)}
      >
        Начать тест
      </Button>
      {/* </Box> */}
    </Box>
  );
}


function MainPage() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<QuestionProps | null>(null);
  useEffect(() => {
    console.log('REQUEST')
    fetch(SERVER_ADDRESS + '/status', { credentials: 'include' }).then((response) => response.json()).then((data) => {
      if (data.status === 'FINISHED') {
        console.log('finished');
        navigate('/results/' + data.user_uuid, { replace: true });
        return;
      } else if (data.status === 'IN_PROGRESS') {
        const questionData = data.question;
        // console.log('aaaa', questionData.media_type as keyof typeof MediaType)
        setCurrentQuestion({
          title: questionData.question_title,
          answerType: questionData.answer_type as AnswerType,
          serializedAnswerOptions: questionData.answer_options,
          filepath: SERVER_ADDRESS + '/media/' + questionData.filepath,
          mediaType: questionData.media_type as MediaType,
          inProgressProps: { nextStepCallback: nextStepCallback },
          resultProps: null,
        })
      } else if (data.status === 'NOT_STARTED') {
        setCurrentQuestion(null);
      }
    });
  }, []);

  const nextStepCallback = (answer: string) => {
    fetch(
      SERVER_ADDRESS + '/next-step',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          answer: answer,
        })
      }
    ).then((response) => response.json()).then((data) => {
      if (data.finished) {
        console.log('finished');
        navigate('/results/' + data.user_uuid, { replace: true });
        return;
      }
      setCurrentQuestion({
        title: data.question_title,
        answerType: data.answer_type as AnswerType,
        serializedAnswerOptions: data.answer_options,
        filepath: SERVER_ADDRESS + '/media/' + data.filepath,
        mediaType: data.media_type as MediaType,
        inProgressProps: { nextStepCallback: nextStepCallback },
        resultProps: null,
      })
    })
  }

  const doStart = (name: string, email: string, startLevelName: string) => {
    if (LanguageLevel[startLevelName as keyof typeof LanguageLevel] === LanguageLevel.A_0) {
      startLevelName = 'A1_1';
    }
    console.log(name, email, startLevelName);
    fetch(
      SERVER_ADDRESS + '/start',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: name,
          email: email,
          start_level: startLevelName,
        })
      }
    ).then(() => {
      fetch(
        SERVER_ADDRESS + '/next-step',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({}),
        },
      ).then(
        (response) => response.json(),
      ).then((data) => {
        setCurrentQuestion({
          title: data.question_title,
          answerType: data.answer_type as AnswerType,
          serializedAnswerOptions: data.answer_options,
          filepath: SERVER_ADDRESS + '/media/' + data.filepath,
          mediaType: data.media_type as MediaType,
          inProgressProps: { nextStepCallback: nextStepCallback },
          resultProps: null,
        })
      })
    })
  }
  let questionComponent: JSX.Element | null = null;
  if (currentQuestion !== null) {
    questionComponent = <QuestionComponent {...currentQuestion} />
  }
  return (
    <Box>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Box
          width={{ mobile: "100%", desktop: "40%" }}
          display="inline-block"
        >
          {currentQuestion === null ? <StartPage startCallback={doStart} /> : questionComponent}
        </Box>
      </Box>
    </Box>
  );
}


interface SummarizedTopicResult {
  category: QuestionCategory;
  topicTitle: string;
  correctAnswersCount: number;
  questionsCount: number;
}

interface SummarizedResultsData {
  detectedLevel: LanguageLevel;
  perTopicBreakdown: SummarizedTopicResult[];
}

function SummarizedResultsPage() {
  const navigate = useNavigate();
  const { userUUID } = useParams();
  const [summarizedResults, setSummarizedResults] = useState<SummarizedResultsData | null>(null);
  useEffect(() => {
    fetch(SERVER_ADDRESS + '/results/' + userUUID + '/summarized').then((response) => response.json()).then((data) => {
      // console.log(data);
      setSummarizedResults({
        detectedLevel: data.detected_level as LanguageLevel,
        perTopicBreakdown: data.per_topic_breakdown.map((topicResult: any) => {
          return {
            category: topicResult.category as QuestionCategory,
            topicTitle: topicResult.topic_title,
            correctAnswersCount: topicResult.correct_answers_count,
            questionsCount: topicResult.questions_count,
          }
        })
      })
    })
  }, []);
  const loadingBlock: JSX.Element = (
    <Backdrop open={true}>
      <CircularProgress />
    </Backdrop>
  );
  if (summarizedResults === null) return loadingBlock;

  let recommendedLevelStr: string;
  if (summarizedResults.detectedLevel === LanguageLevel.B2_2) {
    recommendedLevelStr = 'Поздравляем! Вы отлично знаете голландский'
  } else {
    recommendedLevelStr = 'Рекомендуем вам пойти в группу ' + getLanguageLevelName(summarizedResults.detectedLevel + 1);
  }
  let yourLevelBlock: JSX.Element;
  if (summarizedResults.detectedLevel === LanguageLevel.A_0) {
    yourLevelBlock = <h3>Вы пока что совсем не знаете голландский</h3>
  } else {
    yourLevelBlock = <h3>Ваш уровень: {getLanguageLevelName(summarizedResults?.detectedLevel)}</h3>
  }
  const resultsBlock: JSX.Element = (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Box
        // sx={{ backgroundColor: "lightgreen" }}
        width={{ mobile: "95%", desktop: "50%" }}
        display="inline-block"
      >
        <Box sx={{
          // backgroundColor: "lightgreen",
          display: "flex",
          justifyContent: "space-between",
        }}>
          <Box component="h1" sx={{ fontSize: { mobile: "1.5em", desktop: "2em" } }}>Результаты</Box>
          <Box sx={{ display: "flex", justifyContent: "center", flexDirection: "column" }}>
            <Button
              variant="contained"
              sx={{ height: "40px" }}
              onClick={() => { navigate('/results/' + userUUID + '/detailed') }}
            >
              Подробнее
            </Button>
          </Box>
        </Box>
        {yourLevelBlock}
        <h3>{recommendedLevelStr}</h3>
        <h3>Результаты по темам:</h3>
        {/* Table with results */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ paddingLeft: 0, fontWeight: "bold" }}>Тема</TableCell>
                <TableCell sx={{ paddingLeft: 0, fontWeight: "bold" }}>Результат</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summarizedResults.perTopicBreakdown.map((topicResult) => {
                console.log(topicResult);
                return (
                  <TableRow>
                    <TableCell sx={{ paddingLeft: 0 }}>{QuestionCategoryRu[topicResult.category]}: {topicResult.topicTitle}</TableCell>
                    <TableCell sx={{ paddingLeft: 0 }}>{Math.round(topicResult.correctAnswersCount / topicResult.questionsCount * 100)}% ({topicResult.correctAnswersCount} / {topicResult.questionsCount})</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
  return resultsBlock;
}


interface DetailedResultsData {
  questionsData: QuestionProps[];
}


function DetailedResultsPage() {
  const navigate = useNavigate();
  const { userUUID } = useParams();
  const [detailedResults, setDetailedResults] = useState<DetailedResultsData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  useEffect(() => {
    fetch(SERVER_ADDRESS + '/results/' + userUUID + '/detailed').then((response) => response.json()).then((data) => {
      console.log(data);
      setDetailedResults({
        questionsData: data.map((questionData: any, index: number) => {
          return {
            title: questionData.question_title,
            answerType: questionData.answer_type as AnswerType,
            serializedAnswerOptions: questionData.answer_options,
            filepath: questionData.filepath === null ? null : SERVER_ADDRESS + '/media/' + questionData.filepath,
            mediaType: questionData.media_type as MediaType,
            inProgressProps: null,
            resultProps: {
              correctAnswer: questionData.correct_answer,
              givenAnswer: questionData.given_answer,
              nextStepAllowed: index !== data.length - 1,
              previousStepAllowed: index !== 0,
              nextStepCallback: () => { setCurrentQuestionIndex(index + 1) },
              previousStepCallback: () => { setCurrentQuestionIndex(index - 1) },
            },
          }
        })
      })
    })
  }, []);
  const resultsBlock: JSX.Element = (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Box
        // sx={{ backgroundColor: "lightgreen" }}
        width={{ mobile: "95%", desktop: "50%" }}
        display="inline-block"
      >
        <Box sx={{
          // backgroundColor: "lightgreen",
          display: "flex",
          justifyContent: "space-between",
        }}>
          <Box component="h1" sx={{ fontSize: { mobile: "1.5em", desktop: "2em" } }}>Результаты</Box>
          <Box sx={{ display: "flex", justifyContent: "center", flexDirection: "column" }}>
            <Button
              variant="contained"
              sx={{ height: "40px" }}
              onClick={() => { navigate('/results/' + userUUID) }}
            >
              По темам
            </Button>
          </Box>
        </Box>
        {detailedResults !== null && <QuestionComponent {...detailedResults?.questionsData[currentQuestionIndex]} />}
      </Box>
    </Box>
  );
  return resultsBlock;
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
          <Route path="/results/:userUUID" element={<SummarizedResultsPage />} />
          <Route path="/results/:userUUID/detailed" element={<DetailedResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
