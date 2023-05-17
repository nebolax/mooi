import datetime
from http import HTTPStatus
from pkgutil import extend_path
import random
from typing import Any, Iterable, Literal, NamedTuple, Optional
from typing_extensions import Annotated
import uuid
from flask import Blueprint, Flask, Response, jsonify, request, send_from_directory, session as flask_session, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.session import Session as SqlAlchemySession
from dotenv import load_dotenv
import os
import enum
from enum import auto
from marshmallow import Schema, ValidationError, fields
from flask_session import Session  # type: ignore[import]  # has not type stubs
import sqlalchemy

from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import ForeignKey, MetaData, String, func
from sqlalchemy.orm import scoped_session
from flask_cors import CORS

load_dotenv()

# Setup logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
# Set file handler
file_handler = logging.FileHandler('logs.log')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)
# Set stdout handler
stdout_handler = logging.StreamHandler()
stdout_handler.setLevel(logging.DEBUG)
stdout_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(stdout_handler)


IntegerPrimaryKey = Annotated[int, mapped_column(primary_key=True)]

db = SQLAlchemy()
dbModel: Any = db.Model  # doing this to avoid db.Model not defined error
db_session: scoped_session[SqlAlchemySession] = db.session

REQUIRED_SUCCESS_PERCENTAGE = 70

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


class User(dbModel):
    # DB meta-properties
    id: Mapped[IntegerPrimaryKey]
    uuid: Mapped[str] = mapped_column(String(200), default=lambda: str(uuid.uuid4()))
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # User information
    email: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str] = mapped_column(String(200))

    # Progress in the test
    start_level: Mapped['LanguageLevel']


class ProgressStep(dbModel):
    user_id: Mapped[IntegerPrimaryKey] = mapped_column(ForeignKey('user.id'))
    user: Mapped['User'] = relationship()
    step_number: Mapped[IntegerPrimaryKey]
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    question_id: Mapped[int] = mapped_column(ForeignKey('question.id'))
    question: Mapped['Question'] = relationship()
    answer: Mapped[Optional[str]] = mapped_column(String(200))


api_blueprint = Blueprint('api', __name__, url_prefix='/api')


class StartSchema(Schema):
    email = fields.Email(required=True)
    full_name = fields.String(required=True, validate=lambda s: len(s) > 4)
    start_level = fields.Enum(LanguageLevel, required=True)


class QuestionCountEntry(NamedTuple):
    category: QuestionCategory
    answer_type: AnswerType
    topic_title: str
    questions_count: int


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


class PassedLevelStats(NamedTuple):
    level: LanguageLevel
    success_percentage: int

    def has_passed(self) -> bool:
        return self.success_percentage >= REQUIRED_SUCCESS_PERCENTAGE


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


@api_blueprint.route('/start', methods=['POST'])
def start():
    """Saves contact data of a new user. Sets the user's identifier cookie."""
    try:
        data = StartSchema().load(request.json)
    except ValidationError as e:
        return jsonify(e.messages), 400
    user = User(
        email=data['email'],
        full_name=data['full_name'],
        start_level=data['start_level'],
    )
    db_session.add(user)
    db_session.commit()
    flask_session['user_id'] = user.id
    flask_session['current_step_number'] = 0
    flask_session.modified = True
    return 'OK'


class NextStepSchema(Schema):
    answer = fields.String(load_default=None)


def process_stats(stats: list[PassedLevelStats]) -> tuple[Optional[LanguageLevel], Optional[LanguageLevel]]:
    next_level: Optional[LanguageLevel] = None
    finished_with_level: Optional[LanguageLevel] = None
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

    assert (finished_with_level is None and next_level is not None) or \
              (finished_with_level is not None and next_level is None), 'Exactly one of the values must be set'
    return finished_with_level, next_level


@api_blueprint.route('/next-step', methods=['POST'])
def next_step():
    """
    Accepts an answer, checks the user's progress and returns the next step for the user.

    If the user is still in the progress, returns the next question.
    If all required questions have been answered, returns a corresponding message.
    """
    logger.debug('Next step called')
    try:
        data = NextStepSchema().load(request.json)
    except ValidationError as e:
        return jsonify(e.messages), 400

    answer = data['answer']
    user_id = flask_session['user_id']
    current_step_number = flask_session['current_step_number']
    next_level_step_number = flask_session.get('next_level_step_number')

    if answer is None:
        if current_step_number != 0:
            return jsonify({'error': 'Answer can be missing only for the first question'}), 400

        user: User = db_session.query(User).filter(User.id == user_id).first()
        generate_progress_steps_batch(
            question_counts=get_questions_counts(user.start_level),
            user_id=user_id,
            current_step_number=0,
            level=user.start_level,
        )
    else:
        current_progress_step = db_session.query(ProgressStep).filter(
            ProgressStep.user_id == user_id,
            ProgressStep.step_number == current_step_number,
        ).first()
        current_progress_step.answer = answer  # Save the answer
        db_session.commit()

    if current_step_number == next_level_step_number:
        stats = get_passed_levels_stats(user_id)  # Always has at least one element
        finished_with_level, next_level = process_stats(stats)
        if finished_with_level is not None:
            flask_session.pop('current_step_number')
            flask_session.pop('next_level_step_number')
            user = db_session.query(User).filter(User.id == user_id).first()
            db_session.commit()
            return jsonify({'user_uuid': user.uuid, 'finished': True})
        else:  # next_level is not None
            generate_progress_steps_batch(
                question_counts=get_questions_counts(next_level),
                user_id=user_id,
                current_step_number=current_step_number,
                level=next_level,
            )

    # breakpoint()
    current_step_number += 1
    flask_session['current_step_number'] = current_step_number
    # Get new question
    next_question = db_session.query(Question).join(ProgressStep).filter(
        ProgressStep.user_id == user_id,
        ProgressStep.step_number == current_step_number,
    ).first()
    return jsonify(next_question.to_json())


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
            'correct_answer': self.correct_answer,
        }


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
    for question_title, level, answer_type, answer_options, filepath, correct_answer, given_answer in passed_steps_query:
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


@api_blueprint.route('/results/<user_uuid>/summarized', methods=['GET'])
def results_summarized(user_uuid):
    """
    Returns the results of the test for the user with the given identifier.

    If the user is still in progress, returns an error.
    """
    # Check that the user with the given id exists
    user = db_session.query(User).filter(User.uuid == user_uuid).first()
    if user is None:
        return 'User not found', 404

    stats = compute_summarized_stats(user.id)
    if stats is None:
        return 'User is still in progress', 400

    return jsonify(stats.to_json())


@api_blueprint.route('/results/<user_uuid>/detailed', methods=['GET'])
def results_detailed(user_uuid):
    """
    Returns the results of the test for the user with the given identifier.

    If the user is still in the progress, returns an error.
    """
    # Check that the user with the given id exists
    user = db_session.query(User).filter(User.uuid == user_uuid).first()
    if user is None:
        return 'User not found', 404

    # Check that the user has finished the test
    if has_answered_pending_questions(user.id) is False:
        return 'User is still in progress', 400
    finished_level, _ = process_stats(get_passed_levels_stats(user.id))
    if finished_level is None:
        return 'User is still in progress', 400

    passed_steps = compute_detailed_stats(user.id)
    return jsonify([step.to_json() for step in passed_steps])


@api_blueprint.route('/status', methods=['GET'])
def status():
    if 'user_id' not in flask_session:
        return jsonify({'status': 'NOT_STARTED'})

    user_id = flask_session['user_id']
    user = db_session.query(User).filter(User.id == user_id).first()
    answered_pending = has_answered_pending_questions(user_id)
    if answered_pending is True:
        finished_with_level, _ = process_stats(get_passed_levels_stats(user_id))
        if finished_with_level is not None:
            return jsonify({'status': 'FINISHED', 'user_uuid': user.uuid})

    if 'current_step_number' not in flask_session:
        return jsonify({'status': 'NOT_STARTED'})

    breakpoint()
    current_step_number = flask_session['current_step_number']
    next_question = db_session.query(Question).join(ProgressStep).filter(
        ProgressStep.user_id == user_id,
        ProgressStep.step_number == current_step_number,
    ).first()
    return jsonify({'status': 'IN_PROGRESS', 'question': next_question.to_json()})


@api_blueprint.route('/media/<path:path>', methods=['GET'])
def send_file(path):
    return send_from_directory('media', path)


def create_app(db_name = 'mooi_develop_db'):
    app = Flask(__name__)
    app.secret_key = os.environ["SECRET_KEY"]
    app.config["SQLALCHEMY_DATABASE_URI"] = f'{os.environ["DATABASE_URI"]}/{db_name}'
    app.config["SESSION_TYPE"] = "sqlalchemy"
    app.config['SESSION_SQLALCHEMY'] = db
    app.config['SESSION_PERMANENT'] = True
    db.init_app(app)
    Session(app)
    CORS(app, supports_credentials=True)
    # with app.app_context():
    #     metadata = MetaData()
    #     metadata.reflect(bind=db.engine)
    #     metadata.drop_all(bind=db.engine)
    #     db.create_all()  # Happens after Session() initialization in order to create the sessions table

    @app.route('/')
    def index():
        return app.send_static_file('index.html')
    
    @app.route('/static/<path:path>')
    def send_static_file(path):
        return send_from_directory('../frontend/build', path)

    app.register_blueprint(api_blueprint)
    return app

if __name__ == '__main__':
    app = create_app()
