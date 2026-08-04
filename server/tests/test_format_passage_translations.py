import unittest

from format_passage_translations import (
    OutputValidationError,
    build_source_bundle,
    daily_quota_exhausted,
    validate_and_split_output,
    verify_word_multiset,
)


class PassageTranslationFormatterTests(unittest.TestCase):
    def test_daily_quota_error_is_detected(self) -> None:
        error = RuntimeError(
            "quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier"
        )

        self.assertTrue(daily_quota_exhausted(error))
        self.assertFalse(daily_quota_exhausted(RuntimeError("429 per minute")))

    def test_multiset_similarity_is_one_for_same_words_in_different_html_nodes(self):
        translation = "Tên Drew Gerson Ngày 12 tháng 12"
        output_html = (
            '<table><tr><td>Tên</td><td>Drew Gerson</td></tr>'
            '<tr><td>Ngày</td><td>12 tháng 12</td></tr></table>'
        )

        verification = verify_word_multiset(translation, output_html)

        self.assertEqual(verification.similarity, 1.0)
        self.assertEqual(verification.missing_tokens, {})
        self.assertEqual(verification.extra_tokens, {})

    def test_multiset_similarity_detects_changed_words(self):
        translation = "một hai ba"
        output_html = "<p>một hai bốn</p>"

        verification = verify_word_multiset(translation, output_html)

        self.assertEqual(verification.similarity, 0.5)
        self.assertEqual(verification.missing_tokens, {"ba": 1})
        self.assertEqual(verification.extra_tokens, {"bốn": 1})

    def test_output_is_split_when_structure_and_attributes_are_unchanged(self):
        source_by_column = {
            "passage_text": (
                '<div style="width:100%"><table><tr>'
                '<td class="label">Name</td><td>Drew</td>'
                "</tr></table></div>"
            ),
            "passage_text_2": "<p><strong>Subject:</strong> Roof repair</p>",
        }
        source_bundle = build_source_bundle(source_by_column)
        output_html = (
            '<div data-passage-format-root="true">'
            '<section data-passage-source-column="passage_text">'
            '<div style="width:100%"><table><tr>'
            '<td class="label">Tên</td><td>Drew</td>'
            "</tr></table></div></section>"
            '<section data-passage-source-column="passage_text_2">'
            "<p><strong>Chủ đề:</strong> Sửa mái nhà</p>"
            "</section></div>"
        )

        result = validate_and_split_output(
            source_bundle,
            output_html,
            tuple(source_by_column),
        )

        self.assertIn('<td class="label">Tên</td>', result["passage_text"])
        self.assertIn("<strong>Chủ đề:</strong>", result["passage_text_2"])

    def test_output_is_rejected_when_ai_changes_dom_structure(self):
        source_by_column = {
            "passage_text": "<table><tr><td>Name</td><td>Drew</td></tr></table>",
        }
        source_bundle = build_source_bundle(source_by_column)
        output_html = (
            '<div data-passage-format-root="true">'
            '<section data-passage-source-column="passage_text">'
            "<div><p>Tên Drew</p></div>"
            "</section></div>"
        )

        with self.assertRaises(OutputValidationError):
            validate_and_split_output(
                source_bundle,
                output_html,
                tuple(source_by_column),
            )

    def test_source_attributes_are_restored_before_output_is_saved(self):
        source_by_column = {
            "passage_text": (
                '<div class="source-layout" style="width:100%">'
                '<p class="source-copy">Original</p></div>'
            ),
        }
        source_bundle = build_source_bundle(source_by_column)
        output_html = (
            '<div data-passage-format-root="true">'
            '<section data-passage-source-column="passage_text">'
            '<div class="changed" style="width:50%">'
            '<p class="changed-copy">Bản dịch</p></div>'
            "</section></div>"
        )

        result = validate_and_split_output(
            source_bundle,
            output_html,
            tuple(source_by_column),
        )

        self.assertIn('class="source-layout"', result["passage_text"])
        self.assertIn('style="width:100%"', result["passage_text"])
        self.assertIn('class="source-copy"', result["passage_text"])
        self.assertNotIn('class="changed"', result["passage_text"])

    def test_output_is_rejected_when_a_source_slot_is_missing(self):
        source_by_column = {
            "passage_text": "<p>First</p>",
            "passage_text_2": "<p>Second</p>",
        }
        source_bundle = build_source_bundle(source_by_column)
        output_html = (
            '<div data-passage-format-root="true">'
            '<section data-passage-source-column="passage_text">'
            "<p>Thứ nhất</p>"
            "</section></div>"
        )

        with self.assertRaises(OutputValidationError):
            validate_and_split_output(
                source_bundle,
                output_html,
                tuple(source_by_column),
            )


if __name__ == "__main__":
    unittest.main()
