import re
import html

def clean_html_text(raw_html: str) -> str:
    if not raw_html:
        return ""

    # 1. Unescape HTML entities (&nbsp;, &amp;, &quot;, &lt;, &gt;)
    text = html.unescape(raw_html)

    # 2. Replace &nbsp; and non-breaking spaces with standard space
    text = text.replace("\xa0", " ").replace("&nbsp;", " ")

    # 3. Strip inline style attributes (e.g. style="font-family: ...; font-size: ...")
    text = re.sub(r'\s*style="[^"]*"', '', text, flags=re.IGNORECASE)
    text = re.sub(r"\s*style='[^']*'", '', text, flags=re.IGNORECASE)

    # 4. Strip inline class attributes (e.g. class="MsoNormal ...")
    text = re.sub(r'\s*class="[^"]*"', '', text, flags=re.IGNORECASE)
    text = re.sub(r"\s*class='[^']*'", '', text, flags=re.IGNORECASE)

    # 5. Convert <br>, <br/>, <p>, <div> to newlines
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p\s*>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</div\s*>', '\n', text, flags=re.IGNORECASE)

    # 6. Remove remaining unwanted HTML tags (like <span>, <div>, <font>, <b>, <i>, <a> etc.) but keep text content
    text = re.sub(r'<[^>]+>', '', text)

    # 7. Clean up multiple empty lines or trailing spaces
    lines = [line.strip() for line in text.split('\n')]
    cleaned_text = '\n'.join([line for line in lines if line])

    return cleaned_text
