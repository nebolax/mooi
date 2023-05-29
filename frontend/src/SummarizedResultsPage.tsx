import { Backdrop, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LanguageLevel, QuestionCategory, QuestionCategoryRu, SERVER_ADDRESS, SummarizedResultsData, getLanguageLevelName } from "./types";
import { apiFetchSummarizedResults } from "./api";
import Cookies from 'js-cookie';

export default function SummarizedResultsPage() {
    const navigate = useNavigate();
    const theme = useTheme();
    const { userUUID } = useParams();
    const [summarizedResults, setSummarizedResults] = useState<SummarizedResultsData | null>(null);
    const [startOverDialogOpen, setStartOverDialogOpen] = useState<boolean>(false);
    const startOver = () => {
      Cookies.remove('session');
      navigate('/');
    }
    useEffect(() => {
      apiFetchSummarizedResults(userUUID!!).then((results) => setSummarizedResults(results));
    }, []);
    const loadingBlock: JSX.Element = (
      <Backdrop open={true}>
        <CircularProgress />
      </Backdrop>
    );
    if (summarizedResults === null) return loadingBlock;
  
    let recommendedLevelBlock: JSX.Element;
    if (summarizedResults.detectedLevel === LanguageLevel.B2_2) {
      recommendedLevelBlock = <p>Поздравляем! Вы отлично знаете голландский</p>
    } else {
      recommendedLevelBlock = <p>Рекомендуем вам записаться в группу <strong>{getLanguageLevelName(summarizedResults.detectedLevel + 1)}</strong></p>
    }
    let yourLevelBlock: JSX.Element;
    if (summarizedResults.detectedLevel === LanguageLevel.A_0) {
      yourLevelBlock = <p>Вы пока что совсем не знаете голландский</p>
    } else {
      yourLevelBlock = <p>Ваш ориентировочный уровень: <strong>{getLanguageLevelName(summarizedResults?.detectedLevel)}</strong></p>
    }
    const resultsBlock: JSX.Element = (
      <Box display="flex" flexDirection="column" alignItems="center">
        <Dialog open={startOverDialogOpen}>
          <DialogTitle>Внимание</DialogTitle>
          <DialogContent sx={{maxWidth: "500px"}}>
            <p>Сохраните ссылку если вы не хотите потерять доступ к текущим результатам</p>
            <a href={window.location.href}>{window.location.href}</a>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStartOverDialogOpen(false)}>Отмена</Button>
            <Button onClick={() => startOver()}>Продолжить</Button>
          </DialogActions>
        </Dialog>
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
                sx={{ height: "40px", marginBottom: "10px", fontSize: {desktop: "0.9em", mobile: "0.6em"} }}
                onClick={() => { navigate('/results/' + userUUID + '/detailed') }}
              >
                Посмотреть ответы
              </Button>
              <Button
                variant="contained"
                sx={{ height: "40px", fontSize: {desktop: "0.9em", mobile: "0.7em"} }}
                onClick={() => setStartOverDialogOpen(true)}
              >
                Пройти еще раз
              </Button>
            </Box>
          </Box>
          {yourLevelBlock}
          {recommendedLevelBlock}
          <p>Подробное описание групп доступно на <Link href="http://mooinederlands.ru/groepslessen" target="_blank">нашем сайте</Link></p>
          <p>Следите за актуальной информацией о школе в <Link href="https://www.instagram.com/mooi.nederlands" target="_blank">нашем instagram</Link></p>
          <h4>Результаты по темам:</h4>
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
  
  