import { Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionComponent from "./QuestionComponent";
import { AnswerType, DetailedResultsData, MediaType, SERVER_ADDRESS } from "./types";


export default function DetailedResultsPage() {
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
