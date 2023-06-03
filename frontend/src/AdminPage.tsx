import { Backdrop, Box, Button, CircularProgress, TextField } from "@mui/material";
import { useState } from "react";
import { apiExportResults, apiValidateAdminPassword } from "./api";
import { BLUE_COLOR } from "./types";

export default function AdminPage() {
    const [adminPassword, setAdminPassword] = useState<string>('');
    const [isValidAdminPassword, setIsValidAdminPassword] = useState<boolean>(false);
    const [passwordValidationErrorMessage, setPasswordValidationErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
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
            else setIsValidAdminPassword(true);
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