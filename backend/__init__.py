from flask import Blueprint, Flask, send_from_directory
from dotenv import load_dotenv
import os
from flask_session import Session
from sqlalchemy import inspect
from backend.admin import export_users_results_and_upload_to_google_drive
from backend.rest_api import api_blueprint
from backend.models import db

from flask_cors import CORS

load_dotenv()


main_blueprint = Blueprint('main', __name__, url_prefix='/')
main_blueprint.register_blueprint(api_blueprint)

@main_blueprint.route('/')
@main_blueprint.route('/<path:path>')
def catch_all(path = None):
    return send_from_directory('../frontend/build', 'index.html')


def create_basic_app() -> Flask:
    app = Flask(
        __name__,
        static_folder='../frontend/build/static',
        static_url_path='/static',
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ["DATABASE_URI"]
    app.config["SESSION_TYPE"] = "sqlalchemy"
    app.config['SESSION_SQLALCHEMY'] = db
    db.init_app(app)
    return app


def initialize_app_modules(app: Flask):
    app.register_blueprint(main_blueprint)
    CORS(app, supports_credentials=True)
    app.secret_key = os.environ["SECRET_KEY"]
    app.config['SESSION_PERMANENT'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = False
    with app.app_context():
        Session(app)
        if inspect(db.engine).has_table('sessions') is False:
            db.create_all()  # Make sure that `sessions` table is created.
    return app

def create_app() -> Flask:
    app = create_basic_app()
    initialize_app_modules(app)
    return app

