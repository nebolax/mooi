from datetime import datetime
from pathlib import Path
from typing import Iterator
from backend.flow_logic import get_passed_levels_stats, process_stats
from backend.types import MAX_LANGUAGE_LEVEL, MIN_LANGUAGE_LEVEL, LanguageLevel
from backend.models import User, db_session
import openpyxl
from openpyxl.utils import get_column_letter


def generate_users_results_export_data() -> Iterator[tuple]:
    for user in db_session.query(User):
        stats = get_passed_levels_stats(user.id)
        finished_level, _ = process_stats(stats)
        if finished_level is None:
            continue  # Export only users that have finished

        finished_level_str, recommended_group_str = '-', '-'
        if finished_level > LanguageLevel.A_0:
            finished_level_str = str(finished_level)
        if finished_level < MAX_LANGUAGE_LEVEL:
            recommended_group_str = str(finished_level + 1)
        yield (
            user.id,
            user.full_name,
            user.email,
            finished_level_str,
            recommended_group_str,
            f'http://127.0.0.1:5000/results/{user.uuid}'
        )


def export_users_results_to_file():
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = 'Результаты прохождения теста'

    worksheet.append((
        'Id',
        'Полное имя',
        'Электронная почта',
        'Текущий уровень',
        'Рекомендуемая группа',
        'Подробные результаты',
    ))

    # Write the data
    for user_data in generate_users_results_export_data():
        worksheet.append(user_data)

    # Format links
    for row_idx in range(2, worksheet.max_row + 1):
        cell = worksheet.cell(row=row_idx, column=6)
        cell.hyperlink = cell.value

    # Resize columns
    for column_cells in worksheet.columns:
        new_column_length = max(len(str(cell.value)) for cell in column_cells)
        new_column_letter = (get_column_letter(column_cells[0].column))
        if new_column_length > 0:
            worksheet.column_dimensions[new_column_letter].width = new_column_length*1.23


    export_dir = Path(__file__).resolve().parent.parent / 'export_data'
    export_dir.mkdir(exist_ok=True)
    current_datetime_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    filename = f'Экспорт результатов {current_datetime_str}.xlsx'
    workbook.save(export_dir / filename)
