from django.test import SimpleTestCase

from analytics.aggregates import MIN_GROUP_SIZE, aggregate_or_suppress, is_suppressed


class AggregateHelperTests(SimpleTestCase):
    def test_threshold_is_five(self):
        self.assertEqual(MIN_GROUP_SIZE, 5)
        self.assertTrue(is_suppressed(4))
        self.assertFalse(is_suppressed(5))

    def test_integer_count_path(self):
        self.assertEqual(aggregate_or_suppress(3), {"suppressed": True})
        self.assertEqual(
            aggregate_or_suppress(5, lambda _rows: {"ok": True}),
            {"suppressed": False, "n": 5, "ok": True},
        )
