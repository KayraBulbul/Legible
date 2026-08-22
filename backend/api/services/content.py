import nh3

from api.schemas import SemanticDocument

ALLOWED_TAGS = {
    "a",
    "article",
    "aside",
    "blockquote",
    "br",
    "caption",
    "code",
    "dd",
    "div",
    "dl",
    "dt",
    "em",
    "figcaption",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "li",
    "main",
    "mark",
    "ol",
    "p",
    "pre",
    "section",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
}

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title"},
    "article": {"aria-label", "lang"},
    "aside": {"aria-label", "lang"},
    "img": {"alt", "height", "src", "title", "width"},
    "main": {"aria-label", "lang"},
    "section": {"aria-label", "lang"},
    "table": {"aria-label"},
    "td": {"colspan", "headers", "rowspan"},
    "th": {"colspan", "headers", "rowspan", "scope"},
}


def sanitize_document(document: SemanticDocument) -> SemanticDocument:
    clean_html = nh3.clean(
        document.html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer",
        strip_comments=True,
    )
    return document.model_copy(update={"html": clean_html})
