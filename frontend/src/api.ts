import { AnswerType, DetailedResultsData, LanguageLevel, MediaType, PostAnswerResponse, QuestionCategory, QuestionProps, SERVER_ADDRESS, StatusResponse, SummarizedResultsData } from "./types";


class BadServerResponse extends Error {}


async function basicRequest(path: string, options: RequestInit | undefined = undefined, returnType: 'JSON' | 'TEXT' = 'JSON', failNonOk: boolean = false): Promise<any> {
    const fullUrl = SERVER_ADDRESS + path;
    const response = await fetch(fullUrl, options);
    if (failNonOk && !response.ok) {
        throw new BadServerResponse();
    }
    if (returnType === 'TEXT') {
        return await response.text();
    } else {
        return await response.json();
    }
}

export async function apiFetchDetailedResults(userUUID: string): Promise<DetailedResultsData> {
    const data = await basicRequest('/results/' + userUUID + '/detailed')
    const questionsData = data.map((questionData: any, index: number) => {
        return {
            title: questionData.question_title,
            answerType: questionData.answer_type as AnswerType,
            serializedAnswerOptions: questionData.answer_options,
            filepath: questionData.filepath === null ? null : questionData.filepath,
            mediaType: questionData.media_type as MediaType,
            inProgressProps: null,
            resultProps: {
                correctAnswer: questionData.correct_answer,
                givenAnswer: questionData.given_answer,
                index: index,
            },
        }
    })
    return { questionsData: questionsData };
}

export async function apiFetchStatus(nextStepCallback: (answer: string) => void): Promise<StatusResponse> {
    const data = await basicRequest('/status', { credentials: 'include' });
    let userUUID: string | null = null;
    let question: QuestionProps | null = null;
    if (data.status === 'FINISHED') {
        userUUID = data.user_uuid;
    } else if (data.status === 'IN_PROGRESS') {
        const questionData = data.question;
        question = {
            title: questionData.question_title,
            answerType: questionData.answer_type as AnswerType,
            serializedAnswerOptions: questionData.answer_options,
            filepath: SERVER_ADDRESS + '/media/' + questionData.filepath,
            mediaType: questionData.media_type as MediaType,
            inProgressProps: { nextStepCallback: nextStepCallback },
            resultProps: null,
        }
        return { status: 'IN_PROGRESS', userUUID: null, question: question };
    } else {
        // NOT_STARTED. Don't need to do anything
    }
    return { status: data.status, userUUID: userUUID, question: question };
}

export async function apiNextStep(answer: string, nextStepCallback: (answer: string) => void): Promise<PostAnswerResponse> {
    const data = await basicRequest('/next-step', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ answer: answer })
    })
    let userUUID: string | null = null;
    let question: QuestionProps | null = null;
    if (data.finished) {
        userUUID = data.user_uuid;
    } else {
        question = {
            title: data.question_title,
            answerType: data.answer_type as AnswerType,
            serializedAnswerOptions: data.answer_options,
            filepath: data.filepath,
            mediaType: data.media_type as MediaType,
            inProgressProps: { nextStepCallback: nextStepCallback },
            resultProps: null,
        }
    }
    return { finished: data.finished, userUUID: userUUID, question: question };
}

export async function apiStartTheTest(name: string, email: string, startLevelName: string, nextStepCallback: (answer: string) => void): Promise<QuestionProps> {
    // Should always be successful
    const data = await basicRequest('/start', {
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
    })
    return {
        title: data.question_title,
        answerType: data.answer_type as AnswerType,
        serializedAnswerOptions: data.answer_options,
        filepath: data.filepath,
        mediaType: data.media_type as MediaType,
        inProgressProps: { nextStepCallback: nextStepCallback },
        resultProps: null,
    }
}

export async function apiFetchText(filepath: string): Promise<string> {
    return await basicRequest('/media/' + filepath, undefined, 'TEXT');
}

export async function apiFetchSummarizedResults(userUUID: string): Promise<SummarizedResultsData> {
    const data = await basicRequest('/results/' + userUUID + '/summarized');
    return {
        detectedLevel: data.detected_level as LanguageLevel,
        perTopicBreakdown: data.per_topic_breakdown.map((topicResult: any) => {
            return {
                category: topicResult.category as QuestionCategory,
                topicTitle: topicResult.topic_title,
                correctAnswersCount: topicResult.correct_answers_count,
                questionsCount: topicResult.questions_count,
            }
        })
    }
}

export async function apiValidateAdminPassword(password: string): Promise<boolean> {
    try {
        await basicRequest('/admin/validate-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                admin_password: password,
            })
        }, 'TEXT', true);
    } catch (e) {
        return false;
    }
    return true;
}

export async function apiExportResults(password: string): Promise<boolean> {
    try {
        await basicRequest('/admin/export-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                admin_password: password,
            })
        }, 'TEXT', true);
    } catch (e) {
        return false;
    }
    return true;
}
