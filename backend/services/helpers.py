"""Small shared helpers: JSON sanitising and date formatting."""
import math

import pandas as pd


def json_safe(value, digits=4):
    """Convert numpy/pandas scalars into JSON-safe Python values.

    NaN/Inf become None so Flask never emits invalid JSON.
    """
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    try:
        f = float(value)
    except (TypeError, ValueError):
        return value
    if math.isnan(f) or math.isinf(f):
        return None
    return round(f, digits)


def fmt_dates(index, interval="1d"):
    """Format a pandas DatetimeIndex into ISO-ish strings for the frontend."""
    out = []
    for ts in pd.to_datetime(index):
        if interval in ("1d", "1wk", "1mo"):
            out.append(ts.strftime("%Y-%m-%d"))
        else:
            out.append(ts.strftime("%Y-%m-%d %H:%M"))
    return out


class ApiError(Exception):
    """Raised by services and converted into a JSON error by app.py."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status
