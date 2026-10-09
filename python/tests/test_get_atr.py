import sys
import types
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from python.getAtr import calculate_atr, gATR


class CalculateAtrTests(unittest.TestCase):
    def test_specification_example(self):
        prices = pd.DataFrame(
            {
                "High": [105, 108, 110],
                "Low": [100, 103, 106],
                "Close": [102, 107, 109],
            },
            index=["first", "second", "third"],
        )

        result = calculate_atr(prices, period=3)

        self.assertEqual(result.index.tolist(), prices.index.tolist())
        self.assertTrue(result.iloc[:2].isna().all())
        self.assertEqual(result.iloc[2], 5.0)

    def test_uses_previous_close_and_wilder_smoothing(self):
        prices = pd.DataFrame(
            {
                "High": [10, 13, 12],
                "Low": [8, 11, 10],
                "Close": [9, 12, 11],
            }
        )

        result = calculate_atr(prices, period=2)

        self.assertEqual(result.iloc[1], 3.0)
        self.assertEqual(result.iloc[2], 2.5)

    def test_period_one_returns_true_range_for_each_row(self):
        prices = pd.DataFrame(
            {
                "High": [10, 13],
                "Low": [8, 11],
                "Close": [9, 12],
            }
        )

        result = calculate_atr(prices, period=1)

        np.testing.assert_allclose(result.to_numpy(), [2.0, 4.0])

    def test_insufficient_rows_return_aligned_missing_values(self):
        prices = pd.DataFrame(
            {"High": [10], "Low": [8], "Close": [9]}, index=["only-row"]
        )

        result = calculate_atr(prices, period=2)

        self.assertEqual(result.index.tolist(), prices.index.tolist())
        self.assertTrue(result.isna().all())

    def test_rejects_invalid_period_and_non_finite_prices(self):
        prices = pd.DataFrame({"High": [10], "Low": [8], "Close": [9]})

        with self.assertRaises(ValueError):
            calculate_atr(prices, period=0)
        with self.assertRaises(ValueError):
            calculate_atr(
                pd.DataFrame({"High": [np.inf], "Low": [8], "Close": [9]}),
                period=1,
            )


class GetAtrTests(unittest.TestCase):
    def test_gatr_handles_yfinance_multiindex_columns_offline(self):
        prices = pd.DataFrame(
            {
                ("Open", "TEST"): [99.5] * 15,
                ("High", "TEST"): [101.0] * 15,
                ("Low", "TEST"): [99.0] * 15,
                ("Close", "TEST"): [100.0] * 15,
                ("Volume", "TEST"): [1000] * 15,
            }
        )
        yfinance = types.ModuleType("yfinance")
        yfinance.download = lambda *args, **kwargs: prices.copy()

        with patch.dict(sys.modules, {"yfinance": yfinance}):
            with patch("python.getAtr.Print", False):
                result = gATR("TEST")

        self.assertEqual(len(result), len(prices))
        self.assertTrue(result.iloc[:13].isna().all())
        self.assertEqual(result.iloc[-1], 2.0)


if __name__ == "__main__":
    unittest.main()
