from datetime import datetime, timedelta

def calculate_total_time(time_ranges):
    total_time = timedelta()
    for start_time, end_time in time_ranges:
        start = datetime.strptime(start_time, "%H:%M")
        end = datetime.strptime(end_time, "%H:%M")
        time_delta = end - start
        total_time += time_delta
    return total_time

time_ranges = [
    ("17:16", "18:37"),
    ("19:20", "20:45"),
    ("10:35", "11:15"),
    ("16:16", "17:38"),
    ("21:20", "21:42"),
    ("21:43", "21:56"),
    ("11:08", "11:37"),
    ("09:55", "11:24"),
    ("22:26", "22:54"),
    ("23:26", "23:56"),
    ("16:50", "17:50"),
    ("21:33", "22:44"),
    ("16:16", "18:32"),
    # ("23:47", "01:26"),
    ("09:42", "10:21"),
    ("10:43", "11:28"),
    ("22:04", "23:25"),
]
total_time = calculate_total_time(time_ranges)
print(total_time)