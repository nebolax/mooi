import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionComponent from "./QuestionComponent";
import { Backdrop, Box, CircularProgress } from "@mui/material";
import StartPage from "./StartPage";
import { LanguageLevel, QuestionProps } from "./types";
import { apiFetchStatus, apiNextStep, apiStartTheTest } from "./api";

export default function MainPage() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<QuestionProps | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  useEffect(() => {
    console.log('REQUEST')
    apiFetchStatus(nextStepCallback).then((data) => {
      if (data.status == 'FINISHED') navigate('/results/' + data.userUUID, { replace: true });
      else if (data.status == 'IN_PROGRESS') setCurrentQuestion(data.question)
      else if (data.status == 'NOT_STARTED') setCurrentQuestion(null)
      setIsLoading(false);
    })
  }, []);

  const nextStepCallback = (answer: string) => {
    setIsLoading(true);
    apiNextStep(answer, nextStepCallback).then((data) => {
      if (data.finished) navigate('/results/' + data.userUUID, { replace: true });
      else setCurrentQuestion(data.question)
      setIsLoading(false);
    })
  }

  const doStart = (name: string, email: string, startLevelName: string) => {
    setIsLoading(true);
    if (LanguageLevel[startLevelName as keyof typeof LanguageLevel] === LanguageLevel.A_0) {
      startLevelName = 'A1_1';
    }
    console.log(name, email, startLevelName);
    apiStartTheTest(name, email, startLevelName, nextStepCallback).then(question => {
      setCurrentQuestion(question)
      setIsLoading(false);
    })
  }
  let questionComponent: JSX.Element | null = null;
  if (currentQuestion !== null) {
    questionComponent = <QuestionComponent {...currentQuestion} />
  }
  return (
    <Box>
      <Backdrop open={isLoading}>
        <CircularProgress />
      </Backdrop>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Box
          width={{ mobile: "100%", desktop: "40%" }}
          display="inline-block"
        >
          {currentQuestion === null ? isLoading ? null : <StartPage startCallback={doStart} /> : questionComponent}
        </Box>
      </Box>
    </Box>
  );
}
