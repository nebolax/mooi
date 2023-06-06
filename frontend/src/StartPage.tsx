import { Box, Button, FormControlLabel, FormGroup, FormLabel, Radio, RadioGroup, TextField } from "@mui/material";
import { useState } from "react";
import { LanguageLevel, StartPageProps, emailRegexp as EMAIL_REGEXP } from "./types";


export default function StartPage(props: StartPageProps) {
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [startLevelName, setStartLevelName] = useState<string>('');
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
                onChange={(event) => setStartLevelName(event.target.value)}
            >
                {
                    Object.entries(LanguageLevel).map(
                        ([key, value]) => {
                            if (typeof key === 'string' && typeof value == 'string') return null;
                            return <FormControlLabel
                                key={key}
                                value={key}
                                disabled={(value as LanguageLevel) > LanguageLevel.A2_1}
                                control={<Radio />}
                                label={value === LanguageLevel.A0 ? 'Не знаю' : key.replaceAll('_', '.')}
                            />
                        }
                    )
                }
            </RadioGroup>
            <Button
                variant="contained"
                sx={{ float: "right" }}
                disabled={startLevelName === '' || name === '' || email === ''}
                onClick={() => {
                    if (EMAIL_REGEXP.test(email) === false) {
                        alert('Некорректный email');
                        return;
                    }
                    props.startCallback(name, email, startLevelName)
                }}
            >
                Начать тест
            </Button>
            {/* </Box> */}
        </Box>
    );
}
