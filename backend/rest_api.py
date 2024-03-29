
import os
import uuid
from flask import Blueprint, jsonify, request, send_from_directory, session as flask_session
from marshmallow import Schema, ValidationError, fields
from backend.admin import calculate_all_analytics, export_users_results_and_upload_to_google_drive
from backend.flow_logic import (
    compute_detailed_stats,
    compute_summarized_stats,
    generate_progress_steps_batch,
    get_passed_levels_stats,
    get_questions_counts,
    has_answered_pending_questions,
    process_stats,
)
from backend.logs import logger
from backend.models import ProgressStep, Question, User, UserAnalytics, db_session
from backend.types import LanguageLevel


main_blueprint = Blueprint('main', __name__, url_prefix='/')
api_blueprint = Blueprint('api', __name__, url_prefix='/api')

main_blueprint.register_blueprint(api_blueprint)

@main_blueprint.route('/')
@main_blueprint.route('/<path:path>')
def catch_all(path = None):
    if 'user_uuid' not in flask_session:
        analytics = UserAnalytics()
        db_session.add(analytics)
        db_session.commit()
        flask_session['user_uuid'] = analytics.uuid

    return send_from_directory('../frontend/build', 'index.html')


class StartSchema(Schema):
    email = fields.String(required=True)
    full_name = fields.String(required=True)
    start_level = fields.Enum(LanguageLevel, required=True)


class NextStepSchema(Schema):
    answer = fields.String(required=True)


@api_blueprint.route('/start', methods=['POST'])
def start():
    """Saves contact data of a new user. Sets the user's identifier cookie."""
    try:
        data = StartSchema().load(request.json)
    except ValidationError as e:
        return jsonify(e.messages), 400

    start_level = data['start_level']
    choosed_dont_know_level = False
    if start_level == LanguageLevel.A0:
        start_level = LanguageLevel.A1_1
        choosed_dont_know_level = True

    user_uuid = flask_session.get('user_uuid')
    if user_uuid is None:
        logger.error(f'User UUID for {data} is not set')  # Should always be set
        user_uuid = str(uuid.uuid4())

    user = User(
        uuid=user_uuid,
        email=data['email'],
        full_name=data['full_name'],
        start_level=start_level,
        choosed_dont_know_level=choosed_dont_know_level,
    )
    db_session.add(user)
    db_session.commit()
    flask_session['user_id'] = user.id
    flask_session['current_step_number'] = 1
    flask_session.modified = True

    generate_progress_steps_batch(
        question_counts=get_questions_counts(user.start_level),
        user_id=user.id,
        current_step_number=0,
        level=user.start_level,
    )
    # Get the first question
    next_question = db_session.query(Question).join(ProgressStep).filter(
        ProgressStep.user_id == user.id,
        ProgressStep.step_number == 1,
    ).first()
    return jsonify(next_question.to_json())


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

    current_progress_step = db_session.query(ProgressStep).filter(
        ProgressStep.user_id == user_id,
        ProgressStep.step_number == current_step_number,
    ).one()
    answered_question = db_session.query(Question).filter(
        Question.id == current_progress_step.question_id,
    ).one()
    current_progress_step.answer = answer  # Save the answer
    current_progress_step.is_correct = answered_question.is_answer_correct(answer)
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

    current_step_number += 1
    flask_session['current_step_number'] = current_step_number
    # Get new question
    next_question = db_session.query(Question).join(ProgressStep).filter(
        ProgressStep.user_id == user_id,
        ProgressStep.step_number == current_step_number,
    ).first()
    return jsonify(next_question.to_json())


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

    current_step_number = flask_session['current_step_number']
    next_question = db_session.query(Question).join(ProgressStep).filter(
        ProgressStep.user_id == user_id,
        ProgressStep.step_number == current_step_number,
    ).first()
    return jsonify({'status': 'IN_PROGRESS', 'question': next_question.to_json()})


@api_blueprint.route('/admin/validate-password', methods=['POST'])
def validate_admin_password():
    given_admin_password = request.json.get('admin_password')
    if given_admin_password is None:
        return 'Admin password is required', 400

    correct_admin_password = os.environ.get('ADMIN_PASSWORD')
    if correct_admin_password is None or given_admin_password != correct_admin_password:
        return 'Invalid admin password', 403

    return 'OK'


@api_blueprint.route('/admin/export-results', methods=['POST'])
def export_results():
    validation_result = validate_admin_password()
    if validation_result != 'OK':
        return validation_result

    try:
        export_users_results_and_upload_to_google_drive()
    except Exception as e:
        logger.exception(e)
        return 'Error while exporting results. Please try again or contact the developers', 409

    return 'OK'


@api_blueprint.route('/admin/analytics', methods=['POST'])
def get_analytics():
    validation_result = validate_admin_password()
    if validation_result != 'OK':
        return validation_result

    try:
        analytics = calculate_all_analytics()
    except Exception as e:
        logger.exception(e)
        return 'Error while calculating analytics. Please try again or contact the developers', 409

    serialized_analytics = analytics.to_json()
    return serialized_analytics


@api_blueprint.route('/media/<path:path>', methods=['GET'])
def send_file(path):
    return send_from_directory('media', path)
