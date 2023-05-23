
from enum import auto
import enum
from typing import Any, NamedTuple, Optional


class QuestionCategory(enum.Enum):
    GRAMMAR = 'grammar'
    VOCABULARY = 'vocabulary'
    READING = 'reading'
    LISTENING = 'listening'


class LanguageLevel(enum.Enum):
    A_0 = auto()
    A1_1 = auto()
    A1_2 = auto()
    A2_1 = auto()
    A2_2 = auto()
    B1_1 = auto()
    B1_2 = auto()
    B1_3 = auto()
    B2_1 = auto()
    B2_2 = auto()

    def __gt__(self, other: 'LanguageLevel') -> bool:
        if not isinstance(other, LanguageLevel):
            raise TypeError(f"'>' not supported between instances of '{type(self)}' and '{type(other)}'")
        return self.value > other.value
    
    def __add__(self, other: int) -> 'LanguageLevel':
        if not isinstance(other, int):
            raise TypeError(f"unsupported operand type(s) for +: '{type(self)}' and '{type(other)}'")
        return LanguageLevel(self.value + other)

    def __sub__(self, other: int) -> 'LanguageLevel':
        if not isinstance(other, int):
            raise TypeError(f"unsupported operand type(s) for -: '{type(self)}' and '{type(other)}'")
        return LanguageLevel(self.value - other)


MIN_LANGUAGE_LEVEL = LanguageLevel.A1_1
MAX_LANGUAGE_LEVEL = LanguageLevel.A2_1


class AnswerType(enum.Enum):
    SELECT_ONE = 'select_one'
    SELECT_MULTIPLE = 'select_multiple'
    FILL_THE_BLANK = 'fill_the_blank'


REQUIRED_SUCCESS_PERCENTAGE = 70


class QuestionCountEntry(NamedTuple):
    category: QuestionCategory
    answer_type: AnswerType
    topic_title: str
    questions_count: int


class PassedLevelStats(NamedTuple):
    level: LanguageLevel
    success_percentage: int

    def has_passed(self) -> bool:
        return self.success_percentage >= REQUIRED_SUCCESS_PERCENTAGE


class TopicSuccessData(NamedTuple):
    category: QuestionCategory
    topic_title: str
    questions_count: int
    correct_answers_count: int

    def to_json(self) -> dict[str, Any]:
        return {
            'category': self.category.value,
            'topic_title': self.topic_title,
            'questions_count': self.questions_count,
            'correct_answers_count': self.correct_answers_count,
        }


class SummarizedStats(NamedTuple):
    detected_level: LanguageLevel
    total_questions: int
    total_correct_answers: int
    per_topic_breakdown: list[TopicSuccessData]

    def to_json(self) -> dict[str, Any]:
        return {
            'detected_level': self.detected_level.value,
            'total_questions': self.total_questions,
            'total_correct_answers': self.total_correct_answers,
            'per_topic_breakdown': [topic.to_json() for topic in self.per_topic_breakdown],
        }


class PassedStep(NamedTuple):
    question_title: str
    language_level: LanguageLevel
    answer_type: AnswerType
    answer_options: str
    filepath: Optional[str]
    correct_answer: str
    given_answer: str

    def to_json(self) -> dict[str, Any]:
        media_type = 'none'
        if self.filepath is not None:
            if self.filepath.endswith('.txt'):
                media_type = 'text'
            elif self.filepath.endswith('.mp3'):
                media_type = 'audio'
        return {
            'question_title': self.question_title,
            'language_level': self.language_level.value,
            'answer_type': self.answer_type.value,
            'answer_options': self.answer_options,
            'correct_answer': self.correct_answer,
            'media_type': media_type,
            'filepath': self.filepath,
            'given_answer': self.given_answer,
        }
