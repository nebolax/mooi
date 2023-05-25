from copy import deepcopy
from http import HTTPStatus
import importlib
from flask import Response
from flask.testing import FlaskClient
import pytest
import json

from sqlalchemy import MetaData, inspect
from backend import create_basic_app, initialize_app_modules
from backend import models, db
from backend.flow_logic import compute_detailed_stats, compute_summarized_stats, generate_progress_steps_batch, get_passed_levels_stats, get_questions_counts

from backend.models import ProgressStep, Question, User, db_session
from backend.types import AnswerType, LanguageLevel, PassedLevelStats, QuestionCategory, QuestionCountEntry, SummarizedStats, TopicSuccessData


make_test_questions_a1_1_one_per_group = lambda: [
    Question(
        id=1,
        level=LanguageLevel.A1_1,
        category=QuestionCategory.GRAMMAR,
        topic_title='Present Simple',
        question_title='What is the correct form of the verb?',
        filepath=None,
        answer_type=AnswerType.SELECT_ONE,
        answer_options=json.dumps(['am', 'is', 'are']),
        correct_answer='0',
    ), Question(
        id=3,
        level=LanguageLevel.A1_1,
        category=QuestionCategory.GRAMMAR,
        topic_title='Past Simple',
        question_title='How do you form the past simple?',
        filepath=None,
        answer_type=AnswerType.SELECT_ONE,
        answer_options=json.dumps(['add -ed', 'add -ing', 'add -s']),
        correct_answer='2',
    ), Question(
        id=4,
        level=LanguageLevel.A1_1,
        category=QuestionCategory.VOCABULARY,
        topic_title='Medicine',
        question_title='How to say "medicine" in English?',
        filepath=None,
        answer_type=AnswerType.SELECT_ONE,
        answer_options=json.dumps(['medicine', 'medicament', 'drug']),
        correct_answer='0',
    ), Question(
        id=6,
        level=LanguageLevel.A1_1,
        category=QuestionCategory.VOCABULARY,
        topic_title='Medicine',
        question_title='If you have a headache, you should ...',
        filepath=None,
        answer_type=AnswerType.SELECT_MULTIPLE,
        answer_options=json.dumps(['take medicine', 'take a medicine', 'take medicines', 'take a pill']),
        correct_answer='3',
    ),
]

TEST_QUESTIONS_A1_1_ONE_PER_GROUP_JSON = [question.to_json() for question in make_test_questions_a1_1_one_per_group()]

make_test_questions_a1_1_many_in_group = lambda: [
    Question(
        id=2,
        level=LanguageLevel.A1_1,
        category=QuestionCategory.GRAMMAR,
        topic_title='Present Simple',
        question_title='Noun is a ...',
        filepath=None,
        answer_type=AnswerType.SELECT_ONE,
        answer_options=json.dumps(['person', 'place', 'thing']),
        correct_answer='1',
    ), Question(
        id=5,
        level=LanguageLevel.A1_1,
        category=QuestionCategory.VOCABULARY,
        topic_title='Medicine',
        question_title='When you are sick, you should ...',
        filepath=None,
        answer_type=AnswerType.SELECT_MULTIPLE,
        answer_options=json.dumps(['take medicine', 'take a medicine', 'take medicines']),
        correct_answer='1',
    ),
]

make_test_questions_a1_2_one_per_group = lambda: [
    Question(
        id=7,
        level=LanguageLevel.A1_2,
        category=QuestionCategory.GRAMMAR,
        topic_title='Future Simple',
        question_title='What is the correct form of the verb?',
        filepath=None,
        answer_type=AnswerType.FILL_THE_BLANK,
        answer_options=json.dumps(['will', 'shall', 'going to']),
        correct_answer='2',
    ), Question(
        id=8,
        level=LanguageLevel.A1_2,
        category=QuestionCategory.GRAMMAR,
        topic_title='Future Simple',
        question_title='How do you form the future simple?',
        filepath=None,
        answer_type=AnswerType.SELECT_MULTIPLE,
        answer_options=json.dumps(['will', 'shall', 'going to']),
        correct_answer='12',
    ), Question(
        id=9,
        level=LanguageLevel.A1_2,
        category=QuestionCategory.LISTENING,
        topic_title='Future Simple',
        question_title='Listen to the audio and answer the question. Value is: <blank>?',
        filepath='audiofile-1.mp3',
        answer_type=AnswerType.FILL_THE_BLANK,
        answer_options=None,
        correct_answer='awesome',
    ), 
]

TEST_QUESTIONS_A1_2_ONE_PER_GROUP_JSON = [question.to_json() for question in make_test_questions_a1_2_one_per_group()]

make_test_question_counts = lambda: [
    QuestionCountEntry(
        category=QuestionCategory.GRAMMAR,
        answer_type=AnswerType.SELECT_ONE,
        topic_title='Present Simple',
        questions_count=2,
    ), QuestionCountEntry(
        category=QuestionCategory.GRAMMAR,
        answer_type=AnswerType.SELECT_ONE,
        topic_title='Past Simple',
        questions_count=1,
    ), QuestionCountEntry(
        category=QuestionCategory.VOCABULARY,
        answer_type=AnswerType.SELECT_ONE,
        topic_title='Medicine',
        questions_count=1,
    ), QuestionCountEntry(
        category=QuestionCategory.VOCABULARY,
        answer_type=AnswerType.SELECT_MULTIPLE,
        topic_title='Medicine',
        questions_count=2,
    ),
]

make_test_users = lambda: [
    User(
        id=10,
        email='some-email@example.com',
        full_name='Georgiy Vasilyev',
        start_level=LanguageLevel.A1_1,
    ),
]

make_test_progress_steps_a1_1 = lambda: [
    ProgressStep(
        user_id=10,
        step_number=0,
        question_id=1,
        answer='0',
    ), ProgressStep(
        user_id=10,
        step_number=1,
        question_id=3,
        answer='2',
    ), ProgressStep(
        user_id=10,
        step_number=2,
        question_id=4,
        answer='2',
    ), ProgressStep(
        user_id=10,
        step_number=3,
        question_id=6,
        answer='3',
    ),
]

make_test_progress_steps_a1_2 = lambda: [
    ProgressStep(
        user_id=10,
        step_number=4,
        question_id=7,
        answer='1',
    ), ProgressStep(
        user_id=10,
        step_number=5,
        question_id=8,
        answer='12',
    ), ProgressStep(
        user_id=10,
        step_number=6,
        question_id=9,
        answer='0',
    ),
]


@pytest.fixture()
def client():
    app = create_basic_app(db_name='mooi_test_db')
    with app.app_context():
        db.reflect()
        db.drop_all()
        # Have to clear metadata due to how `flask_session` works. When `Session` is initialized (which happens
        # in every call to `initialize_app_modules`), it creates a new Sessions table. And in order to not have
        # this table duplicated in metadata, we clear the metadata.
        if 'sessions' in db.metadata.tables:
            db.metadata._remove_table('sessions', db.metadata.schema)
        db.create_all()
    initialize_app_modules(app=app)
    app.testing = True
    client = app.test_client()
    yield client


def test_questions_count(client: FlaskClient):
    with client.application.app_context():
        db_session.add_all(make_test_questions_a1_1_one_per_group())
        db_session.add_all(make_test_questions_a1_1_many_in_group())
        counts = get_questions_counts(level=LanguageLevel.A1_1)
    assert counts == make_test_question_counts()


def test_generate_progress_steps_batch(client: FlaskClient):
    with client.application.test_request_context():
        db_session.add_all(make_test_questions_a1_1_one_per_group())
        db_session.add_all(make_test_questions_a1_1_many_in_group())
        db_session.add_all(make_test_users())
        generate_progress_steps_batch(
            question_counts=make_test_question_counts(),
            level=LanguageLevel.A1_1,
            user_id=10,
            current_step_number=4,
        )
        progress_steps = db_session.query(
            ProgressStep.user_id,
            ProgressStep.step_number,
            Question.category,
            Question.answer_type,
            Question.topic_title,
        ).join(Question).order_by(ProgressStep.step_number).all()

    expected_progress_steps = []
    for step_number, counts_entry in enumerate(make_test_question_counts(), start=5):
        expected_progress_steps.append((
            10,
            step_number,
            counts_entry.category,
            counts_entry.answer_type,
            counts_entry.topic_title,
        ))
    assert progress_steps == expected_progress_steps


def test_get_passed_levels_stats(client: FlaskClient):
    with client.application.app_context():
        db_session.add_all(make_test_questions_a1_1_one_per_group())
        db_session.add_all(make_test_questions_a1_2_one_per_group())
        db_session.add_all(make_test_progress_steps_a1_1())
        db_session.add_all(make_test_progress_steps_a1_2())
        db_session.add_all(make_test_users())
        stats = get_passed_levels_stats(user_id=10)

    expected_stats = [
        PassedLevelStats(
            level=LanguageLevel.A1_1,
            success_percentage=75,
        ), PassedLevelStats(
            level=LanguageLevel.A1_2,
            success_percentage=33,
        ),
    ]
    assert stats == expected_stats


def test_compute_summarized_stats(client: FlaskClient):
    with client.application.app_context():
        db_session.add_all(make_test_questions_a1_1_one_per_group())
        db_session.add_all(make_test_questions_a1_2_one_per_group())
        db_session.add_all(make_test_users())
        db_session.add_all(make_test_progress_steps_a1_1())
        db_session.add_all(make_test_progress_steps_a1_2())
        stats = compute_summarized_stats(user_id=10)

    expected_stats = SummarizedStats(
        per_topic_breakdown=[
            TopicSuccessData(
                category=QuestionCategory.GRAMMAR,
                topic_title='Present Simple',
                questions_count=1,
                correct_answers_count=1,
            ), TopicSuccessData(
                category=QuestionCategory.GRAMMAR,
                topic_title='Past Simple',
                questions_count=1,
                correct_answers_count=1,
            ), TopicSuccessData(
                category=QuestionCategory.VOCABULARY,
                topic_title='Medicine',
                questions_count=2,
                correct_answers_count=1,
            ), TopicSuccessData(
                category=QuestionCategory.GRAMMAR,
                topic_title='Future Simple',
                questions_count=2,
                correct_answers_count=1,
            ), TopicSuccessData(
                category=QuestionCategory.LISTENING,
                topic_title='Future Simple',
                questions_count=1,
                correct_answers_count=0,
            ),
        ],
        detected_level=LanguageLevel.A1_1,
        total_questions=7,
        total_correct_answers=4,
    )
    assert stats == expected_stats


def test_compute_detailed_stats(client: FlaskClient):
    with client.application.app_context():
        db_session.add_all(make_test_questions_a1_1_one_per_group())
        db_session.add_all(make_test_questions_a1_2_one_per_group())
        db_session.add_all(make_test_users())
        db_session.add_all(make_test_progress_steps_a1_1())
        db_session.add_all(make_test_progress_steps_a1_2())
        passed_steps = compute_detailed_stats(user_id=10)

    assert len(passed_steps) == len(make_test_progress_steps_a1_1()) + len(make_test_progress_steps_a1_2())


def test_index(client: FlaskClient):
    response: Response = client.get('/')
    assert response.status_code == 200
    with open('frontend/build/index.html', 'r') as file:
        assert file.read() == response.data.decode('utf-8')


def test_pass_the_test(client: FlaskClient):
    """Tests the flow of passing a language test"""
    test_questions_a1_1_one_per_group = make_test_questions_a1_1_one_per_group()
    test_questions_a1_2_one_per_group = make_test_questions_a1_2_one_per_group()
    with client.application.app_context():
        db_session.add_all(test_questions_a1_1_one_per_group)
        db_session.add_all(test_questions_a1_2_one_per_group)
        db_session.commit()
    # Create a new user
    response = client.post(
        '/api/start',
        json={
            'email': 'test@example.com',
            'full_name': 'Test User',
            'start_level': 'A1_1',
        },
    )
    assert response.status_code == 200
    with client.session_transaction() as session:
        assert session['user_id'] == 1

    # Get the first question
    response = client.post('/api/next-step', json={})
    with client.application.app_context():
        assert response.json == TEST_QUESTIONS_A1_1_ONE_PER_GROUP_JSON[0]
    with client.session_transaction() as session:
        assert session['current_step_number'] == 1
        assert session['next_level_step_number'] == len(test_questions_a1_1_one_per_group)

    response = client.post('/api/next-step', json={})
    assert response.json == {'error': 'Answer can be missing only for the first question'}
    with client.session_transaction() as session:  # Session data should have not changed
        assert session['current_step_number'] == 1

    response = client.post('/api/next-step', json={'answer': '0'})
    assert response.json == TEST_QUESTIONS_A1_1_ONE_PER_GROUP_JSON[1]
    with client.session_transaction() as session:
        assert session['current_step_number'] == 2

    response = client.post('/api/next-step', json={'answer': '2'})
    assert response.json == TEST_QUESTIONS_A1_1_ONE_PER_GROUP_JSON[2]
    with client.session_transaction() as session:
        assert session['current_step_number'] == 3
        assert session['next_level_step_number'] == len(test_questions_a1_1_one_per_group)  # Should still be the same
    
    response = client.post('/api/next-step', json={'answer': '0'})
    assert response.json == TEST_QUESTIONS_A1_1_ONE_PER_GROUP_JSON[3]
    with client.session_transaction() as session:
        assert session['current_step_number'] == 4
        assert session['next_level_step_number'] == len(test_questions_a1_1_one_per_group)  # Should still be the same

    response = client.post('/api/next-step', json={'answer': 'xyz'})
    assert response.json == TEST_QUESTIONS_A1_2_ONE_PER_GROUP_JSON[0]
    with client.session_transaction() as session:
        assert session['current_step_number'] == 5
        assert session['next_level_step_number'] == len(test_questions_a1_1_one_per_group) + len(test_questions_a1_2_one_per_group)

    response = client.post('/api/next-step', json={'answer': 'xyz'})
    assert response.json == TEST_QUESTIONS_A1_2_ONE_PER_GROUP_JSON[1]
    with client.session_transaction() as session:
        assert session['current_step_number'] == 6

    response = client.post('/api/next-step', json={'answer': 'xyz'})
    assert response.json == TEST_QUESTIONS_A1_2_ONE_PER_GROUP_JSON[2]
    with client.session_transaction() as session:
        assert session['current_step_number'] == 7

    response = client.post('/api/next-step', json={'answer': 'awesome'})
    assert response.status_code == HTTPStatus.OK
    assert response.json['finished'] == True
    assert 'user_uuid' in response.json

    # Check that the progress steps were generated correctly
    with client.application.app_context():
        progress_steps_count = db_session.query(ProgressStep).count()
        assert progress_steps_count == len(test_questions_a1_1_one_per_group) + len(test_questions_a1_2_one_per_group)
