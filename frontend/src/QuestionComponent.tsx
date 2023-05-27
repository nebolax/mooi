import { Box, Button, Checkbox, FormControlLabel, FormGroup, Radio, RadioGroup, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { ANSWER_BORDER_RADIUS, AnswerType, BLUE_COLOR, BLUE_COLOR_TRANSPARENT, BURGUNDY_COLOR, BURGUNDY_COLOR_TRANSPARENT, MediaType, QuestionProps, SERVER_ADDRESS } from "./types";
import { apiFetchText } from "./api";

export default function QuestionComponent(props: QuestionProps) {
    const theme = useTheme();
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
            apiFetchText(props.filepath!!).then(text => setTextBlockContent(text))
        }
    })
    if (props.mediaType === MediaType.AUDIO) {
        mediablock = (
            <audio controls>
                <source src={SERVER_ADDRESS + '/media/' + props.filepath!!} type="audio/mpeg" />
                Your browser does not support the audio element.
            </audio>
        );
    } else if (props.mediaType == MediaType.TEXT) {
        mediablock = (
            <pre style={{ whiteSpace: "pre-wrap" }}>
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
                            sx={{
                                backgroundColor: props.resultProps === null ? "none" : correctSingleAnswer === index ? BLUE_COLOR_TRANSPARENT : singleAnswer === index ? BURGUNDY_COLOR_TRANSPARENT : "none",
                                borderRadius: ANSWER_BORDER_RADIUS,
                            }}
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
                                backgroundColor: props.resultProps === null ? "none" : correctMultipleAnswer.includes(index) ? BLUE_COLOR_TRANSPARENT : multipleAnswer.includes(index) ? BURGUNDY_COLOR_TRANSPARENT : "none",
                                marginBottom: "10px",
                                borderRadius: ANSWER_BORDER_RADIUS,
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
                style={{ backgroundColor: props.resultProps === null ? "none" : fillTheBlankAnswer === correctFillTheBlankAnswer ? BLUE_COLOR_TRANSPARENT : BURGUNDY_COLOR_TRANSPARENT }}
            />
        );
        const correctAnswerField: JSX.Element = (
            <input
                type="text"
                size={Math.max(correctFillTheBlankAnswer.length - 5, 1)}
                value={correctFillTheBlankAnswer}
                disabled={true}
                style={{ backgroundColor: BLUE_COLOR_TRANSPARENT }}
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
