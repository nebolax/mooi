from random import random
from unittest.mock import patch
from flask import Flask, Response
from flask.testing import FlaskClient
import pytest
import json

from backend import AnswerType, LanguageLevel, PassedLevelStats, ProgressStep, Question, QuestionCategory, QuestionCountEntry, User, create_app, db_session, generate_questions_batch, get_passed_levels_stats, get_questions_counts


TEST_QUESTIONS_A1_1 = [
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
        id=5,
        level=LanguageLevel.A1_1,
        category=QuestionCategory.VOCABULARY,
        topic_title='Medicine',
        question_title='When you are sick, you should ...',
        filepath=None,
        answer_type=AnswerType.SELECT_MULTIPLE,
        answer_options=json.dumps(['take medicine', 'take a medicine', 'take medicines']),
        correct_answer='1',
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

TEST_QUESTIONS_A1_2 = [
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
        answer_type=AnswerType.FILL_THE_BLANK,
        answer_options=json.dumps(['will', 'shall', 'going to']),
        correct_answer='1',
    ), Question(
        id=9,
        level=LanguageLevel.A1_2,
        category=QuestionCategory.LISTENING,
        topic_title='Future Simple',
        question_title='Listen to the audio and choose the correct answer.',
        filepath='audiofile-1.mp3',
        answer_type=AnswerType.FILL_THE_BLANK,
        answer_options=json.dumps(['is', 'are', 'am']),
        correct_answer='0',
    ), 
]

TEST_QUESTION_COUNTS = [
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

TEST_USERS = [
    User(
        id=10,
        email='some-email@example.com',
        full_name='Georgiy Vasilyev',
        start_level=LanguageLevel.A1_1,
    ),
]

TEST_PROGRESS_STEPS_A1_1 = [
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

TEST_PROGRESS_STEPS_A1_2 = [
    ProgressStep(
        user_id=10,
        step_number=4,
        question_id=7,
        answer='1',
    ), ProgressStep(
        user_id=10,
        step_number=5,
        question_id=9,
        answer='0',
    ),
]



@pytest.fixture()
def client():
    app = create_app(db_name='mooi_test_db')
    with app.app_context():
        db_session.add_all(TEST_QUESTIONS_A1_1)
        db_session.add_all(TEST_USERS)
        db_session.commit()
    app.testing = True
    return app.test_client()


def test_questions_count(client: FlaskClient):
    with client.application.app_context():
        counts = get_questions_counts(level=LanguageLevel.A1_1)
    expected_counts = TEST_QUESTION_COUNTS
    assert counts == expected_counts


def test_generate_questions_batch(client: FlaskClient):
    with client.application.test_request_context():
        generate_questions_batch(
            question_counts=TEST_QUESTION_COUNTS,
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
    for step_number, counts_entry in enumerate(TEST_QUESTION_COUNTS, start=5):
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
        db_session.add_all(TEST_QUESTIONS_A1_2)
        db_session.add_all(TEST_PROGRESS_STEPS_A1_1)
        db_session.add_all(TEST_PROGRESS_STEPS_A1_2)
        stats = get_passed_levels_stats(user_id=10)

    expected_stats = [
        PassedLevelStats(
            level=LanguageLevel.A1_1,
            success_percentage=75,
        ), PassedLevelStats(
            level=LanguageLevel.A1_2,
            success_percentage=50,
        ),
    ]
    assert stats == expected_stats


def test_index(app: FlaskClient):
    response: Response = app.get('/')
    assert response.status_code == 200
    with open('frontend/build/index.html', 'r') as file:
        assert file.read() == response.data.decode('utf-8')


def test_flow(client: FlaskClient):
    """Tests the whole flow of passing a language test"""
    # Create a new user
    response = client.post(
        '/api/start',
        json={
            'email': 'test@example.com',
            'full_name': 'Test User',
            'start_level': 'A1_2',
        },
    )
    assert response.status_code == 200
    with client.session_transaction() as session:
        assert session['user_id'] == 1

    # Get the first question
    response = client.get('/api/next-step')
