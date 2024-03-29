import { Backdrop, Box, Button, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionComponent from "./QuestionComponent";
import { DetailedResultsData } from "./types";
import { apiFetchDetailedResults } from "./api";


export default function DetailedResultsPage() {
    const navigate = useNavigate();
    const { userUUID } = useParams();
    const [detailedResults, setDetailedResults] = useState<DetailedResultsData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    useEffect(() => {
        apiFetchDetailedResults(
            userUUID!!,
        ).then(detailedResults => {
            setDetailedResults(detailedResults)
            setIsLoading(false);
        });
    }, []);
    const loadingBlock: JSX.Element = (
        <Backdrop open={true}>
          <CircularProgress />
        </Backdrop>
      );
      if (detailedResults === null) return loadingBlock;
    const resultsBlock: JSX.Element = (
        <Box display="flex" flexDirection="column" alignItems="center">
            <Backdrop open={isLoading}>
                <CircularProgress />
            </Backdrop>
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
                            Назад
                        </Button>
                    </Box>
                </Box>
                {detailedResults !== null && detailedResults.questionsData.map((questionData, index) => (
                    <QuestionComponent {...questionData} key={index} />
                ))}
            </Box>
        </Box>
    );
    return resultsBlock;
}
