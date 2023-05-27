
export let SERVER_ADDRESS: string;
if (process.env.NODE_ENV === 'development') {
    SERVER_ADDRESS = 'http://localhost:5000/api';
} else {
    SERVER_ADDRESS = window.location.origin + '/api';
}


export enum AnswerType {
    SELECT_ONE = 'select_one',
    SELECT_MULTIPLE = 'select_multiple',
    FILL_THE_BLANK = 'fill_the_blank',
}

export enum MediaType {
    TEXT = 'text',
    AUDIO = 'audio',
    NONE = 'none',
}

export enum LanguageLevel {
    A_0 = 1,
    A1_1 = 2,
    A1_2 = 3,
    A2_1 = 4,
    A2_2 = 5,
    B1_1 = 6,
    B1_2 = 7,
    B1_3 = 8,
    B2_1 = 9,
    B2_2 = 10,
}

export enum QuestionCategory {
    GRAMMAR = 'grammar',
    VOCABULARY = 'vocabulary',
    READING = 'reading',
    LISTENING = 'listening',
}

export const QuestionCategoryRu = {
    [QuestionCategory.GRAMMAR]: 'Грамматика',
    [QuestionCategory.VOCABULARY]: 'Лексика',
    [QuestionCategory.READING]: 'Чтение',
    [QuestionCategory.LISTENING]: 'Аудирование',
}


export function getLanguageLevelName(enumValue: number): string | undefined {
    const enumKey = Object.keys(LanguageLevel).find((key) => LanguageLevel[key as keyof typeof LanguageLevel] === enumValue);
    return (enumKey as string).replaceAll('_', '.');
}


export interface InProgressQuestionProps {
    nextStepCallback: (answer: string) => void;
}

export interface QuestionResultProps {
    givenAnswer: string;
    correctAnswer: string;
    nextStepCallback: () => void;
    previousStepCallback: () => void;
    nextStepAllowed: boolean;
    previousStepAllowed: boolean;
}


export interface QuestionProps {
    title: string;
    answerType: AnswerType;
    serializedAnswerOptions: string | null;
    mediaType: MediaType;
    filepath: string | null;
    inProgressProps: InProgressQuestionProps | null;
    resultProps: QuestionResultProps | null;
}


export interface SummarizedTopicResult {
    category: QuestionCategory;
    topicTitle: string;
    correctAnswersCount: number;
    questionsCount: number;
}

export interface SummarizedResultsData {
    detectedLevel: LanguageLevel;
    perTopicBreakdown: SummarizedTopicResult[];
}


export interface DetailedResultsData {
    questionsData: QuestionProps[];
}


export interface StartPageProps {
    startCallback: (name: string, email: string, startLevelName: string) => void;
}
