from rdmo.core.renderers import BaseXMLRenderer


class XMLRenderer(BaseXMLRenderer):

    def render_document(self, xml, optionsets):
        xml.startElement('rdmo', {
            'xmlns:dc': 'http://purl.org/dc/elements/1.1/'
        })
        for optionset in optionsets:
            self.render_optionset(xml, optionset)
        xml.endElement('rdmo')

    def render_optionset(self, xml, optionset):
        xml.startElement('optionset', {})
        self.render_text_element(xml, 'dc:uri', {}, optionset['uri'])
        self.render_text_element(xml, 'uri_prefix', {}, optionset['uri_prefix'])
        self.render_text_element(xml, 'key', {}, optionset['key'])
        self.render_text_element(xml, 'dc:comment', {}, optionset['comment'])
        self.render_text_element(xml, 'order', {}, optionset['order'])
        xml.startElement('conditions', {})
        for condition_uri in optionset['conditions']:
            self.render_text_element(xml, 'condition', {'dc:uri': condition_uri}, None)
        xml.endElement('conditions')
        xml.endElement('optionset')

        if 'options' in optionset and optionset['options']:
            for option in optionset['options']:
                self.render_option(xml, option)

    def render_option(self, xml, option):
        xml.startElement('option', {})
        self.render_text_element(xml, 'dc:uri', {}, option['uri'])
        self.render_text_element(xml, 'uri_prefix', {}, option['uri_prefix'])
        self.render_text_element(xml, 'key', {}, option['key'])
        self.render_text_element(xml, 'path', {}, option['path'])
        self.render_text_element(xml, 'dc:comment', {}, option['comment'])
        self.render_text_element(xml, 'optionset', {'dc:uri': option['optionset']}, None)
        self.render_text_element(xml, 'order', {}, option['order'])
        self.render_text_element(xml, 'text', {'lang': 'en'}, option['text_en'])
        self.render_text_element(xml, 'text', {'lang': 'de'}, option['text_de'])
        self.render_text_element(xml, 'additional_input', {}, option['additional_input'])
        xml.endElement('option')
