#!/usr/bin/env python3
"""
Classify a single OHLC candle by direction and shape.

Usage:
    python candle_shape.py --open 100 --high 105 --low 98 --close 104
    python candle_shape.py 100 105 98 104
    python candle_shape.py --open 100 --high 105 --low 98 --close 104 --json

Arguments are ordered O, H, L, C when positional.
Prices must be finite numbers and satisfy:
    H >= max(O, C)
    L <= min(O, C)
    H >= L

Shape thresholds are based on the proposed symmetric taxonomy:
    marubozu, rejection, momentum, hammer_shape,
    inverted_hammer_shape, spinning_top, standard.

Note: "hammer_shape" and "inverted_hammer_shape" describe candle geometry
only; they do not imply a trend or market reversal.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from typing import Any


def classify_candle(open_: float, high: float, low: float, close: float) -> dict[str, Any]:
    """Return direction, shape, and useful geometry fields for one OHLC candle."""
    values = {"O": open_, "H": high, "L": low, "C": close}
    for name, value in values.items():
        if not math.isfinite(value):
            raise ValueError(f"{name} must be a finite number")

    # Validate OHLC structure so invalid inputs are not silently classified.
    if high < low:
        raise ValueError("H must be greater than or equal to L")
    if high < max(open_, close):
        raise ValueError("H must be greater than or equal to max(O, C)")
    if low > min(open_, close):
        raise ValueError("L must be less than or equal to min(O, C)")

    if close > open_:
        direction = "bullish"
    elif close < open_:
        direction = "bearish"
    else:
        direction = "neutral"

    range_ = high - low
    body = abs(close - open_)
    upper_wick = high - max(open_, close)
    lower_wick = min(open_, close) - low

    # Degenerate flat candle: ratios are undefined.
    if range_ == 0:
        return {
            "direction": direction,
            "shape": "flat_neutral_candle",
            "body_ratio": None,
            "upper_wick_ratio": None,
            "lower_wick_ratio": None,
            "range": range_,
            "body": body,
            "upper_wick": upper_wick,
            "lower_wick": lower_wick,
        }

    # Any non-flat candle with O == C is a neutral doji under the README contract.
    body_ratio = body / range_
    upper_ratio = upper_wick / range_
    lower_ratio = lower_wick / range_

    geometry = {
        "body_ratio": body_ratio,
        "upper_wick_ratio": upper_ratio,
        "lower_wick_ratio": lower_ratio,
        "range": range_,
        "body": body,
        "upper_wick": upper_wick,
        "lower_wick": lower_wick,
    }

    if direction == "neutral":
        return {
            "direction": direction,
            "shape": "doji_neutral_candle",
            **geometry,
        }

    # Mirror the candle into a canonical orientation:
    # the rejection/hammer wick is the lower wick for bullish candles,
    # and the upper wick for bearish candles.
    if direction == "bullish":
        rejection_ratio = lower_ratio
        opposite_ratio = upper_ratio
        hammer_ratio = lower_ratio
        opposite_hammer_ratio = upper_ratio
        inverted_ratio = upper_ratio
        opposite_inverted_ratio = lower_ratio
        hammer_wick = lower_wick
        inverted_wick = upper_wick
        rejection_name = "lower_rejection"
    else:
        rejection_ratio = upper_ratio
        opposite_ratio = lower_ratio
        hammer_ratio = upper_ratio
        opposite_hammer_ratio = lower_ratio
        inverted_ratio = lower_ratio
        opposite_inverted_ratio = upper_ratio
        hammer_wick = upper_wick
        inverted_wick = lower_wick
        rejection_name = "upper_rejection"

    # Conditions are deliberately disjoint by body-ratio band where needed.
    if (
        body_ratio >= 0.90
        and upper_ratio <= 0.05
        and lower_ratio <= 0.05
    ):
        shape_suffix = "marubozu"

    elif (
        0.60 <= body_ratio < 0.90
        and rejection_ratio >= 0.15
        and opposite_ratio <= 0.10
    ):
        shape_suffix = rejection_name

    elif (
        0.60 <= body_ratio < 0.90
        and upper_ratio <= 0.20
        and lower_ratio <= 0.20
        # Exclude the rejection region so the rules are mutually exclusive.
        and not (
            rejection_ratio >= 0.15
            and opposite_ratio <= 0.10
        )
    ):
        shape_suffix = "momentum"

    elif (
        0 < body_ratio <= 0.35
        and hammer_ratio >= 0.50
        and opposite_hammer_ratio <= 0.10
        and hammer_wick >= 2 * body
    ):
        shape_suffix = "hammer_shape"

    elif (
        0 < body_ratio <= 0.35
        and inverted_ratio >= 0.50
        and opposite_inverted_ratio <= 0.10
        and inverted_wick >= 2 * body
    ):
        shape_suffix = "inverted_hammer_shape"

    elif (
        0 < body_ratio <= 0.30
        and upper_ratio >= 0.20
        and lower_ratio >= 0.20
    ):
        shape_suffix = "spinning_top"

    else:
        shape_suffix = "standard"

    return {
        "direction": direction,
        "shape": f"{direction}_{shape_suffix}",
        **geometry,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Return the direction and shape of one OHLC candle."
    )
    parser.add_argument(
        "ohlc",
        nargs="*",
        metavar="PRICE",
        help="Four positional prices in order: O H L C",
    )
    parser.add_argument("--open", dest="open_", type=float, help="Open price")
    parser.add_argument("--high", type=float, help="High price")
    parser.add_argument("--low", type=float, help="Low price")
    parser.add_argument("--close", type=float, help="Close price")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the result as JSON",
    )
    args = parser.parse_args()

    named = [args.open_, args.high, args.low, args.close]
    if args.ohlc and any(v is not None for v in named):
        parser.error("use either four positional prices or --open/--high/--low/--close")
    if args.ohlc:
        if len(args.ohlc) != 4:
            parser.error("provide exactly four positional prices: O H L C")
        try:
            args.open_, args.high, args.low, args.close = map(float, args.ohlc)
        except ValueError:
            parser.error("all OHLC prices must be numbers")
    elif any(v is None for v in named):
        parser.error("provide O H L C positionally, or specify all four named options")

    return args


def main() -> int:
    args = parse_args()
    try:
        result = classify_candle(args.open_, args.high, args.low, args.close)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Direction: {result['direction']}")
        print(f"Shape:     {result['shape']}")
        print(
            "Ratios:    "
            f"body={result['body_ratio']}, "
            f"upper_wick={result['upper_wick_ratio']}, "
            f"lower_wick={result['lower_wick_ratio']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())