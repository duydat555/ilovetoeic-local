import unittest

from bs4 import BeautifulSoup

from format_passage_translations import tag_topology_signature
from format_passage_translations_local import format_locally, visible_text_nodes


class LocalPassageTranslationFormatterTests(unittest.TestCase):
    def assert_verbatim_output(self, translation: str, html: str) -> None:
        document = BeautifulSoup(html, "html.parser")
        for node in visible_text_nodes(document):
            text = str(node).strip()
            if text:
                self.assertIn(text, translation)

    def test_single_styled_email_can_use_translation_that_omits_header(self) -> None:
        source = (
            '<div class="email" style="padding:12px">'
            "To: all@example.com<br>From: sender@example.com<br>"
            "Date: January 7<br>Subject: Parking<br><br>"
            "Dear Clients,<br><br>The parking area will close.<br>Regards."
            "</div>"
        )
        translation = (
            "Thân gửi quý khách hàng,\n\n"
            "Khu vực đậu xe sẽ đóng cửa.\n\nTrân trọng."
        )

        result, verification = format_locally({"passage_text": source}, translation)

        output = result["passage_text_vi_html"]
        self.assertEqual(verification.similarity, 1.0)
        self.assertEqual(
            tag_topology_signature(BeautifulSoup(source, "html.parser")),
            tag_topology_signature(BeautifulSoup(output, "html.parser")),
        )
        self.assert_verbatim_output(translation, output)

    def test_grouped_metadata_segments_share_the_source_metadata_block(self) -> None:
        source = (
            '<p class="document-title">Memo</p>'
            "<p>To: All employees<br>From: Marcus<br>"
            "Date: June 1<br>Subject: Maintenance</p>"
            "<p>The server will be unavailable.</p>"
            "<p>Thank you.</p>"
        )
        translation = (
            "Đến: Tất cả nhân viên\n"
            "Từ: Marcus\n"
            "Ngày: 1 tháng 6\n"
            "Chủ đề: Bảo trì\n\n"
            "Máy chủ sẽ không khả dụng.\n\n"
            "Cảm ơn."
        )

        result, verification = format_locally({"passage_text": source}, translation)

        output = result["passage_text_vi_html"]
        self.assertEqual(verification.similarity, 1.0)
        self.assertIn("Đến: Tất cả nhân viên", output)
        self.assertIn("Từ: Marcus", output)
        self.assert_verbatim_output(translation, output)

    def test_unlabelled_source_date_accepts_reviewed_labelled_date(self) -> None:
        source = (
            "<p>April 5</p><h2>SOIL REPORT</h2>"
            "<p>Client: Gould Manufacturing</p>"
        )
        translation = (
            "Ngày: 5 tháng 4\n\n"
            "BÁO CÁO ĐẤT\n\n"
            "Khách hàng: Gould Manufacturing"
        )

        result, verification = format_locally({"passage_text": source}, translation)

        output = result["passage_text_vi_html"]
        self.assertEqual(verification.similarity, 1.0)
        self.assertIn("Ngày: 5 tháng 4", output)
        self.assert_verbatim_output(translation, output)

    def test_email_document_label_is_not_treated_as_address_metadata(self) -> None:
        source = (
            "<p>To: Management Team</p><p>From: Fiona Watson</p>"
            "<p>Dear Colleagues,</p><p>The agenda is attached.</p>"
        )
        translation = (
            "Email: Gửi đội ngũ quản lý,\n\n"
            "Chương trình được đính kèm."
        )

        result, verification = format_locally({"passage_text": source}, translation)

        output = result["passage_text_vi_html"]
        self.assertEqual(verification.similarity, 1.0)
        self.assertIn("Email: Gửi đội ngũ quản lý,", output)
        self.assert_verbatim_output(translation, output)


if __name__ == "__main__":
    unittest.main()
