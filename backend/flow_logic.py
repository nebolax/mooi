from backend.types import (
    MAX_LANGUAGE_LEVEL,
    MIN_LANGUAGE_LEVEL,
    LanguageLevel,
    PassedLevelStats,
    PassedStep,
    QuestionCountEntry,
    SummarizedStats,
    TopicSuccessData,
)
from typing import Iterable, Optional
from sqlalchemy import func
import sqlalchemy
import random
from backend.models import ProgressStep, Question, db_session
from backend.logs import logger
from flask import session as flask_session


def get_questions_counts(level: LanguageLevel) -> Iterable[QuestionCountEntry]:
    questions_query = db_session.query(
        Question.category,
        Question.answer_type,
        Question.topic_title,
        func.count(Question.id)
    ).filter(
        Question.level == level,
    ).group_by(
        Question.category,
        Question.answer_type,
        Question.topic_title,
    )
    result = []
    for category, answer_type, topic_title, questions_count in questions_query:
        result.append(QuestionCountEntry(category, answer_type, topic_title, questions_count))

    return result


def generate_progress_steps_batch(
        question_counts: list[QuestionCountEntry],
        user_id: int,
        current_step_number: int,
        level: LanguageLevel,
) -> None:
    for step_number, entry in enumerate(question_counts, start=current_step_number+1):
        group_question_index = random.randint(0, entry.questions_count-1)
        question_id = db_session.query(Question.id).filter(
            Question.level == level,
            Question.category == entry.category,
            Question.answer_type == entry.answer_type,
            Question.topic_title == entry.topic_title,
        ).order_by(Question.id).offset(group_question_index).first()[0]
        if question_id is None:
            logger.critical(f"Failed to find question for {entry}. User: {user_id}. Level: {level}.")
            return
        db_session.add(ProgressStep(
            user_id=user_id,
            step_number=step_number,
            question_id=question_id,
        ))
    db_session.commit()
    flask_session['next_level_step_number'] = current_step_number + len(question_counts)


def has_answered_pending_questions(user_id: int) -> bool:
    return db_session.query(ProgressStep).filter(
        ProgressStep.user_id == user_id,
        ProgressStep.answer.is_(None),
    ).count() == 0


def get_passed_levels_stats(user_id: int) -> list[PassedLevelStats]:
    correct_answers_sum = func.sum(sqlalchemy.case(*[(ProgressStep.answer == Question.correct_answer, 1)], else_=0))
    total_answers_num = func.count(ProgressStep.question_id)
    stats_query = db_session.query(
        Question.level,
        func.round(correct_answers_sum / total_answers_num * 100),
        # func.min(ProgressStep.step_number).label('level_min_step_number'),
    ).join(ProgressStep).filter(
        ProgressStep.user_id == user_id,
    ).group_by(Question.level).order_by(func.min(ProgressStep.step_number))

    result = []
    for level, success_percentage in stats_query:
        result.append(PassedLevelStats(level, int(success_percentage)))

    return result


def process_stats(stats: list[PassedLevelStats]) -> tuple[Optional[LanguageLevel], Optional[LanguageLevel]]:
    next_level: Optional[LanguageLevel] = None
    finished_with_level: Optional[LanguageLevel] = None
    if len(stats) == 0:
        return None, None
    if len(stats) >= 2 and stats[-1].has_passed() != stats[-2].has_passed():
        if stats[-1].level > stats[-2].level:
            finished_with_level = stats[-2].level  # stats[-1] was failed and stats[-2] was passed
        else:
            finished_with_level = stats[-1].level  # stats[-1] was passed and stats[-2] was failed 
    elif stats[-1].has_passed():
        if stats[-1].level == MAX_LANGUAGE_LEVEL:
            finished_with_level = MAX_LANGUAGE_LEVEL
        else:
            next_level = LanguageLevel(stats[-1].level + 1)
    else:
        if stats[-1].level == MIN_LANGUAGE_LEVEL:
            finished_with_level = LanguageLevel.A_0
        else:
            next_level = stats[-1].level - 1

    return finished_with_level, next_level



def compute_summarized_stats(user_id: int) -> Optional[SummarizedStats]:
    """Compute per-topic results as well as total number of questions and correct answers."""
    correct_answers_sum = func.sum(sqlalchemy.case(*[(ProgressStep.answer == Question.correct_answer, 1)], else_=0))
    total_answers_num = func.count(ProgressStep.question_id)
    per_topic_query = db_session.query(
        Question.category,
        Question.topic_title,
        total_answers_num,
        correct_answers_sum,
    ).join(ProgressStep).filter(
        ProgressStep.user_id == user_id,
    ).group_by(Question.category, Question.topic_title)

    per_topic_breakdown = []
    total_questions = 0
    total_correct_answers = 0
    for category, topic_title, questions_count, correct_answers_count in per_topic_query:
        per_topic_breakdown.append(TopicSuccessData(
            category=category,
            topic_title=topic_title,
            questions_count=int(questions_count),
            correct_answers_count=int(correct_answers_count),
        ))
        total_questions += int(questions_count)
        total_correct_answers += int(correct_answers_count)

    if has_answered_pending_questions(user_id) is False:
        return None
    finished_level, _ = process_stats(get_passed_levels_stats(user_id))
    if finished_level is None:
        return None

    return SummarizedStats(
        detected_level=finished_level,
        total_questions=total_questions,
        total_correct_answers=total_correct_answers,
        per_topic_breakdown=per_topic_breakdown,
    )


def compute_detailed_stats(user_id: int) -> list[PassedStep]:
    """Get all steps passed by the user, with the answers and expected correct answers."""
    passed_steps_query = db_session.query(
        Question.question_title,
        Question.level,
        Question.answer_type,
        Question.answer_options,
        Question.filepath,
        Question.correct_answer,
        ProgressStep.answer,
    ).join(Question).filter(
        ProgressStep.user_id == user_id,
    ).order_by(ProgressStep.step_number)

    passed_steps = []
    for (
        question_title,
        level,
        answer_type,
        answer_options,
        filepath,
        correct_answer,
        given_answer,
    ) in passed_steps_query:
        passed_steps.append(PassedStep(
            question_title=question_title,
            language_level=level,
            answer_type=answer_type,
            answer_options=answer_options,
            filepath=filepath,
            correct_answer=correct_answer,
            given_answer=given_answer,
        ))

    return passed_steps
