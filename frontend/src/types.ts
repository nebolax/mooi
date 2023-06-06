
export let SERVER_ADDRESS = window.location.origin + '/api';

export const emailRegexp = /^\S+@\S+\.\S+$/;

export const BURGUNDY_COLOR = '#b03434';
export const BLUE_COLOR = '#28b5b0';
export const BURGUNDY_COLOR_TRANSPARENT = '#b0343490';
export const BLUE_COLOR_TRANSPARENT = '#28b5b090';
export const ANSWER_BORDER_RADIUS = '6px';

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
    A0 = 1,
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
    index: number;
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

export interface StatusResponse {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
    userUUID: string | null;
    question: QuestionProps | null;
}

export interface PostAnswerResponse {
    finished: boolean;
    userUUID: string | null;
    question: QuestionProps | null;
}

export interface StagesAnalytics {
    openedThePagePercentage: number;
    startedTheTestPercentage: number;
    finishedTheTestPercentage: number;
}

export interface StartLevelCountEntry {
    level: string;
    count: number;
}


export interface AllAnalytics {
    stagesAnalytics: StagesAnalytics;
    startLevelSelectionDistribution: StartLevelCountEntry[];
    topicsSuccess: SummarizedTopicResult[];
}