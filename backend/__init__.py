from flask import Blueprint, Flask, send_from_directory
from dotenv import load_dotenv
import os
from flask_session import Session
from sqlalchemy import MetaData  # type: ignore[import]  # has not type stubs
from backend.rest_api import api_blueprint
from backend.models import db

from flask_cors import CORS

load_dotenv()
session = Session()


main_blueprint = Blueprint('main', __name__, url_prefix='/')
main_blueprint.register_blueprint(api_blueprint)

@main_blueprint.route('/')
@main_blueprint.route('/<path:path>')
def catch_all(path = None):
    return send_from_directory('../frontend/build', 'index.html')


def create_app(db_name = 'u2040908_default'):
    app = Flask(
        __name__,
        static_folder='../frontend/build/static',
        static_url_path='/static',
    )
    app.register_blueprint(main_blueprint)
    CORS(app, supports_credentials=True)
    app.secret_key = os.environ["SECRET_KEY"]
    app.config["SQLALCHEMY_DATABASE_URI"] = f'{os.environ["DATABASE_URI"]}/{db_name}'
    app.config["SESSION_TYPE"] = "sqlalchemy"
    app.config['SESSION_SQLALCHEMY'] = db
    app.config['SESSION_PERMANENT'] = True
    db.init_app(app)
    with app.app_context():
        metadata = MetaData()
        metadata.reflect(bind=db.engine)
        metadata.drop_all(bind=db.engine)
        db.create_all()
        print(metadata.tables.keys())
        breakpoint()
        ...
    #     metadata.drop_all(bind=db.engine)
        # app.session_interface.make_null_session
    # breakpoint()
    # session._get_interface(app)
    session.init_app(app)
    return app


def reset_db(app: Flask):
    with app.app_context():
        metadata = MetaData()
        metadata.info
        metadata.reflect(bind=db.engine)
        metadata.drop_all(bind=db.engine)
        db.create_all()  # Happens after Session() initialization in order to create the sessions table


if __name__ == '__main__':
    app = create_app()
