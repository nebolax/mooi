
import datetime
import json
from typing import Any, Optional
import uuid
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import scoped_session
from flask_sqlalchemy.session import Session as SqlAlchemySession
from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import ForeignKey, String
from typing_extensions import Annotated

from backend.types import AnswerType, LanguageLevel, QuestionCategory


db = SQLAlchemy()
dbModel: Any = db.Model  # doing this to avoid db.Model not defined error
db_session: scoped_session[SqlAlchemySession] = db.session
IntegerPrimaryKey = Annotated[int, mapped_column(primary_key=True)]


def hard_reset_db(app: Flask):
    with app.app_context():
        metadata = db.MetaData()
        metadata.reflect(bind=db.engine)
        metadata.drop_all(bind=db.engine)


class Question(dbModel):
    # Questions tree identification properties
    id: Mapped[IntegerPrimaryKey]
    # # Improve: make sure that group_index is unique for each level/category/topic,
    # # starts from 0 and is continuous (e.g. count(group_index) == max(group_index) + 1)
    # group_index: Mapped[int]
    level: Mapped['LanguageLevel']
    category: Mapped['QuestionCategory']
    topic_title: Mapped[str] = mapped_column(String(200))  # ignored for reading and listening

    # Question content
    question_title: Mapped[str] = mapped_column(String(200))
    filepath: Mapped[Optional[str]] = mapped_column(String(200))
    answer_type: Mapped['AnswerType']
    answer_options: Mapped[Optional[str]] = mapped_column(String(200))
    correct_answer: Mapped[str] = mapped_column(String(200))

    def to_json(self) -> dict[str, Any]:
        media_type = 'none'
        if self.category == QuestionCategory.READING:
            media_type = 'text'
        elif self.category == QuestionCategory.LISTENING:
            media_type = 'audio'
        return {
            'question_title': self.question_title,
            'answer_type': self.answer_type.value,
            'answer_options': self.answer_options,
            'filepath': self.filepath,
            'media_type': media_type,
        }

    def is_answer_correct(self, given_answer: str) -> bool:
        if self.answer_type in (AnswerType.SELECT_ONE, AnswerType.SELECT_MULTIPLE):
            return self.correct_answer == given_answer
        else:  # fill the blank
            loaded_correct_answers = json.loads(self.correct_answer)  # should be a list
            for correct_answer in loaded_correct_answers:
                if correct_answer.lower() == given_answer.lower():
                    return True
            return False


class UserAnalytics(dbModel):
    uuid: Mapped[str] = mapped_column(String(200), default=lambda: str(uuid.uuid4()), primary_key=True)
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)


class User(dbModel):
    # DB meta-properties
    id: Mapped[IntegerPrimaryKey]
    uuid: Mapped[str] = mapped_column(String(200))
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # User information
    email: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str] = mapped_column(String(200))

    # Progress in the test
    start_level: Mapped['LanguageLevel']
    choosed_dont_know_level: Mapped[bool]


class ProgressStep(dbModel):
    user_id: Mapped[IntegerPrimaryKey] = mapped_column(ForeignKey('user.id'))
    user: Mapped['User'] = relationship()
    step_number: Mapped[IntegerPrimaryKey]
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    question_id: Mapped[int] = mapped_column(ForeignKey('question.id'))
    question: Mapped['Question'] = relationship()
    answer: Mapped[Optional[str]] = mapped_column(String(200))
    is_correct: Mapped[Optional[bool]]  # Used to reduce the complexity of the queries when querying correct answers
