import { AnswerType, MediaType, QuestionProps } from "./types"


export const TEST_QUESTION_SELECT_ONE: QuestionProps = {
    title: 'Какой из этих городов не является столицей?',
    answerType: AnswerType.SELECT_ONE,
    serializedAnswerOptions: JSON.stringify(['Москва', 'Париж', 'Лондон', 'Берлин']),
    mediaType: MediaType.NONE,
    filepath: null,
    inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
    resultProps: null,
}


export const TEST_QUESTION_SELECT_MULTIPLE: QuestionProps = {
    title: 'Почему вам нравится наша компания?',
    answerType: AnswerType.SELECT_MULTIPLE,
    serializedAnswerOptions: JSON.stringify(['Качественные товары', 'Низкие цены', 'Быстрая доставка', 'Хороший сервис']),
    mediaType: MediaType.NONE,
    filepath: null,
    inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
    resultProps: null,
}


export const TEST_QUESTION_FILL_THE_BLANK: QuestionProps = {
    title: 'Ваш любимый язык программирования - <пропуск>. Надеемся, что у вас хорошее настроение. Хорошего дня!',
    answerType: AnswerType.FILL_THE_BLANK,
    serializedAnswerOptions: null,
    mediaType: MediaType.NONE,
    filepath: null,
    inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
    resultProps: null,
}


export const TEST_QUESTION_AUDIO: QuestionProps = {
    title: 'Прослушайте аудио и выберите правильный ответ.',
    answerType: AnswerType.SELECT_ONE,
    serializedAnswerOptions: JSON.stringify(['Кювет', 'Кувшин', 'Кувейт']),
    mediaType: MediaType.AUDIO,
    filepath: 'barev-dzes.mp3',
    inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
    resultProps: null,
}


export const TEST_QUESTION_TEXT: QuestionProps = {
    title: 'Прочитайте текст и выберите правильный ответ.',
    answerType: AnswerType.SELECT_ONE,
    serializedAnswerOptions: JSON.stringify(['Аккумулятор', 'Кружка', 'Сапоги']),
    mediaType: MediaType.TEXT,
    filepath: 'vek-volkodav.txt',
    inProgressProps: { nextStepCallback: (answer: string) => console.log('answer', answer) },
    resultProps: null,
}


export const TEST_QUESTION_SELECT_MULTIPLE_RESULT: QuestionProps = {
    title: 'Почему вам нравится наша компания?',
    answerType: AnswerType.SELECT_MULTIPLE,
    serializedAnswerOptions: JSON.stringify(['Качественные товары', 'Низкие цены', 'Быстрая доставка', 'Хороший сервис']),
    mediaType: MediaType.NONE,
    filepath: null,
    inProgressProps: null,
    resultProps: {
        givenAnswer: '0,1',
        correctAnswer: '0,1,2',
        index: 1,
    },
}


export const TEST_QUESTION_FILL_THE_BLANK_RESULT: QuestionProps = {
    title: 'Ваш любимый язык программирования - <пропуск>. Надеемся, что у вас хорошее настроение. Хорошего дня!',
    answerType: AnswerType.FILL_THE_BLANK,
    serializedAnswerOptions: null,
    mediaType: MediaType.NONE,
    filepath: null,
    inProgressProps: null,
    resultProps: {
        givenAnswer: 'Python',
        correctAnswer: 'JavaScript',
        index: 3,
    },
}
