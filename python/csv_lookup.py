#!/usr/bin/env python3
"""Find ticker/date rows across CSV files and print selected values as Markdown.

Example:
    python3 python/csv_lookup.py NVDA 2026-07-29 Magnitude Slope9
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterator


FIELD_ALIASES = {"magnitud": "magnitude"}
DATE_HEADERS = {"date", "datetime", "timestamp"}
TICKER_HEADER = "ticker"
RANGE_PATTERN = re.compile(r"^T-(\d+)$", re.IGNORECASE)
MAX_PREVIOUS_ROWS = 99
PRICE_FIELDS = {
    "open",
    "high",
    "low",
    "close",
    "atr",
    "range",
    "body",
    "upperwick",
    "lowerwick",
    "ema9",
    "sma20",
    "ema50",
    "ema100",
    "ema200",
}


class LookupError(ValueError):
    """Raised when lookup arguments or available CSV columns are invalid."""


def _normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def _validate_date_argument(value: str) -> tuple[bool, date | datetime]:
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        try:
            return True, date.fromisoformat(value)
        except ValueError as error:
            raise LookupError(f"invalid date {value!r}; expected YYYY-MM-DD") from error
    try:
        return False, datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise LookupError(
            f"invalid date or timestamp {value!r}; expected YYYY-MM-DD or an ISO timestamp"
        ) from error


def _date_matches(requested: date | datetime, date_only: bool, value: str) -> bool:
    candidate_text = value.strip()
    if date_only:
        return candidate_text[:10] == requested.isoformat()
    try:
        candidate = datetime.fromisoformat(candidate_text.replace("Z", "+00:00"))
    except ValueError:
        return False
    if (candidate.tzinfo is None) != (requested.tzinfo is None):
        return False
    return candidate == requested


def _datetime_key(value: str | date | datetime) -> tuple[int, ...] | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime(value.year, value.month, value.day)
    else:
        try:
            parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return (
        parsed.year,
        parsed.month,
        parsed.day,
        parsed.hour,
        parsed.minute,
        parsed.second,
        parsed.microsecond,
    )


def _parse_range(fields: list[str], range_option: str | None) -> tuple[int, list[str]]:
    if fields and RANGE_PATTERN.fullmatch(fields[0]):
        if range_option is not None:
            raise LookupError("specify the T-n range either positionally or with --range, not both")
        range_option = fields.pop(0)
    if range_option is None:
        return 0, fields
    match = RANGE_PATTERN.fullmatch(range_option)
    if match is None:
        raise LookupError("range must use T-0 through T-99, for example T-9")
    count = int(match.group(1))
    if count > MAX_PREVIOUS_ROWS:
        raise LookupError(f"range cannot exceed T-{MAX_PREVIOUS_ROWS}")
    return count, fields


def _resolve_columns(headers: list[str], requested: list[str]) -> dict[str, str] | None:
    lookup = {_normalized(header): header for header in headers if header}
    resolved: dict[str, str] = {}
    for field in requested:
        canonical = FIELD_ALIASES.get(_normalized(field), field)
        actual = lookup.get(_normalized(canonical))
        if actual is None:
            return None
        resolved[field] = actual
    return resolved


def _filename_matches_ticker(path: Path, ticker: str) -> bool:
    symbols = re.findall(r"[A-Za-z0-9]+", path.stem)
    return ticker.casefold() in {symbol.casefold() for symbol in symbols}


def _records_from_csv(
    path: Path,
) -> tuple[list[str], str, list[str], Iterator[dict[str, str]]]:
    """Return headers, date field, ticker symbols, and row iterator."""
    source = path.open(encoding="utf-8-sig", newline="")
    reader = csv.reader(source)
    try:
        first = next(reader, None)
        if not first:
            source.close()
            return [], "", [], iter(())

        if first and first[0].strip().casefold() == "price":
            ticker_row = next(reader, [])
            date_row = next(reader, [])
            if not ticker_row or ticker_row[0].strip().casefold() != "ticker":
                source.close()
                return [], "", [], iter(())
            headers = ["Ticker", *[field.strip() for field in first[1:]]]
            tickers = [symbol.strip() for symbol in ticker_row[1:] if symbol.strip()]
            date_label = date_row[0].strip().casefold() if date_row else ""
            if date_label not in DATE_HEADERS:
                source.close()
                return [], "", [], iter(())

            def multiheader_rows() -> Iterator[dict[str, str]]:
                try:
                    for values in reader:
                        if not values:
                            continue
                        symbols = dict.fromkeys(
                            symbol.strip()
                            for symbol in ticker_row[1:]
                            if symbol.strip()
                        )
                        for symbol in symbols:
                            row = {"Ticker": symbol}
                            for index, field in enumerate(first[1:], start=1):
                                if (
                                    index < len(ticker_row)
                                    and ticker_row[index].strip().casefold()
                                    == symbol.casefold()
                                ):
                                    row[field.strip()] = (
                                        values[index]
                                        if index < len(values)
                                        else ""
                                    )
                            row[date_row[0].strip()] = values[0]
                            yield row
                finally:
                    source.close()

            return headers + [date_row[0].strip()], date_row[0].strip(), tickers, multiheader_rows()

        headers = [field.strip() for field in first]
        date_field = next(
            (field for field in headers if _normalized(field) in DATE_HEADERS),
            "",
        )
        ticker_field = next(
            (field for field in headers if _normalized(field) == TICKER_HEADER),
            "",
        )

        def flat_rows() -> Iterator[dict[str, str]]:
            try:
                for values in reader:
                    if not values:
                        continue
                    yield {
                        headers[index]: values[index] if index < len(values) else ""
                        for index in range(len(headers))
                    }
            finally:
                source.close()

        ticker_values: list[str] = []
        if ticker_field:
            # The row iterator supplies actual per-row ticker values.
            ticker_values = [ticker_field]
        return headers, date_field, ticker_values, flat_rows()
    except (csv.Error, UnicodeError):
        source.close()
        raise


def find_matches(
    ticker: str,
    date_text: str,
    fields: list[str],
    directory: Path = Path.cwd(),
    range_count: int = 0,
) -> tuple[list[dict[str, object]], list[str]]:
    """Return deduplicated values and unreadable-file warnings."""
    date_only, requested_date = _validate_date_argument(date_text)
    if not 0 <= range_count <= MAX_PREVIOUS_ROWS:
        raise LookupError(f"range_count must be between 0 and {MAX_PREVIOUS_ROWS}")
    if not ticker.strip():
        raise LookupError("ticker cannot be empty")
    if not fields or any(not field.strip() for field in fields):
        raise LookupError("provide at least one non-empty field name")
    if len({_normalized(field) for field in fields}) != len(fields):
        raise LookupError("requested field names must be unique")
    if not directory.is_dir():
        raise LookupError(f"CSV directory does not exist: {directory}")

    groups: dict[tuple[str, tuple[str, ...]], set[str]] = defaultdict(set)
    warnings: list[str] = []
    available_columns: set[str] = set()

    for path in sorted(directory.glob("*.csv")):
        try:
            headers, date_field, ticker_metadata, rows = _records_from_csv(path)
            available_columns.update(headers)
            resolved = _resolve_columns(headers, fields)
            if not date_field or resolved is None:
                for _ in rows:
                    pass
                continue

            has_ticker_column = any(
                _normalized(header) == TICKER_HEADER for header in headers
            )
            filename_ticker_match = _filename_matches_ticker(path, ticker)
            header_ticker_match = any(
                symbol.casefold() == ticker.casefold()
                for symbol in ticker_metadata
                if symbol != "ticker"
            )
            if not has_ticker_column and not header_ticker_match and not filename_ticker_match:
                for _ in rows:
                    pass
                continue

            for row in rows:
                row_date = row.get(date_field, "")
                if range_count:
                    row_key = _datetime_key(row_date)
                    requested_key = _datetime_key(requested_date)
                    if row_key is None or requested_key is None:
                        continue
                    if date_only:
                        if row_date.strip()[:10] > requested_date.isoformat():
                            continue
                    elif row_key > requested_key:
                        continue
                elif not _date_matches(requested_date, date_only, row_date):
                    continue
                row_ticker = next(
                    (
                        value.strip()
                        for key, value in row.items()
                        if _normalized(key) == TICKER_HEADER and value.strip()
                    ),
                    "",
                )
                if has_ticker_column and row_ticker.casefold() != ticker.casefold():
                    continue
                if not has_ticker_column and header_ticker_match and not filename_ticker_match:
                    if not any(
                        symbol.casefold() == ticker.casefold()
                        for symbol in ticker_metadata
                    ):
                        continue
                values = tuple(
                    _format_field_value(
                        field, row.get(resolved[field], "").strip()
                    )
                    for field in fields
                )
                groups[(row_date.strip(), values)].add(path.name)
        except (OSError, UnicodeError, csv.Error) as error:
            warnings.append(f"{path.name}: {error}")

    if not available_columns:
        raise LookupError(f"no readable CSV headers found in {directory}")
    missing = [
        field for field in fields
        if not any(
            _normalized(header) == _normalized(FIELD_ALIASES.get(_normalized(field), field))
            for header in available_columns
        )
    ]
    if missing:
        raise LookupError(
            "requested field(s) not found in CSV files: "
            + ", ".join(missing)
            + f"; available fields: {', '.join(sorted(available_columns, key=str.casefold))}"
        )

    results = [
        {"date": row_date, "values": values, "files": sorted(files)}
        for (row_date, values), files in groups.items()
    ]
    if range_count:
        requested_key = _datetime_key(requested_date)
        if date_only:
            anchor_keys = [
                _datetime_key(str(result["date"]))
                for result in results
                if str(result["date"])[:10] == requested_date.isoformat()
            ]
            anchor_key = max((key for key in anchor_keys if key is not None), default=None)
        else:
            anchor_key = requested_key
            if not any(
                _datetime_key(str(result["date"])) == anchor_key
                for result in results
            ):
                anchor_key = None

        if anchor_key is None:
            return [], warnings

        prior_keys = sorted(
            {
                key
                for result in results
                if (key := _datetime_key(str(result["date"]))) is not None
                and key <= anchor_key
            }
        )
        selected_keys = prior_keys[-(range_count + 1):]
        range_labels = {
            key: f"T-{len(selected_keys) - index - 1}"
            for index, key in enumerate(selected_keys)
        }
        results = [
            {
                **result,
                "range": range_labels[_datetime_key(str(result["date"]))],
            }
            for result in results
            if _datetime_key(str(result["date"])) in range_labels
        ]
        results.sort(
            key=lambda result: (
                -selected_keys.index(_datetime_key(str(result["date"]))),
                tuple(result["values"]),
            )
        )
    else:
        results.sort(key=lambda result: (str(result["date"]), tuple(result["values"])))
    return results, warnings


def _escape_markdown(value: object) -> str:
    return str(value).replace("|", r"\|").replace("\r", " ").replace("\n", " ")


def _format_field_value(field: str, value: str) -> str:
    if not value:
        return "UNAVAILABLE"
    try:
        number = float(value)
    except ValueError:
        return value

    if _normalized(field) == "volume":
        formatted_volume = f"{number:,.0f}"
        if float(formatted_volume.replace(",", "")) == 0:
            return "0"
        return formatted_volume

    precision = 2 if _normalized(field) in PRICE_FIELDS else 4
    formatted = f"{number:.{precision}f}"
    if float(formatted) == 0:
        return f"{0:.{precision}f}"
    return formatted


def render_markdown(
    ticker: str, fields: list[str], matches: list[dict[str, object]]
) -> str:
    range_enabled = bool(matches and "range" in matches[0])
    headers = (["Range"] if range_enabled else []) + ["Ticker", "Date", *fields, "File"]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    if not matches:
        lines.append(
            "| "
            + " | ".join(["No matching rows", *("" for _ in fields), ""])
            + " |"
        )
    else:
        for match in matches:
            values = match["values"]
            files = match["files"]
            cells = [
                *([str(match["range"])] if range_enabled else []),
                ticker,
                str(match["date"]),
                *(
                    _format_field_value(field, value)
                    for field, value in zip(fields, values)
                ),
                ", ".join(files),
            ]
            lines.append("| " + " | ".join(_escape_markdown(cell) for cell in cells) + " |")
    return "\n".join(lines)


def _argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ticker", help="ticker symbol, for example NVDA")
    parser.add_argument("date", help="date YYYY-MM-DD or ISO timestamp")
    parser.add_argument("fields", nargs="+", help="CSV columns to display")
    parser.add_argument(
        "--range",
        dest="range_spec",
        help="include T-0 and up to 99 previous rows, for example T-9",
    )
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path.cwd(),
        help="directory to scan for CSV files (default: current directory)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _argument_parser().parse_args(argv)
    try:
        range_count, fields = _parse_range(args.fields, args.range_spec)
        matches, warnings = find_matches(
            args.ticker, args.date, fields, args.directory, range_count
        )
    except LookupError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    print(render_markdown(args.ticker, fields, matches))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
