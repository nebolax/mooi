import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionComponent from "./QuestionComponent";
import { Box } from "@mui/material";
import StartPage from "./StartPage";
import { AnswerType, LanguageLevel, MediaType, QuestionProps, SERVER_ADDRESS } from "./types";

export default function MainPage() {
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
  