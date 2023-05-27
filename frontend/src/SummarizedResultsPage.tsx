import { Backdrop, Box, Button, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LanguageLevel, QuestionCategory, QuestionCategoryRu, SERVER_ADDRESS, SummarizedResultsData, getLanguageLevelName } from "./types";

export default function SummarizedResultsPage() {
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
  
  