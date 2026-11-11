#!/usr/bin/env python3
"""Score the nine completed candles before an as-of date using ver5 rules.

Example:
    python3 python/nine_candle_score.py 2026-08-03
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "python" / "candles-study.csv"
DEFAULT_CONFIG = Path(__file__).with_name("nine_candle_score_config.json")
SLOPE_FIELDS = ("Slope9", "Slope20", "Slope50")
OHLC_FIELDS = ("Open", "High", "Low", "Close")
STRUCTURE_PATTERNS = {
    "HH-HL",
    "LH-HL",
    "LH-LL",
    "HH-LL",
    "EH-HL",
    "HH-EL",
    "LH-EL",
    "EH-LL",
    "EH-EL",
}


class ScoreInputError(ValueError):
    """Raised when the input data or scoring configuration is unusable."""


def _finite_number(value: Any) -> float | None:
    if value is None or not str(value).strip():
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _parse_iso_date(value: str) -> date:
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise ScoreInputError(f"invalid ISO date {value!r}; expected YYYY-MM-DD") from error
    if parsed.isoformat() != value:
        raise ScoreInputError(f"invalid ISO date {value!r}; expected YYYY-MM-DD")
    return parsed


def _validate_band_coverage(
    bands: list[dict[str, Any]],
    name: str,
    domain_min: float,
    domain_max: float | None,
) -> None:
    ordered = sorted(
        bands,
        key=lambda band: float("-inf") if band["min"] is None else float(band["min"]),
    )
    first_min = ordered[0]["min"]
    if first_min is not None and (
        float(first_min) > domain_min
        or (float(first_min) == domain_min and not ordered[0]["min_inclusive"])
    ):
        raise ScoreInputError(f"configured {name} ranges do not cover {domain_min}")

    for left, right in zip(ordered, ordered[1:]):
        left_max = left["max"]
        right_min = right["min"]
        if left_max is None or right_min is None or float(left_max) != float(right_min):
            raise ScoreInputError(f"configured {name} ranges must be contiguous")
        if left["max_inclusive"] == right["min_inclusive"]:
            raise ScoreInputError(f"configured {name} ranges overlap or leave a boundary gap")

    last = ordered[-1]
    last_max = last["max"]
    if domain_max is None:
        if last_max is not None:
            raise ScoreInputError(f"configured {name} ranges must cover all larger values")
    elif last_max is not None and (
        float(last_max) < domain_max
        or (float(last_max) == domain_max and not last["max_inclusive"])
    ):
        raise ScoreInputError(f"configured {name} ranges do not cover {domain_max}")


def _load_config(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as source:
            config = json.load(source)
    except (OSError, UnicodeError) as error:
        raise ScoreInputError(f"cannot read config {path}: {error}") from error
    except json.JSONDecodeError as error:
        raise ScoreInputError(f"invalid JSON config {path}: {error}") from error
    if not isinstance(config, dict):
        raise ScoreInputError("config root must be a JSON object")

    weights = config.get("candle_weights_oldest_to_newest")
    if not isinstance(weights, list) or len(weights) != 9:
        raise ScoreInputError("config must provide exactly nine candle weights")
    if any(_finite_number(weight) is None or float(weight) <= 0 for weight in weights):
        raise ScoreInputError("candle weights must be finite positive numbers")

    for key in ("structure_scores", "trend_slopes"):
        if not isinstance(config.get(key), dict):
            raise ScoreInputError(f"config field {key!r} must be an object")
    if set(config["structure_scores"]) != STRUCTURE_PATTERNS:
        raise ScoreInputError("structure_scores must define all nine ver5 patterns")
    if any(_finite_number(score) is None for score in config["structure_scores"].values()):
        raise ScoreInputError("structure scores must be finite numbers")

    trend = config["trend_slopes"]
    epsilon = _finite_number(trend.get("epsilon"))
    if epsilon is None or epsilon < 0:
        raise ScoreInputError("trend slope epsilon must be a finite nonnegative number")
    if not isinstance(trend.get("weights"), dict) or set(trend["weights"]) != set(SLOPE_FIELDS):
        raise ScoreInputError("trend weights must define Slope9, Slope20, and Slope50")
    if any(_finite_number(weight) is None or float(weight) <= 0 for weight in trend["weights"].values()):
        raise ScoreInputError("trend weights must be finite positive numbers")

    for key, value_key in (
        ("body_atr_bands", "score"),
        ("rvol_multiplier_bands", "multiplier"),
        ("close_location_bands", "score"),
        ("directional_balance_bands", "bias"),
    ):
        bands = config.get(key)
        if not isinstance(bands, list) or not bands:
            raise ScoreInputError(f"config field {key!r} must be a non-empty array")
        for band in bands:
            if not isinstance(band, dict) or value_key not in band:
                raise ScoreInputError(f"each {key} entry must contain {value_key!r}")
            lower = band.get("min")
            upper = band.get("max")
            if lower is not None and _finite_number(lower) is None:
                raise ScoreInputError(f"{key} lower bounds must be finite or null")
            if upper is not None and _finite_number(upper) is None:
                raise ScoreInputError(f"{key} upper bounds must be finite or null")
            if lower is not None and upper is not None and float(lower) >= float(upper):
                raise ScoreInputError(f"{key} ranges must have min < max")
            if not isinstance(band.get("min_inclusive"), bool) or not isinstance(
                band.get("max_inclusive"), bool
            ):
                raise ScoreInputError(f"{key} ranges must define inclusive-boundary flags")
            if value_key != "bias" and _finite_number(band[value_key]) is None:
                raise ScoreInputError(f"{key} values must be finite numbers")
            if value_key == "bias" and not isinstance(band[value_key], str):
                raise ScoreInputError("bias bands must have string labels")

    for key, lower, upper in (
        ("body_atr_bands", 0.0, None),
        ("rvol_multiplier_bands", 0.0, None),
        ("close_location_bands", 0.0, 1.0),
        ("directional_balance_bands", -1.0, 1.0),
    ):
        _validate_band_coverage(config[key], key, lower, upper)

    max_pressure = _finite_number(config.get("maximum_total_pressure"))
    min_evidence = _finite_number(config.get("minimum_evidence_ratio"))
    if max_pressure is None or max_pressure <= 0:
        raise ScoreInputError("maximum_total_pressure must be positive and finite")
    if min_evidence is None or not 0 <= min_evidence <= 1:
        raise ScoreInputError("minimum_evidence_ratio must be between 0 and 1")
    return config


def _in_band(value: float, band: dict[str, Any]) -> bool:
    lower = band["min"]
    upper = band["max"]
    above_lower = lower is None or value > lower or (
        band["min_inclusive"] and value == lower
    )
    below_upper = upper is None or value < upper or (
        band["max_inclusive"] and value == upper
    )
    return above_lower and below_upper


def _band_value(value: float, bands: list[dict[str, Any]], result_key: str) -> float | None:
    matches = [band[result_key] for band in bands if _in_band(value, band)]
    if len(matches) > 1:
        raise ScoreInputError(f"configured {result_key} ranges overlap at {value}")
    return float(matches[0]) if matches else None


def _load_rows(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(encoding="utf-8", newline="") as source:
            reader = csv.DictReader(source)
            required = {
                "Date",
                "Ticker",
                *OHLC_FIELDS,
                "Direction",
                "PredecessorPatternCode",
                "PredecessorStatus",
                "BodyAtr",
                "CloseLocation",
                "Rvol",
                *SLOPE_FIELDS,
            }
            missing = required.difference(reader.fieldnames or ())
            if missing:
                raise ScoreInputError(
                    f"input CSV is missing columns: {', '.join(sorted(missing))}"
                )
            rows = list(reader)
    except (OSError, UnicodeError, csv.Error) as error:
        raise ScoreInputError(f"cannot read input CSV {path}: {error}") from error

    seen_dates: set[str] = set()
    for row in rows:
        date_text = row.get("Date", "")
        _parse_iso_date(date_text)
        if date_text in seen_dates:
            raise ScoreInputError(f"input CSV has duplicate date {date_text}")
        seen_dates.add(date_text)
    return rows


def _validate_candle_data(row: dict[str, str]) -> tuple[bool, list[str]]:
    values = {field: _finite_number(row.get(field)) for field in OHLC_FIELDS}
    if any(value is None or value <= 0 for value in values.values()):
        return False, ["invalid OHLC values"]
    open_price = values["Open"]
    high = values["High"]
    low = values["Low"]
    close = values["Close"]
    assert open_price is not None and high is not None and low is not None and close is not None
    if high < low or high < max(open_price, close) or low > min(open_price, close):
        return False, ["inconsistent OHLC values"]

    expected_direction = "bullish" if close > open_price else "bearish" if close < open_price else "neutral"
    if row["Direction"].strip().lower() != expected_direction:
        return False, ["direction does not match open and close"]
    if row.get("PredecessorStatus", "").strip() != "OK":
        return False, [f"predecessor status is {row.get('PredecessorStatus', '').strip() or 'missing'}"]
    return True, []


def _score_candle(
    row: dict[str, str],
    weight: float,
    identifier: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    data_quality_pass, reasons = _validate_candle_data(row)
    pattern = row.get("PredecessorPatternCode", "").strip()
    structure_scores = config["structure_scores"]
    structure = _finite_number(structure_scores.get(pattern))
    if structure is None:
        reasons.append(f"unsupported or missing structure pattern {pattern or '(empty)'}")

    body_atr = _finite_number(row.get("BodyAtr"))
    direction = row.get("Direction", "").strip().lower()
    body_magnitude = (
        None
        if body_atr is None or body_atr < 0
        else _band_value(body_atr, config["body_atr_bands"], "score")
    )
    if body_magnitude is None or direction not in {"bullish", "bearish", "neutral"}:
        body = None
    elif direction == "neutral" or body_magnitude == 0:
        body = 0.0
    else:
        body = body_magnitude if direction == "bullish" else -body_magnitude

    warnings: list[str] = []
    rvol = _finite_number(row.get("Rvol"))
    if rvol is None:
        volume_multiplier = 1.0
        warnings.append(f"{identifier} {row['Date']}: RVOL unavailable; used multiplier 1.00")
    elif rvol < 0:
        volume_multiplier = 1.0
        warnings.append(f"{identifier} {row['Date']}: invalid RVOL; used multiplier 1.00")
    else:
        volume_multiplier = _band_value(
            rvol, config["rvol_multiplier_bands"], "multiplier"
        )
    adjusted_body = (
        None if body is None or volume_multiplier is None else body * volume_multiplier
    )

    close_location = _finite_number(row.get("CloseLocation"))
    close_score = (
        None
        if close_location is None or not 0 <= close_location <= 1
        else _band_value(
            close_location, config["close_location_bands"], "score"
        )
    )
    if _finite_number(row.get("High")) == _finite_number(row.get("Low")):
        close_score = None

    epsilon = float(config["trend_slopes"]["epsilon"])
    trend_score: float | None = 0.0
    for field in SLOPE_FIELDS:
        slope = _finite_number(row.get(field))
        if slope is None:
            trend_score = None
            break
        component_weight = float(config["trend_slopes"]["weights"][field])
        if slope > epsilon:
            trend_score += component_weight
        elif slope < -epsilon:
            trend_score -= component_weight

    candle_components = (structure, adjusted_body, close_score, trend_score)
    candle_score = (
        sum(float(component) for component in candle_components)
        if all(component is not None for component in candle_components)
        else None
    )
    contribution = None if candle_score is None else candle_score * weight
    bull_pressure = None if contribution is None else max(contribution, 0.0)
    bear_pressure = None if contribution is None else abs(min(contribution, 0.0))

    if structure is None or adjusted_body is None or close_score is None or trend_score is None:
        data_quality_pass = False
        reasons.append("one or more score components are unavailable")

    return {
        "candle": identifier,
        "date": row["Date"],
        "weight": weight,
        "structure_score": structure,
        "body_score": body,
        "volume_multiplier": volume_multiplier,
        "volume_adjusted_body_score": adjusted_body,
        "location_score": close_score,
        "trend_score": trend_score,
        "candle_score": candle_score,
        "weighted_contribution": contribution,
        "bull_pressure": bull_pressure,
        "bear_pressure": bear_pressure,
        "total_pressure": None if contribution is None else bull_pressure + bear_pressure,
        "net_score": contribution,
        "data_quality_pass": data_quality_pass,
        "reasons": reasons,
        "warnings": warnings,
    }


def calculate_report(
    as_of_date: str,
    input_path: Path = DEFAULT_INPUT,
    config_path: Path = DEFAULT_CONFIG,
) -> dict[str, Any]:
    """Return scores and aggregates for the nine bars strictly before as_of_date."""
    as_of = _parse_iso_date(as_of_date)
    config = _load_config(config_path)
    eligible = [
        row for row in _load_rows(input_path)
        if _parse_iso_date(row["Date"]) < as_of
    ]
    eligible.sort(key=lambda row: row["Date"])
    if len(eligible) < 9:
        raise ScoreInputError(
            f"need nine completed candles before {as_of_date}; found {len(eligible)}"
        )
    selected = eligible[-9:]
    tickers = {row["Ticker"].strip() for row in selected}
    if len(tickers) != 1 or not next(iter(tickers), ""):
        raise ScoreInputError("the nine selected candles must have one non-empty ticker")

    weights = [float(value) for value in config["candle_weights_oldest_to_newest"]]
    candles = [
        _score_candle(row, weights[index], f"T-{9 - index}", config)
        for index, row in enumerate(selected)
    ]
    scored = all(candle["weighted_contribution"] is not None for candle in candles)
    data_quality_pass = all(candle["data_quality_pass"] for candle in candles)
    component_coverage = sum(
        candle["candle_score"] is not None for candle in candles
    ) / 9

    if scored:
        bull_pressure = sum(candle["bull_pressure"] for candle in candles)
        bear_pressure = sum(candle["bear_pressure"] for candle in candles)
        total_pressure = bull_pressure + bear_pressure
        net_score = bull_pressure - bear_pressure
        directional_balance = (
            0.0 if total_pressure == 0 else net_score / total_pressure
        )
        evidence_ratio = total_pressure / float(config["maximum_total_pressure"])
        evidence_gate_pass = evidence_ratio >= float(config["minimum_evidence_ratio"])
    else:
        bull_pressure = bear_pressure = total_pressure = net_score = None
        directional_balance = evidence_ratio = None
        evidence_gate_pass = False

    bias = "UNDEFINED"
    if (
        scored
        and data_quality_pass
        and component_coverage == 1.0
        and evidence_gate_pass
    ):
        band = next(
            (
                band
                for band in config["directional_balance_bands"]
                if _in_band(directional_balance, band)
            ),
            None,
        )
        if band is not None:
            bias = band["bias"]

    return {
        "as_of_date": as_of_date,
        "ticker": next(iter(tickers)),
        "candles": candles,
        "bull_pressure": bull_pressure,
        "bear_pressure": bear_pressure,
        "total_pressure": total_pressure,
        "net_score": net_score,
        "directional_balance": directional_balance,
        "evidence_ratio": evidence_ratio,
        "evidence_gate_pass": evidence_gate_pass,
        "component_coverage": component_coverage,
        "data_quality_pass": data_quality_pass,
        "bias": bias,
    }


TABLE_COLUMNS = (
    ("Candle", "candle"),
    ("Date", "date"),
    ("Weight", "weight"),
    ("StructureScore", "structure_score"),
    ("BodyScore", "body_score"),
    ("VolumeMultiplier", "volume_multiplier"),
    ("VolumeAdjustedBodyScore", "volume_adjusted_body_score"),
    ("LocationScore", "location_score"),
    ("TrendScore", "trend_score"),
    ("CandleScore", "candle_score"),
    ("WeightedContribution", "weighted_contribution"),
    ("BullPressure", "bull_pressure"),
    ("BearPressure", "bear_pressure"),
    ("TotalPressure", "total_pressure"),
    ("NetScore", "net_score"),
)


def _format_value(value: Any) -> str:
    if value is None:
        return "UNAVAILABLE"
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def render_markdown(report: dict[str, Any]) -> str:
    """Render the candle table and nine-candle aggregate metrics as Markdown."""
    headers = [header for header, _ in TABLE_COLUMNS]
    lines = [
        f"## {report['ticker']} nine-candle score at {report['as_of_date']}",
        "",
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for candle in report["candles"]:
        cells = [
            f"{candle[key]:g}" if key == "weight" else _format_value(candle[key])
            for _, key in TABLE_COLUMNS
        ]
        lines.append("| " + " | ".join(cells) + " |")

    summary = (
        ("BullPressure", report["bull_pressure"]),
        ("BearPressure", report["bear_pressure"]),
        ("TotalPressure", report["total_pressure"]),
        ("NetScore", report["net_score"]),
        ("DirectionalBalance", report["directional_balance"]),
        ("EvidenceRatio", report["evidence_ratio"]),
        ("EvidenceGatePass", report["evidence_gate_pass"]),
        ("ComponentCoverage", report["component_coverage"]),
        ("DataQualityPass", report["data_quality_pass"]),
        ("Bias", report["bias"]),
    )
    lines.extend(["", "| Aggregate | Value |", "| --- | --- |"])
    lines.extend(f"| {name} | {_format_value(value)} |" for name, value in summary)
    warnings = [
        warning
        for candle in report["candles"]
        for warning in candle["warnings"]
    ]
    if warnings:
        lines.extend(["", "**Warnings**"])
        lines.extend(f"- {warning}" for warning in warnings)
    reasons = [
        f"{candle['candle']} {candle['date']}: {reason}"
        for candle in report["candles"]
        for reason in candle["reasons"]
    ]
    if reasons:
        lines.extend(["", "**Data-quality notes**"])
        lines.extend(f"- {reason}" for reason in reasons)
    return "\n".join(lines)


def _argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("as_of_date", help="date at the market open (YYYY-MM-DD)")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="candles-study CSV")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="scoring JSON config")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _argument_parser().parse_args(argv)
    try:
        report = calculate_report(args.as_of_date, args.input, args.config)
    except (ScoreInputError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    print(render_markdown(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
