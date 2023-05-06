import datetime
from typing import Optional
from typing_extensions import Annotated
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import enum

from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import ForeignKey, MetaData, String

load_dotenv()


IntegerPrimaryKey = Annotated[int, mapped_column(primary_key=True)]

# create the extension
db = SQLAlchemy()
# create the app
app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ['DATABASE_URI']
db.init_app(app)

with app.app_context():
    metadata = MetaData()
    metadata.reflect(bind=db.engine)


class QuestionCategory(enum.Enum):
    GRAMMAR = 'grammar'
    VOCABULARY = 'vocabulary'
    READING = 'reading'
    LISTENING = 'listening'


class LanguageLevel(enum.Enum):
    A1_1 = 'A1.1'
    A1_2 = 'A1.2'
    A2_1 = 'A2.1'
    A2_2 = 'A2.2'
    B1_1 = 'B1.1'
    B1_2 = 'B1.2'
    B1_3 = 'B1.3'
    B2_1 = 'B2.1'
    B2_2 = 'B2.2'


class AnswerType(enum.Enum):
    SELECT_ONE = 'select_one'
    SELECT_MULTIPLE = 'select_multiple'
    FILL_THE_BLANK = 'fill_the_blank'


class Question(db.Model):
    # Question content
    id: Mapped[IntegerPrimaryKey]
    question_title: Mapped[str] = mapped_column(String(200))
    filepath: Mapped[Optional[str]] = mapped_column(String(200))
    correct_answer: Mapped[str] = mapped_column(String(200))
    answer_type: Mapped['AnswerType']
    answer_options: Mapped[Optional[str]] = mapped_column(String(200))

    # Questions tree identification properties
    topic_title: Mapped[str] = mapped_column(String(200))  # ignored for reading and listening
    level: Mapped['LanguageLevel']
    category: Mapped['QuestionCategory']


class User(db.Model):
    # DB meta-properties
    id: Mapped[IntegerPrimaryKey]
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    # User information
    email: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str] = mapped_column(String(200))

    # Progress in the test
    start_level: Mapped['LanguageLevel'] = relationship()
    detected_level: Mapped['LanguageLevel'] = relationship()


class ProgressStep(db.Model):
    user_id: Mapped[IntegerPrimaryKey] = mapped_column(ForeignKey('user.id'))
    step_number: Mapped[IntegerPrimaryKey]
    timestamp: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    user: Mapped['User'] = relationship()
    question: Mapped['Question'] = relationship()
    answer: Mapped[Optional[str]] = mapped_column(String(200))


with app.app_context():
    metadata.drop_all(bind=db.engine)
    db.create_all()


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/api/start')
def start():
    """Saves contact data of a new user. Sets the user's identifier cookie."""


@app.route('/api/next-step')
def next_step():
    """
    Accepts an answer, checks the user's progress and returns the next step for the user.

    If the user is still in the progress, returns the next question.
    If all required questions have been answered, returns a corresponding message.
    """


@app.route('/api/results/<user_id>')
def results(user_id):
    """
    Returns the results of the test for the user with the given identifier.

    If the user is still in the progress, returns an error.
    """
