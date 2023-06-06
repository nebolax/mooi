import { Backdrop, Box, Button, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import { useState } from "react";
import { apiExportResults, apiFetchAnalytics, apiValidateAdminPassword } from "./api";
import { AllAnalytics, BLUE_COLOR, QuestionCategoryRu, SummarizedTopicResult, getLanguageLevelName } from "./types";

export default function AdminPage() {
    const [adminPassword, setAdminPassword] = useState<string>('');
    const [isValidAdminPassword, setIsValidAdminPassword] = useState<boolean>(false);
    const [passwordValidationErrorMessage, setPasswordValidationErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [analytics, setAnalytics] = useState<AllAnalytics | null>(null);
    const exportResults = () => {
        setIsLoading(true);
        apiExportResults(adminPassword).then((wasSuccessful) => {
            setIsLoading(false);
            if (wasSuccessful) alert('Результаты экспортированы в google drive папку');
            else alert('Ошибка экспорта результатов. Попробуйте снова или обратитесь к разработчикам');
        })
    }
    const validateAdminPAssword = () => {
        apiValidateAdminPassword(adminPassword).then((isValid) => {
            if (!isValid) setPasswordValidationErrorMessage('Неверный пароль');
            else {
                setIsValidAdminPassword(true);
                setIsLoading(true);
                // Now query analytics
                apiFetchAnalytics(adminPassword).then((analytics) => {
                    setIsLoading(false);
                    setAnalytics(analytics);
                })
            }
        })
    }
    const inputAdminPassword: JSX.Element = (
        <Box>
            <TextField
                label="Пароль администратора"
                type="password"
                onChange={(e) => setAdminPassword(e.target.value)}
                sx={{ display: "block", marginBottom: "20px" }}
            />
            {passwordValidationErrorMessage !== null && <p
                style={{ color: BLUE_COLOR }}
            >
                {passwordValidationErrorMessage}
            </p>}
            <Button variant="contained" onClick={() => validateAdminPAssword()}>Войти</Button>
        </Box>
    );
    const adminPanelControls: JSX.Element = (
        <Box>
            <Button disabled={isLoading} variant="contained" onClick={() => exportResults()}>Экспортировать результаты</Button>
            {
                analytics !== null &&
                <Box>
                    <h3>Прогресс в прохождении теста:</h3>
                    <Box>
                        <p>Открыли страницу теста, но не начали проходить: {analytics.stagesAnalytics.openedThePagePercentage}%</p>
                        <p>Начали проходить тест, но не закончили: {analytics.stagesAnalytics.startedTheTestPercentage}%</p>
                        <p>Прошли тест: {analytics.stagesAnalytics.finishedTheTestPercentage}%</p>
                    </Box>

                    <h3>Успеваемость по темам:</h3>
                    <Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ paddingLeft: 0, fontWeight: "bold" }}>Тема</TableCell>
                                        <TableCell sx={{ paddingLeft: 0, fontWeight: "bold", minWidth: "120px" }}>Успеваемость</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {analytics.topicsSuccess.map((topicResult) => {
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

                    <h3>Распределение выбора стартового уровня:</h3>
                    <Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ paddingLeft: 0, fontWeight: "bold" }}>Уровень</TableCell>
                                        <TableCell sx={{ paddingLeft: 0, fontWeight: "bold", minWidth: "120px" }}>Доля</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {analytics.startLevelSelectionDistribution.map((startLevelEntry) => {
                                        return (
                                            <TableRow>
                                                <TableCell sx={{ paddingLeft: 0 }}>{startLevelEntry.level === 'A0' ? 'Не знаю' : startLevelEntry.level.replaceAll('_', '.')}</TableCell>
                                                <TableCell sx={{ paddingLeft: 0 }}>{startLevelEntry.count}%</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Box>
            }
        </Box>
    );
    return (
        <Box display="flex" flexDirection="column" alignItems="center">
            <Box
                width={{ mobile: "100%", desktop: "40%" }}
                display="inline-block"
            >
                <Backdrop open={isLoading}>
                    <CircularProgress />
                </Backdrop>
                <h1>Админ панель</h1>
                {isValidAdminPassword ? adminPanelControls : inputAdminPassword}
            </Box>
        </Box>
    );
}