from flask import Blueprint, Flask, send_from_directory
from dotenv import load_dotenv
import os
from flask_session import Session
from sqlalchemy import inspect
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


def create_basic_app(db_name = 'u2040908_default') -> Flask:
    app = Flask(
        __name__,
        static_folder='../frontend/build/static',
        static_url_path='/static',
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = f'{os.environ["DATABASE_URI"]}/{db_name}'
    app.config["SESSION_TYPE"] = "sqlalchemy"
    app.config['SESSION_SQLALCHEMY'] = db
    db.init_app(app)
    return app


def initialize_app_modules(app: Flask):
    app.register_blueprint(main_blueprint)
    CORS(app, supports_credentials=True)
    app.secret_key = os.environ["SECRET_KEY"]
    app.config['SESSION_PERMANENT'] = True
    with app.app_context():
        Session(app)
        if inspect(db.engine).has_table('sessions') is False:
            db.create_all()  # Make sure that `sessions` table is created.
    return app


if __name__ == '__main__':
    app = create_basic_app()
    initialize_app_modules(app)
