import datetime
from http import HTTPStatus
from pkgutil import extend_path
import random
from typing import Iterable, Literal, NamedTuple, Optional
from typing_extensions import Annotated
from flask import Blueprint, Flask, Response, jsonify, request, session as flask_session, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.session import Session as SqlAlchemySession
from dotenv import load_dotenv
import os
import enum
from marshmallow import Schema, ValidationError, fields
from flask_session import Session
import sqlalchemy

from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import ForeignKey, MetaData, String, func
from sqlalchemy.orm import scoped_session


load_dotenv()

IntegerPrimaryKey = Annotated[int, mapped_column(primary_key=True)]

db = SQLAlchemy()
db_session: scoped_session[SqlAlchemySession] = db.session

REQUIRED_SUCCESS_PERCENTAGE = 70

class QuestionCategory(enum.Enum):
    GRAMMAR = 'grammar'
    VOCABULARY = 'vocabulary'
    READING = 'reading'
    LISTENING = 'listening'


class LanguageLevel(enum.Enum):
    A1_1 = 0
    A1_2 = 1
    A2_1 = 2
    A2_2 = 3
    B1_1 = 4
    B1_2 = 5
    B1_3 = 6
    B2_1 = 7
    B2_2 = 8

MIN_LANGUAGE_LEVEL = LanguageLevel(min([level.value for level in LanguageLevel]))
MAX_LANGUAGE_LEVEL = LanguageLevel(max([level.value for level in LanguageLevel]))


class AnswerType(enum.Enum):
    SELECT_ONE = 'select_one'
    SELECT_MULTIPLE = 'select_multiple'
    FILL_THE_BLANK = 'fill_the_blank'


class Question(db.Model):
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
    answer_options: Mapped[str] = mapped_column(String(200))
    correct_answer: Mapped[str] = mapped_column(String(200))


class User(db.Model):
    # DB meta-properties
    id: Mapped[IntegerPrimaryKey]
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # User information
    email: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str] = mapped_column(String(200))

    # Progress in the test
    start_level: Mapped['LanguageLevel']
    finished: Mapped[bool] = mapped_column(default=False)


class ProgressStep(db.Model):
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


def generate_questions_batch(
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
    flask_session.clear()
    flask_session['user_id'] = user.id
    flask_session['current_step_number'] = 0
    return 'OK'


class NextStepSchema(Schema):
    answer = fields.String()


def process_stats(stats: list[PassedLevelStats]) -> tuple[None, LanguageLevel] | tuple[LanguageLevel, None]:
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
            next_level = LanguageLevel(stats[0].level + 1)
    else:
        if stats[-1].level == MIN_LANGUAGE_LEVEL:
            finished_with_level = MIN_LANGUAGE_LEVEL
        else:
            next_level = LanguageLevel(stats[0].level - 1)

    assert finished_with_level is None and next_level is not None or \
              finished_with_level is not None and next_level is None, 'Exactly one of the values must be set'
    return finished_with_level, next_level


@api_blueprint.route('/next-step', methods=['POST'])
def next_step():
    """
    Accepts an answer, checks the user's progress and returns the next step for the user.

    If the user is still in the progress, returns the next question.
    If all required questions have been answered, returns a corresponding message.
    """
    try:
        data = NextStepSchema().load(request.json)
    except ValidationError as e:
        return jsonify(e.messages), 400

    answer = data['answer']
    user_id = flask_session['user_id']
    current_step_number = flask_session['current_step_number']
    next_level_step_number = flask_session.get('next_level_step_number')

    if answer is not None:
        if current_step_number != 0 or next_level_step_number is not None:
            return 'Answer can be missing only for the first question', 400

        current_progress_step = db_session.query(ProgressStep).filter(
            ProgressStep.user_id == user_id,
            ProgressStep.step_number == current_step_number,
        ).first()
        current_progress_step.answer = answer  # Save the answer
        db_session.commit()

    if next_level_step_number is None:
        user = db_session.query(User).filter(User.id == user_id).first()
        generate_questions_batch(
            question_counts=get_questions_counts(user.start_level),
            user_id=user_id,
            current_step_number=0,
            level=user.start_level,
        )
    elif current_step_number == next_level_step_number:
        stats = get_passed_levels_stats(user_id)  # Always has at least one element
        finished_with_level, next_level = process_stats(stats)
        if finished_with_level is not None:
            flask_session.pop('current_step_number')
            flask_session.pop('next_level_step_number')
            db_session.commit()
            return Response(status=HTTPStatus.SEE_OTHER)
        else:  # next_level is not None
            generate_questions_batch(
                question_counts=get_questions_counts(next_level),
                user_id=user_id,
                current_step_number=current_step_number,
                level=next_level,
            )

    flask_session['current_step_number'] = current_step_number + 1
    # Get new question
    next_question = db_session.query(Question).join(ProgressStep).filter(
        ProgressStep.user_id == user_id,
        ProgressStep.step_number == current_step_number,
    ).first()
    return jsonify({
        'question_title': next_question.question_title,
        'answer_type': next_question.answer_type.name,
        'answer_options': next_question.answer_options,
    })


@api_blueprint.route('/results/<user_id>')
def results(user_id):
    """
    Returns the results of the test for the user with the given identifier.

    If the user is still in the progress, returns an error.
    """



def create_app(db_name = 'mooi_develop_db'):
    app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
    app.secret_key = os.environ["SECRET_KEY"]
    app.config["SQLALCHEMY_DATABASE_URI"] = f'{os.environ["DATABASE_URI"]}/{db_name}'
    app.config["SESSION_TYPE"] = "sqlalchemy"
    app.config['SESSION_SQLALCHEMY'] = db
    db.init_app(app)
    Session(app)
    with app.app_context():
        metadata = MetaData()
        metadata.reflect(bind=db.engine)
        metadata.drop_all(bind=db.engine)
        db.create_all()  # Happens after Session() initialization in order to create the sessions table

    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    app.register_blueprint(api_blueprint)

    return app

if __name__ == '__main__':
    app = create_app()
